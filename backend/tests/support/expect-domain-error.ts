import { expect } from "vitest";
import {
  DomainError,
  type DomainErrorCode,
  type FieldErrors,
} from "../../src/business/entities/errors.js";

// Verifica que la promesa falle con un DomainError del código indicado y, si
// se pasan, con ese mensaje y esos errores de campo (los demás campos no se
// comparan).
export async function expectDomainError(
  promise: Promise<unknown>,
  expected: { code: DomainErrorCode; message?: string; fields?: FieldErrors },
): Promise<void> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  if (!(error instanceof DomainError))
    throw new Error(
      `Se esperaba DomainError ${expected.code}; se obtuvo: ${String(error)}`,
    );
  expect({
    code: error.code,
    message: error.message,
    fields: error.fields,
  }).toMatchObject(expected);
}
