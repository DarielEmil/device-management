import {
  Department,
  type EmployeeInput,
} from "../entities/employee.entity.js";
import {
  EquipmentType,
  type EquipmentInput,
} from "../entities/equipment.entity.js";
import {
  DomainError,
  DomainErrorCode,
  INVALID_FIELDS_MESSAGE,
  type FieldErrors,
} from "../entities/errors.entity.js";
import type { IsoDate, LoanInput } from "../entities/loan.entity.js";
import {
  Role,
  type CredentialsInput,
  type InvitationInput,
  type RegistrationInput,
} from "../entities/user.entity.js";
import { isIsoDate } from "./dates.rules.js";
import { normalizeEquipmentCode, normalizeEquipmentType } from "./equipment.rules.js";
import { collapseSpaces } from "./text.rules.js";

const PASSWORD_MIN = 8;
// Tope para que nadie pueda forzar hashes enormes con scrypt.
const PASSWORD_MAX = 128;
const EMAIL_MAX = 254;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IDENTITY = /^\d{3}-\d{7}-\d$/;
const PHONE = /^\d{3}-\d{3}-\d{4}$/;

class Fields {
  private readonly errors: FieldErrors = {};

  // Nunca se usa `placeholder`: `check()` lanza antes de construir el resultado.
  reject<T>(field: string, message: string, placeholder: T): T {
    this.errors[field] ??= message;
    return placeholder;
  }

  text(
    field: string,
    value: unknown,
    options: { label?: string; max?: number; optional?: boolean },
  ): string {
    const text = typeof value === "string" ? collapseSpaces(value) : "";
    if (!text && !options.optional)
      return this.reject(field, `${options.label ?? "El campo"} es obligatorio.`, "");
    if (options.max !== undefined && text.length > options.max)
      return this.reject(field, `Máximo ${options.max} caracteres.`, "");
    return text;
  }

  email(field: string, value: unknown): string {
    const email = typeof value === "string" ? value.trim().toLowerCase() : "";
    if (email.length > EMAIL_MAX || !EMAIL.test(email))
      return this.reject(field, "Introduce un correo válido.", "");
    return email;
  }

  check(): void {
    if (Object.keys(this.errors).length > 0)
      throw new DomainError(INVALID_FIELDS_MESSAGE, DomainErrorCode.Validation, {
        ...this.errors,
      });
  }
}

export interface ValidEquipment {
  code: string;
  name: string;
  type: EquipmentType;
  brand: string;
  model: string;
}

export function parseEquipmentInput(input: EquipmentInput): ValidEquipment {
  const fields = new Fields();
  const code = normalizeEquipmentCode(
    fields.text("code", input.code, { label: "El código", max: 40 }),
  );
  const name = fields.text("name", input.name, { label: "El nombre", max: 120 });
  const type =
    normalizeEquipmentType(typeof input.type === "string" ? input.type : "") ??
    fields.reject("type", "Selecciona un tipo de equipo.", EquipmentType.Laptop);
  const brand = fields.text("brand", input.brand, { max: 80, optional: true });
  const model = fields.text("model", input.model, { max: 80, optional: true });
  fields.check();
  return { code, name, type, brand, model };
}

export interface ValidEmployee {
  firstName: string;
  lastName: string;
  identity: string;
  department: Department;
  phone: string;
}

export function parseEmployeeInput(input: EmployeeInput): ValidEmployee {
  const fields = new Fields();
  const firstName = fields.text("firstName", input.firstName, { label: "El nombre", max: 80 });
  const lastName = fields.text("lastName", input.lastName, { label: "El apellido", max: 80 });
  const rawIdentity = typeof input.identity === "string" ? input.identity.trim() : "";
  const identity = IDENTITY.test(rawIdentity)
    ? rawIdentity
    : fields.reject("identity", "Usa el formato 000-0000000-0.", "");
  const rawDepartment = typeof input.department === "string" ? collapseSpaces(input.department) : "";
  const department =
    Object.values(Department).find((item) => item === rawDepartment) ??
    fields.reject("department", "Selecciona un departamento.", Department.Finance);
  const rawPhone = typeof input.phone === "string" ? input.phone.trim() : "";
  const phone =
    !rawPhone || PHONE.test(rawPhone)
      ? rawPhone
      : fields.reject("phone", "Usa el formato 809-000-0000.", "");
  fields.check();
  return { firstName, lastName, identity, department, phone };
}

export interface ValidLoan {
  employeeId: string;
  equipmentId: string;
  dueOn: IsoDate;
}

export function parseLoanInput(input: LoanInput): ValidLoan {
  const fields = new Fields();
  const employeeId = fields.text("employeeId", input.employeeId, { label: "El empleado" });
  const equipmentId = fields.text("equipmentId", input.equipmentId, { label: "El equipo" });
  const rawDueOn = typeof input.dueOn === "string" ? input.dueOn.trim() : "";
  const dueOn = isIsoDate(rawDueOn)
    ? rawDueOn
    : fields.reject("dueOn", "Selecciona una fecha válida.", "");
  fields.check();
  return { employeeId, equipmentId, dueOn };
}

export function parseEmail(value: string): string {
  const fields = new Fields();
  const email = fields.email("email", value);
  fields.check();
  return email;
}

const password = (fields: Fields, value: unknown, min: number): string => {
  const text = typeof value === "string" ? value : "";
  if (!text) return fields.reject("password", "La contraseña es obligatoria.", "");
  if (text.length < min)
    return fields.reject("password", `Usa al menos ${min} caracteres.`, "");
  if (text.length > PASSWORD_MAX)
    return fields.reject("password", `Usa como máximo ${PASSWORD_MAX} caracteres.`, "");
  return text;
};

export function parseCredentials(input: CredentialsInput): CredentialsInput {
  const fields = new Fields();
  const email = fields.email("email", input.email);
  // Sin mínimo en el login: el mensaje no debe revelar reglas de cuentas existentes.
  const pass = password(fields, input.password, 1);
  fields.check();
  return { email, password: pass };
}

export function parseRegistration(input: RegistrationInput): RegistrationInput {
  const fields = new Fields();
  const name = fields.text("name", input.name, { label: "El nombre", max: 120 });
  const email = fields.email("email", input.email);
  const pass = password(fields, input.password, PASSWORD_MIN);
  fields.check();
  return { name, email, password: pass };
}

export interface ValidInvitation {
  email: string;
  role: Role;
  employeeId: string | null;
}

export function parseInvitation(input: InvitationInput): ValidInvitation {
  const fields = new Fields();
  const email = fields.email("email", input.email);
  const role =
    Object.values(Role).find((item) => item === input.role) ??
    fields.reject("role", "Selecciona un rol.", Role.Manager);
  const employeeId =
    typeof input.employeeId === "string" && input.employeeId.trim()
      ? input.employeeId.trim()
      : null;
  fields.check();
  return { email, role, employeeId };
}
