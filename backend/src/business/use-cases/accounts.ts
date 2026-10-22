import { fullName } from "../entities/employee.js";
import { DomainError } from "../entities/errors.js";
import {
  toPublicUser,
  type Actor,
  type InvitationInput,
  type PublicUser,
  type User,
} from "../entities/user.js";
import { authorize } from "../rules/permissions.js";
import { parseInvitation } from "../rules/validation.js";
import { newId, type UseCaseDeps } from "./deps.js";

const EMAIL_TAKEN = "Ya existe una cuenta con este correo.";
const INVALID_EMPLOYEE = "Selecciona un empleado activo sin cuenta vinculada.";

export function createAccountUseCases({ uow, clock, notifier }: UseCaseDeps) {
  return {
    async listAccounts(actor: Actor): Promise<PublicUser[]> {
      authorize(actor, "accounts:read");
      const users = await uow.repositories.users.list();
      return users.map(toPublicUser);
    },

    // Crea la cuenta en estado Invitado, sin contraseña. Si se indica un
    // empleado, debe estar activo y no tener otra cuenta; la cuenta toma su
    // nombre. Activar la invitación queda fuera de este alcance.
    async inviteAccount(
      actor: Actor,
      input: InvitationInput,
    ): Promise<PublicUser> {
      authorize(actor, "accounts:write");
      const data = parseInvitation(input);
      const invited = await uow.transaction(async (repositories) => {
        if (await repositories.users.findByEmail(data.email))
          throw new DomainError(EMAIL_TAKEN, "CONFLICT", { email: EMAIL_TAKEN });
        let name = data.email;
        if (data.employeeId) {
          // Con el bloqueo, una segunda invitación para el mismo empleado espera
          // a que esta termine y ya ve su cuenta. La restricción única de
          // `employeeId` en la DB es la garantía final.
          const employee = await repositories.employees.findByIdForUpdate(data.employeeId);
          if (!employee)
            throw new DomainError("El empleado no existe.", "NOT_FOUND", {
              employeeId: INVALID_EMPLOYEE,
            });
          if (
            !employee.active ||
            (await repositories.users.findByEmployeeId(employee.id))
          )
            throw new DomainError("El empleado no se puede vincular.", "CONFLICT", {
              employeeId: INVALID_EMPLOYEE,
            });
          name = fullName(employee);
        }
        const user: User = {
          id: newId(clock),
          name,
          email: data.email,
          role: data.role,
          status: "Invitado",
          employeeId: data.employeeId,
          passwordHash: null,
          createdAt: clock.now(),
        };
        await repositories.users.insert(user);
        return toPublicUser(user);
      });
      await notifier.invitationCreated(invited);
      return invited;
    },

    // Baja lógica: la cuenta pasa a Inactivo, su empleado vinculado también
    // queda inactivo y se cierran todas sus sesiones. No se permite si ese
    // empleado tiene préstamos activos, ni desactivar la propia cuenta.
    async deactivateAccount(actor: Actor, userId: string): Promise<PublicUser> {
      authorize(actor, "accounts:write");
      if (userId === actor.userId)
        throw new DomainError("No puedes desactivar tu propia cuenta.", "CONFLICT");
      return uow.transaction(async (repositories) => {
        const user = await repositories.users.findById(userId);
        if (!user) throw new DomainError("La cuenta no existe.", "NOT_FOUND");
        if (user.status === "Inactivo")
          throw new DomainError("La cuenta ya está inactiva.", "CONFLICT");
        if (user.employeeId) {
          // Bloquea al empleado antes de contar: un préstamo simultáneo para él
          // espera a que termine la baja y entonces lo ve inactivo.
          await repositories.employees.findByIdForUpdate(user.employeeId);
          const activeLoans = await repositories.loans.countActiveByEmployee(
            user.employeeId,
          );
          if (activeLoans > 0)
            throw new DomainError(
              "No se puede desactivar: el empleado tiene préstamos activos. Registra la devolución primero.",
              "CONFLICT",
            );
          await repositories.employees.setActive(user.employeeId, false);
        }
        await repositories.users.updateStatus(user.id, "Inactivo");
        await repositories.sessions.deleteByUserId(user.id);
        return toPublicUser({ ...user, status: "Inactivo" });
      });
    },
  };
}

export type AccountUseCases = ReturnType<typeof createAccountUseCases>;
