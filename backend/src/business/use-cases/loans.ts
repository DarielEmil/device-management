import { fullName } from "../entities/employee.js";
import { DomainError, INVALID_FIELDS_MESSAGE } from "../entities/errors.js";
import type {
  Loan,
  LoanDisplayStatus,
  LoanInput,
  LoanView,
} from "../entities/loan.js";
import type { Actor } from "../entities/user.js";
import type { Repositories } from "../ports/repositories.js";
import { byDueOn, toLoanView } from "../rules/loans.js";
import { authorize } from "../rules/permissions.js";
import { parseLoanInput } from "../rules/validation.js";
import { newId, type UseCaseDeps } from "./deps.js";

const INACTIVE_EMPLOYEE = "Selecciona un empleado activo.";
const UNAVAILABLE_EQUIPMENT = "El equipo seleccionado no está disponible.";

// Qué préstamos puede ver cada rol: Encargado todos (o los de un empleado si
// filtra); Empleado solo los suyos, y ninguno si su cuenta no tiene empleado
// vinculado. `null` significa "no hay nada que mostrar".
export function loanScope(
  actor: Actor,
  employeeId?: string,
): { employeeId?: string } | null {
  if (actor.role === "Encargado") return employeeId ? { employeeId } : {};
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
    // CU-03 Registrar préstamo (Encargado). Crear el préstamo y marcar el
    // equipo como Prestado ocurre en una sola transacción, con la fila del
    // equipo bloqueada para que dos préstamos simultáneos no pasen.
    // Alternos: datos inválidos o fecha anterior a hoy → VALIDATION;
    // empleado o equipo inexistente → NOT_FOUND; empleado inactivo o equipo
    // no disponible → CONFLICT.
    async createLoan(actor: Actor, input: LoanInput): Promise<LoanView> {
      authorize(actor, "loans:write");
      const data = parseLoanInput(input);
      const today = clock.today();
      if (data.dueOn < today)
        throw new DomainError(INVALID_FIELDS_MESSAGE, "VALIDATION", {
          dueOn: "La fecha prevista no puede ser anterior a hoy.",
        });

      const created = await uow.transaction(async (repositories) => {
        const equipment = await repositories.equipment.findByIdForUpdate(
          data.equipmentId,
        );
        if (!equipment)
          throw new DomainError("El equipo no existe.", "NOT_FOUND", {
            equipmentId: UNAVAILABLE_EQUIPMENT,
          });
        const employee = await repositories.employees.findById(data.employeeId);
        if (!employee)
          throw new DomainError("El empleado no existe.", "NOT_FOUND", {
            employeeId: INACTIVE_EMPLOYEE,
          });
        if (!employee.active)
          throw new DomainError("El empleado está inactivo.", "CONFLICT", {
            employeeId: INACTIVE_EMPLOYEE,
          });
        if (
          equipment.status !== "Disponible" ||
          (await repositories.loans.findActiveByEquipment(equipment.id))
        )
          throw new DomainError("El equipo no está disponible.", "CONFLICT", {
            equipmentId: UNAVAILABLE_EQUIPMENT,
          });

        const loan: Loan = {
          id: newId(clock),
          employeeId: employee.id,
          equipmentId: equipment.id,
          borrowedOn: today,
          dueOn: data.dueOn,
          returnedOn: null,
          status: "Activo",
          createdAt: clock.now(),
        };
        await repositories.loans.insert(loan);
        await repositories.equipment.updateStatus(equipment.id, "Prestado");
        return {
          ...loan,
          equipmentCode: equipment.code,
          equipmentName: equipment.name,
          employeeName: fullName(employee),
        };
      });
      return toLoanView(created, today);
    },

    // CU-04 Registrar devolución (Encargado). Cerrar el préstamo y liberar el
    // equipo ocurre en una sola transacción.
    // Alternos: préstamo inexistente → NOT_FOUND; ya devuelto → CONFLICT.
    async returnLoan(actor: Actor, loanId: string): Promise<LoanView> {
      authorize(actor, "loans:write");
      const today = clock.today();
      const returned = await uow.transaction(async (repositories) => {
        const loan = await repositories.loans.findByIdForUpdate(loanId);
        if (!loan)
          throw new DomainError("El préstamo no existe.", "NOT_FOUND");
        if (loan.status === "Devuelto")
          throw new DomainError("Este préstamo ya fue devuelto.", "CONFLICT");
        await repositories.loans.markReturned(loan.id, today);
        await repositories.equipment.updateStatus(loan.equipmentId, "Disponible");
        return { ...loan, returnedOn: today, status: "Devuelto" as const };
      });
      return toLoanView(returned, today);
    },

    // CU-06 Consultar préstamos (Encargado y Empleado). Encargado ve todos y
    // puede filtrar por empleado; Empleado solo los suyos. Se puede filtrar
    // por el estado que ve el usuario, incluidos "Por vencer" y "Atrasado".
    async listLoans(
      actor: Actor,
      filter: { status?: LoanDisplayStatus; employeeId?: string } = {},
    ): Promise<LoanView[]> {
      authorize(actor, "loans:read");
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
