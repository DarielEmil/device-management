import { z } from "zod";
import {
  departments,
  DomainError,
  equipmentTypes,
  roleSchema,
  type FieldErrors,
} from "../entities/models";

const required = (label: string) =>
  z.string().trim().min(1, `${label} es obligatorio.`);
export const equipmentInputSchema = z.object({
  code: required("El código").toUpperCase().max(40, "Máximo 40 caracteres."),
  name: required("El nombre").max(120, "Máximo 120 caracteres."),
  type: z.enum(equipmentTypes, { error: "Selecciona un tipo de equipo." }),
  brand: z.string().trim().max(80, "Máximo 80 caracteres."),
  model: z.string().trim().max(80, "Máximo 80 caracteres."),
});
export const employeeInputSchema = z.object({
  firstName: required("El nombre"),
  lastName: required("El apellido"),
  identity: z
    .string()
    .trim()
    .regex(/^\d{3}-\d{7}-\d$/, "Usa el formato 000-0000000-0."),
  department: z.enum(departments, { error: "Selecciona un departamento." }),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => !value || /^\d{3}-\d{3}-\d{4}$/.test(value),
      "Usa el formato 809-000-0000.",
    ),
});
export const loanInputSchema = z.object({
  employeeId: required("El empleado"),
  equipmentId: required("El equipo"),
  dueOn: z.iso.date({ error: "Selecciona una fecha válida." }),
});
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Introduce un correo válido." }));
export const loginInputSchema = z.object({
  email,
  password: z.string().min(1, "La contraseña es obligatoria."),
});
export const registerInputSchema = loginInputSchema.extend({
  name: required("El nombre"),
  password: z.string().min(8, "Usa al menos 8 caracteres."),
});
export const inviteInputSchema = z.object({
  email,
  role: roleSchema,
  employeeId: z.string(),
});

export type EquipmentInput = z.infer<typeof equipmentInputSchema>;
export type EmployeeInput = z.infer<typeof employeeInputSchema>;
export type LoanInput = z.infer<typeof loanInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type RegisterInput = z.infer<typeof registerInputSchema>;
export type InviteInput = z.infer<typeof inviteInputSchema>;

export function validate<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const fields: FieldErrors = {};
  for (const issue of result.error.issues)
    fields[String(issue.path[0] ?? "form")] ??= issue.message;
  throw new DomainError("Revisa los campos indicados.", fields);
}
