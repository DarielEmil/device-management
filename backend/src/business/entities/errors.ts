export type DomainErrorCode =
  | "VALIDATION"
  | "CONFLICT"
  | "NOT_FOUND"
  | "UNAUTHENTICATED"
  | "FORBIDDEN";

export type FieldErrors = Record<string, string>;

// Error esperado del dominio. Presentación lo traduce a HTTP
// (VALIDATION→422, CONFLICT→409, NOT_FOUND→404, UNAUTHENTICATED→401,
// FORBIDDEN→403). `message` y `fields` van en español porque los ve el usuario;
// las claves de `fields` coinciden con los campos del contrato del frontend.
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: DomainErrorCode = "VALIDATION",
    public readonly fields: FieldErrors = {},
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export const INVALID_FIELDS_MESSAGE = "Revisa los campos indicados.";
