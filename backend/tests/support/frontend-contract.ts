import { z } from "zod";

// Copia de frontend/src/business/entities/models.ts y frontend/src/api/dto/contracts.ts
// (los paquetes no comparten dependencias). Si el contrato cambia allí, cambia aquí.
const equipmentSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  type: z.enum(["Laptop", "Monitor", "Periférico", "Tablet"]),
  brand: z.string(),
  model: z.string(),
  status: z.enum(["available", "loaned"]),
});
const employeeSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  identity: z.string(),
  department: z.enum(["Finanzas", "Ventas", "Operaciones", "Tecnología", "Recursos Humanos"]),
  phone: z.string(),
  active: z.boolean(),
});
const accountSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(["manager", "employee"]),
  status: z.enum(["active", "inactive", "invited"]),
  employeeId: z.string().nullable(),
});
const loanSchema = z.object({
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
const sessionSchema = z.object({ account: accountSchema });

export const contract = {
  equipmentList: z.object({ data: z.array(equipmentSchema) }),
  employeeList: z.object({ data: z.array(employeeSchema) }),
  loanList: z.object({ data: z.array(loanSchema) }),
  accountList: z.object({ data: z.array(accountSchema) }),
  session: z.object({ data: sessionSchema.nullable() }),
  equipment: z.object({ data: equipmentSchema }),
  employee: z.object({ data: employeeSchema }),
  loan: z.object({ data: loanSchema }),
  account: z.object({ data: accountSchema }),
};

// Lanza con el detalle de zod si el cuerpo no cumple el contrato.
export function expectContract<T extends z.ZodType>(schema: T, body: unknown): z.output<T> {
  return schema.parse(body);
}
