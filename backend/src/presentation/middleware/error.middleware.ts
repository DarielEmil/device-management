import type { ErrorRequestHandler, RequestHandler, Response } from "express";
import {
  DomainError,
  DomainErrorCode,
  INVALID_FIELDS_MESSAGE,
  type FieldErrors,
} from "../../business/entities/errors.entity.js";

export interface Logger {
  error(...data: unknown[]): void;
}

const STATUS: Record<DomainErrorCode, number> = {
  [DomainErrorCode.Validation]: 422,
  [DomainErrorCode.Conflict]: 409,
  [DomainErrorCode.NotFound]: 404,
  [DomainErrorCode.Unauthenticated]: 401,
  [DomainErrorCode.Forbidden]: 403,
};

const UNEXPECTED = "Ocurrió un error inesperado. Inténtalo de nuevo.";

// Mismo formato que lee el frontend (http-client.ts): { message, fields }.
export function sendError(
  res: Response,
  status: number,
  message: string,
  fields: FieldErrors = {},
): void {
  res.status(status).json({ message, fields });
}

export const notFound: RequestHandler = (_req, res) => {
  sendError(res, 404, "El recurso solicitado no existe.");
};

// Errores de express.json (body-parser): traen `type` y un `status` 4xx.
interface BodyParserError {
  type: string;
  status: number;
}
const isBodyParserError = (error: unknown): error is BodyParserError =>
  typeof error === "object" &&
  error !== null &&
  typeof (error as Partial<BodyParserError>).type === "string" &&
  typeof (error as Partial<BodyParserError>).status === "number";

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (error: unknown, _req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof DomainError)
      return sendError(res, STATUS[error.code], error.message, error.fields);
    if (isBodyParserError(error) && error.status >= 400 && error.status < 500) {
      if (error.type === "entity.parse.failed")
        return sendError(res, 422, INVALID_FIELDS_MESSAGE);
      if (error.type === "entity.too.large")
        return sendError(res, 413, "La solicitud es demasiado grande.");
      return sendError(res, error.status, "La solicitud no es válida.");
    }
    // El detalle queda solo en el log; el cliente recibe un mensaje genérico.
    logger.error("[error] Petición fallida:", error);
    sendError(res, 500, UNEXPECTED);
  };
}
