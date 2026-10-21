export type DomainErrorCode =
  | "VALIDATION"
  | "CONFLICT"
  | "NOT_FOUND"
  | "UNAUTHENTICATED"
  | "FORBIDDEN";

export type FieldErrors = Record<string, string>;

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
