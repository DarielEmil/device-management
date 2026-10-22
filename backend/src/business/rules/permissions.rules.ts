import { DomainError, DomainErrorCode } from "../entities/errors.entity.js";
import { Role, type Actor } from "../entities/user.entity.js";

export const Permission = {
  EquipmentRead: "equipment:read",
  EquipmentWrite: "equipment:write",
  EmployeesRead: "employees:read",
  EmployeesWrite: "employees:write",
  LoansRead: "loans:read",
  LoansWrite: "loans:write",
  AccountsRead: "accounts:read",
  AccountsWrite: "accounts:write",
  DashboardRead: "dashboard:read",
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];

const grants: Record<Role, readonly Permission[]> = {
  [Role.Manager]: Object.values(Permission),
  [Role.Employee]: [Permission.EquipmentRead, Permission.LoansRead, Permission.DashboardRead],
};

export const can = (actor: Actor, permission: Permission): boolean =>
  grants[actor.role].includes(permission);

export function authorize(actor: Actor, permission: Permission): void {
  if (!can(actor, permission))
    throw new DomainError(
      "No tienes permiso para realizar esta acción.",
      DomainErrorCode.Forbidden,
    );
}
