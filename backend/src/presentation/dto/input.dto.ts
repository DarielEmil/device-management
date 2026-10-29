import { z } from "zod";
import { EquipmentStatus } from "../../business/entities/equipment.entity.js";
import {
  DomainError,
  DomainErrorCode,
  INVALID_FIELDS_MESSAGE,
  type FieldErrors,
} from "../../business/entities/errors.entity.js";
import { LoanDisplayStatus } from "../../business/entities/loan.entity.js";

// Los DTOs solo validan la forma. Un campo ausente llega como "" a negocio,
// que devuelve el mensaje en español de ese campo.
const text = z.string().optional();

export const credentialsDto = z.object({ email: text, password: text });
export const registrationDto = credentialsDto.extend({ name: text });
export const recoveryDto = z.object({ email: text });

export const equipmentInputDto = z.object({
  code: text,
  name: text,
  type: text,
  brand: text,
  model: text,
});

export const employeeInputDto = z.object({
  firstName: text,
  lastName: text,
  identity: text,
  department: text,
  phone: text,
});

export const loanInputDto = z.object({ employeeId: text, equipmentId: text, dueOn: text });

export const invitationInputDto = z.object({
  email: text,
  role: text,
  employeeId: z.string().nullable().optional(),
});

export const linkEmployeeInputDto = z.object({ employeeId: text });

export const equipmentQueryDto = z.object({ status: z.enum(EquipmentStatus).optional() });

export const loanQueryDto = z.object({
  status: z.enum(LoanDisplayStatus).optional(),
  employeeId: text,
});

const INVALID_VALUE = "Valor no válido.";

function parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const fields: FieldErrors = {};
  for (const issue of result.error.issues) fields[String(issue.path[0] ?? "body")] ??= INVALID_VALUE;
  throw new DomainError(INVALID_FIELDS_MESSAGE, DomainErrorCode.Validation, fields);
}

// Sin cuerpo equivale a {}; un cuerpo que no es un objeto JSON se rechaza.
export function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.output<T> {
  const value: unknown = body ?? {};
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new DomainError(INVALID_FIELDS_MESSAGE, DomainErrorCode.Validation);
  return parse(schema, value);
}

export const parseQuery = <T extends z.ZodType>(schema: T, query: unknown): z.output<T> =>
  parse(schema, query);

// Express 5 tipa los parámetros como string | string[] (por los comodines).
export function routeParam(params: Record<string, string | string[] | undefined>, name: string): string {
  const value = params[name];
  return typeof value === "string" ? value : "";
}
