export const departments = [
  "Finanzas",
  "Ventas",
  "Operaciones",
  "Tecnología",
  "Recursos Humanos",
] as const;
export type Department = (typeof departments)[number];

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  // Cédula con formato 000-0000000-0 (columna `national_id`), única.
  identity: string;
  department: Department;
  // Opcional: cadena vacía cuando no se indica, como espera el frontend.
  phone: string;
  active: boolean;
  createdAt: Date;
}

export interface EmployeeInput {
  firstName: string;
  lastName: string;
  identity: string;
  department: string;
  phone?: string;
}

export const fullName = (
  employee: Pick<Employee, "firstName" | "lastName">,
): string => `${employee.firstName} ${employee.lastName}`;
