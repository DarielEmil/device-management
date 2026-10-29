import { fullName } from "../entities/employee.entity.js";
import { EquipmentStatus } from "../entities/equipment.entity.js";
import {
  DomainError,
  DomainErrorCode,
  INVALID_FIELDS_MESSAGE,
} from "../entities/errors.entity.js";
import {
  LoanStatus,
  type LoanDisplayStatus,
  type LoanInput,
  type LoanView,
} from "../entities/loan.entity.js";
import { Role, type Actor } from "../entities/user.entity.js";
import type { Repositories } from "../ports/repositories.js";
import { byDueOn, toLoanView } from "../rules/loans.rules.js";
import { authorize, Permission } from "../rules/permissions.rules.js";
import { parseLoanInput } from "../rules/validation.rules.js";
import type { UseCaseDeps } from "./deps.use-case.js";

const INACTIVE_EMPLOYEE = "Selecciona un empleado activo.";
const UNAVAILABLE_EQUIPMENT = "El equipo seleccionado no está disponible.";

export function loanScope(
  actor: Actor,
  employeeId?: string,
): { employeeId?: string } | null {
  if (actor.role === Role.Manager) return employeeId ? { employeeId } : {};
  return actor.employeeId ? { employeeId: actor.employeeId } : null;
}

export async function listVisibleLoans(
  repositories: Repositories,
  actor: Actor,
  today: string,
  employeeId?: string,
): Promise<LoanView[]> {
  const scope = loanScope(actor, employeeId);
  if (!scope) return [];
  const loans = await repositories.loans.list(scope);
  return loans.map((loan) => toLoanView(loan, today));
}

export function createLoanUseCases({ uow, clock }: UseCaseDeps) {
  return {
    async createLoan(actor: Actor, input: LoanInput): Promise<LoanView> {
      authorize(actor, Permission.LoansWrite);
      const data = parseLoanInput(input);
      const today = clock.today();
      if (data.dueOn < today)
        throw new DomainError(INVALID_FIELDS_MESSAGE, DomainErrorCode.Validation, {
          dueOn: "La fecha prevista no puede ser anterior a hoy.",
        });

      const created = await uow.transaction(async (repositories) => {
        const equipment = await repositories.equipment.findByIdForUpdate(
          data.equipmentId,
        );
        if (!equipment)
          throw new DomainError("El equipo no existe.", DomainErrorCode.NotFound, {
            equipmentId: UNAVAILABLE_EQUIPMENT,
          });
        // Orden de bloqueo: equipo y luego empleado; una baja simultánea rechaza el préstamo.
        const employee = await repositories.employees.findByIdForUpdate(data.employeeId);
        if (!employee)
          throw new DomainError("El empleado no existe.", DomainErrorCode.NotFound, {
            employeeId: INACTIVE_EMPLOYEE,
          });
        if (!employee.active)
          throw new DomainError("El empleado está inactivo.", DomainErrorCode.Conflict, {
            employeeId: INACTIVE_EMPLOYEE,
          });
        if (
          equipment.status !== EquipmentStatus.Available ||
          (await repositories.loans.findActiveByEquipment(equipment.id))
        )
          throw new DomainError("El equipo no está disponible.", DomainErrorCode.Conflict, {
            equipmentId: UNAVAILABLE_EQUIPMENT,
          });

        const loan = await repositories.loans.insert({
          employeeId: employee.id,
          equipmentId: equipment.id,
          borrowedOn: today,
          dueOn: data.dueOn,
          returnedOn: null,
          status: LoanStatus.Active,
          registeredById: actor.userId,
          returnedById: null,
          createdAt: clock.now(),
        });
        await repositories.equipment.updateStatus(equipment.id, EquipmentStatus.Loaned);
        return {
          ...loan,
          equipmentCode: equipment.code,
          equipmentName: equipment.name,
          employeeName: fullName(employee),
        };
      });
      return toLoanView(created, today);
    },

    async returnLoan(actor: Actor, loanId: string): Promise<LoanView> {
      authorize(actor, Permission.LoansWrite);
      const today = clock.today();
      const returned = await uow.transaction(async (repositories) => {
        const loan = await repositories.loans.findByIdForUpdate(loanId);
        if (!loan)
          throw new DomainError("El préstamo no existe.", DomainErrorCode.NotFound);
        if (loan.status === LoanStatus.Returned)
          throw new DomainError("Este préstamo ya fue devuelto.", DomainErrorCode.Conflict);
        await repositories.loans.markReturned(loan.id, today, actor.userId);
        await repositories.equipment.updateStatus(loan.equipmentId, EquipmentStatus.Available);
        return {
          ...loan,
          returnedOn: today,
          returnedById: actor.userId,
          status: LoanStatus.Returned,
        };
      });
      return toLoanView(returned, today);
    },

    async listLoans(
      actor: Actor,
      filter: { status?: LoanDisplayStatus; employeeId?: string } = {},
    ): Promise<LoanView[]> {
      authorize(actor, Permission.LoansRead);
      const loans = await listVisibleLoans(
        uow.repositories,
        actor,
        clock.today(),
        filter.employeeId,
      );
      return loans
        .filter((loan) => !filter.status || loan.displayStatus === filter.status)
        .sort(byDueOn);
    },
  };
}

export type LoanUseCases = ReturnType<typeof createLoanUseCases>;
