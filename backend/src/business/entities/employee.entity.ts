export const Department = {
  Finance: "Finanzas",
  Sales: "Ventas",
  Operations: "Operaciones",
  Technology: "Tecnología",
  HumanResources: "Recursos Humanos",
} as const;
export type Department = (typeof Department)[keyof typeof Department];

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  identity: string;
  department: Department;
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
