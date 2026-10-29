import { fullName } from "../entities/employee.entity.js";
import { DomainError, DomainErrorCode } from "../entities/errors.entity.js";
import {
  toPublicUser,
  UserStatus,
  type Actor,
  type InvitationInput,
  type PublicUser,
} from "../entities/user.entity.js";
import { authorize, Permission } from "../rules/permissions.rules.js";
import { parseInvitation } from "../rules/validation.rules.js";
import type { UseCaseDeps } from "./deps.use-case.js";

const EMAIL_TAKEN = "Ya existe una cuenta con este correo.";
const INVALID_EMPLOYEE = "Selecciona un empleado activo sin cuenta vinculada.";

export function createAccountUseCases({ uow, clock, notifier }: UseCaseDeps) {
  return {
    async listAccounts(actor: Actor): Promise<PublicUser[]> {
      authorize(actor, Permission.AccountsRead);
      const users = await uow.repositories.users.list();
      return users.map(toPublicUser);
    },

    async inviteAccount(
      actor: Actor,
      input: InvitationInput,
    ): Promise<PublicUser> {
      authorize(actor, Permission.AccountsWrite);
      const data = parseInvitation(input);
      const invited = await uow.transaction(async (repositories) => {
        if (await repositories.users.findByEmail(data.email))
          throw new DomainError(EMAIL_TAKEN, DomainErrorCode.Conflict, { email: EMAIL_TAKEN });
        let name = data.email;
        if (data.employeeId) {
          // Bloqueo: una invitación simultánea para el mismo empleado espera y ya ve esta cuenta.
          const employee = await repositories.employees.findByIdForUpdate(data.employeeId);
          if (!employee)
            throw new DomainError("El empleado no existe.", DomainErrorCode.NotFound, {
              employeeId: INVALID_EMPLOYEE,
            });
          if (
            !employee.active ||
            (await repositories.users.findByEmployeeId(employee.id))
          )
            throw new DomainError("El empleado no se puede vincular.", DomainErrorCode.Conflict, {
              employeeId: INVALID_EMPLOYEE,
            });
          name = fullName(employee);
        }
        const user = await repositories.users.insert({
          name,
          email: data.email,
          role: data.role,
          status: UserStatus.Invited,
          employeeId: data.employeeId,
          passwordHash: null,
          createdAt: clock.now(),
        });
        return toPublicUser(user);
      });
      await notifier.invitationCreated(invited);
      return invited;
    },

    // Los préstamos activos se conservan; se devuelven después (CU-04).
    async deactivateAccount(actor: Actor, userId: string): Promise<PublicUser> {
      authorize(actor, Permission.AccountsWrite);
      if (userId === actor.userId)
        throw new DomainError("No puedes desactivar tu propia cuenta.", DomainErrorCode.Conflict);
      return uow.transaction(async (repositories) => {
        const user = await repositories.users.findById(userId);
        if (!user) throw new DomainError("La cuenta no existe.", DomainErrorCode.NotFound);
        if (user.status === UserStatus.Inactive)
          throw new DomainError("La cuenta ya está inactiva.", DomainErrorCode.Conflict);
        if (user.employeeId)
          await repositories.employees.setActive(user.employeeId, false);
        await repositories.users.updateStatus(user.id, UserStatus.Inactive);
        await repositories.sessions.deleteByUserId(user.id);
        return toPublicUser({ ...user, status: UserStatus.Inactive });
      });
    },
  };
}

export type AccountUseCases = ReturnType<typeof createAccountUseCases>;
