import { z } from "zod";

export const equipmentTypes = [
  "Laptop",
  "Monitor",
  "Periférico",
  "Tablet",
] as const;
export const departments = [
  "Finanzas",
  "Ventas",
  "Operaciones",
  "Tecnología",
  "Recursos Humanos",
] as const;
export const Role = { Manager: "manager", Employee: "employee" } as const;
export const AccountStatus = {
  Active: "active",
  Inactive: "inactive",
  Invited: "invited",
} as const;
export const EquipmentStatus = { Available: "available", Loaned: "loaned" } as const;
export const LoanStatus = {
  Active: "active",
  DueSoon: "due_soon",
  Overdue: "overdue",
  Returned: "returned",
} as const;
export const roleSchema = z.enum(Role);
export const accountStatusSchema = z.enum(AccountStatus);

export const equipmentSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  type: z.enum(equipmentTypes),
  brand: z.string(),
  model: z.string(),
  status: z.enum(EquipmentStatus),
});
export const employeeSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  identity: z.string(),
  department: z.enum(departments),
  phone: z.string(),
  active: z.boolean(),
});
export const accountSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: roleSchema,
  status: accountStatusSchema,
  employeeId: z.string().nullable(),
});
export const loanSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  equipmentId: z.string(),
  borrowedOn: z.iso.date(),
  dueOn: z.iso.date(),
  returnedOn: z.iso.date().nullable(),
  equipmentCode: z.string(),
  equipmentName: z.string(),
  employeeName: z.string(),
});
export const sessionSchema = z.object({ account: accountSchema });

export type Equipment = z.infer<typeof equipmentSchema>;
export type Employee = z.infer<typeof employeeSchema>;
export type Account = z.infer<typeof accountSchema>;
export type Loan = z.infer<typeof loanSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Role = z.infer<typeof roleSchema>;
export type AccountStatus = z.infer<typeof accountStatusSchema>;
export type EquipmentStatus = z.infer<typeof equipmentSchema>["status"];
export type LoanStatus = (typeof LoanStatus)[keyof typeof LoanStatus];
export interface Snapshot {
  equipment: Equipment[];
  employees: Employee[];
  accounts: Account[];
  loans: Loan[];
}
export type FieldErrors = Record<string, string>;

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly fields: FieldErrors = {},
    public readonly code = "VALIDATION",
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export const fullName = (employee: Employee) =>
  `${employee.firstName} ${employee.lastName}`;
