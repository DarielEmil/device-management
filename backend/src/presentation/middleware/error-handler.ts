import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { DomainError, type DomainErrorCode } from "../../business/entities/errors.js";

const statusByCode: Record<DomainErrorCode, number> = {
  VALIDATION: 422,
  CONFLICT: 409,
  NOT_FOUND: 404,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
};

// Formato uniforme de error: { error: { code, message, fields } }
export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof ZodError) {
    const fields = Object.fromEntries(
      error.issues.map((issue) => [issue.path.join("."), issue.message]),
    );
    res.status(422).json({
      error: { code: "VALIDATION", message: "Datos inválidos.", fields },
    });
    return;
  }
  if (error instanceof DomainError) {
    res.status(statusByCode[error.code]).json({
      error: { code: error.code, message: error.message, fields: error.fields },
    });
    return;
  }
  console.error(error);
  res.status(500).json({
    error: { code: "INTERNAL", message: "Error interno.", fields: {} },
  });
};
