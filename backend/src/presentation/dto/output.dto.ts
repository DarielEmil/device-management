import type { Employee } from "../../business/entities/employee.entity.js";
import type { Equipment } from "../../business/entities/equipment.entity.js";
import type { LoanDisplayStatus, LoanView } from "../../business/entities/loan.entity.js";
import { Role, type PublicUser } from "../../business/entities/user.entity.js";
import type { Dashboard } from "../../business/use-cases/dashboard.use-case.js";

// Mappers explícitos al contrato del frontend (frontend/src/business/entities/models.ts):
// solo salen los campos listados, nunca passwordHash ni datos internos.

export type EquipmentDto = Pick<Equipment, "id" | "code" | "name" | "type" | "brand" | "model" | "status">;
export const toEquipmentDto = (equipment: Equipment): EquipmentDto => ({
  id: equipment.id,
  code: equipment.code,
  name: equipment.name,
  type: equipment.type,
  brand: equipment.brand,
  model: equipment.model,
  status: equipment.status,
});

export type EmployeeDto = Pick<
  Employee,
  "id" | "firstName" | "lastName" | "identity" | "department" | "phone" | "active"
>;
export const toEmployeeDto = (employee: Employee): EmployeeDto => ({
  id: employee.id,
  firstName: employee.firstName,
  lastName: employee.lastName,
  identity: employee.identity,
  department: employee.department,
  phone: employee.phone,
  active: employee.active,
});

export type AccountDto = Pick<PublicUser, "id" | "name" | "email" | "role" | "status" | "employeeId">;
export const toAccountDto = (user: PublicUser): AccountDto => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  employeeId: user.employeeId,
});

export interface SessionDto {
  account: AccountDto;
}
export const toSessionDto = (user: PublicUser): SessionDto => ({ account: toAccountDto(user) });

// `status` es el estado mostrado (incluye due_soon y overdue), no el guardado.
export interface LoanDto
  extends Pick<
    LoanView,
    | "id"
    | "employeeId"
    | "equipmentId"
    | "borrowedOn"
    | "dueOn"
    | "returnedOn"
    | "equipmentCode"
    | "equipmentName"
    | "employeeName"
  > {
  status: LoanDisplayStatus;
}
export const toLoanDto = (loan: LoanView): LoanDto => ({
  id: loan.id,
  employeeId: loan.employeeId,
  equipmentId: loan.equipmentId,
  borrowedOn: loan.borrowedOn,
  dueOn: loan.dueOn,
  returnedOn: loan.returnedOn,
  status: loan.displayStatus,
  equipmentCode: loan.equipmentCode,
  equipmentName: loan.equipmentName,
  employeeName: loan.employeeName,
});

export function toDashboardDto(dashboard: Dashboard) {
  const summary = {
    role: dashboard.role,
    activeLoans: dashboard.activeLoans,
    dueSoon: dashboard.dueSoon,
    overdue: dashboard.overdue,
    pending: dashboard.pending.map(toLoanDto),
    recent: dashboard.recent.map(toLoanDto),
  };
  if (dashboard.role !== Role.Manager) return summary;
  return {
    ...summary,
    equipment: {
      total: dashboard.equipment.total,
      available: dashboard.equipment.available,
      loaned: dashboard.equipment.loaned,
    },
    distribution: dashboard.distribution.map(({ type, count }) => ({ type, count })),
  };
}
