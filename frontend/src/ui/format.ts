import type {
  AccountStatus,
  EquipmentStatus,
  LoanStatus,
  Role,
} from "@/business/entities/models";

export type StatusValue = AccountStatus | EquipmentStatus | LoanStatus;
export const roleLabels: Record<Role, string> = {
  manager: "Encargado",
  employee: "Empleado",
};
export const statusLabels: Record<StatusValue, string> = {
  available: "Disponible",
  loaned: "Prestado",
  active: "Activo",
  due_soon: "Por vencer",
  overdue: "Atrasado",
  returned: "Devuelto",
  inactive: "Inactivo",
  invited: "Invitado",
};

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
export function initials(value: string): string {
  return value
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
}
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
