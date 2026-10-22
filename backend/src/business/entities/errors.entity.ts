export const DomainErrorCode = {
  Validation: "VALIDATION",
  Conflict: "CONFLICT",
  NotFound: "NOT_FOUND",
  Unauthenticated: "UNAUTHENTICATED",
  Forbidden: "FORBIDDEN",
} as const;
export type DomainErrorCode =
  (typeof DomainErrorCode)[keyof typeof DomainErrorCode];

export type FieldErrors = Record<string, string>;

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: DomainErrorCode = DomainErrorCode.Validation,
    public readonly fields: FieldErrors = {},
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export const INVALID_FIELDS_MESSAGE = "Revisa los campos indicados.";
