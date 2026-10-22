import { DomainError } from "../entities/errors.js";
import type { Actor, Role } from "../entities/user.js";

export const permissions = [
  "equipment:read",
  "equipment:write",
  "employees:read",
  "employees:write",
  "loans:read",
  "loans:write",
  "accounts:read",
  "accounts:write",
  "dashboard:read",
] as const;
export type Permission = (typeof permissions)[number];

// RBAC. Encargado gestiona todo. Empleado consulta el catálogo, sus préstamos
// y su dashboard; el alcance (solo equipos disponibles, solo préstamos
// propios) lo aplica cada caso de uso.
const grants: Record<Role, readonly Permission[]> = {
  Encargado: permissions,
  Empleado: ["equipment:read", "loans:read", "dashboard:read"],
};

export const can = (actor: Actor, permission: Permission): boolean =>
  grants[actor.role].includes(permission);

export function authorize(actor: Actor, permission: Permission): void {
  if (!can(actor, permission))
    throw new DomainError(
      "No tienes permiso para realizar esta acción.",
      "FORBIDDEN",
    );
}
