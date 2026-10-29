import type { Request, RequestHandler } from "express";
import { sendError } from "./error.middleware.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function requestOrigin(req: Request): string | undefined {
  const origin = req.get("origin");
  if (origin) return origin;
  const referer = req.get("referer");
  if (!referer) return undefined;
  try {
    return new URL(referer).origin;
  } catch {
    return undefined;
  }
}

const hasBody = (req: Request) =>
  req.get("transfer-encoding") !== undefined || Number(req.get("content-length") ?? 0) > 0;

// CSRF sin token: el frontend no envía uno. Junto con SameSite=Lax basta con exigir
// que las escrituras vengan de un origen permitido y, si traen cuerpo, en JSON
// (un formulario de otro sitio no puede enviar application/json sin preflight de CORS).
export function originGuard(allowedOrigins: readonly string[]): RequestHandler {
  const allowed = new Set(allowedOrigins);
  return (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();
    const origin = requestOrigin(req);
    if (!origin || !allowed.has(origin))
      return sendError(res, 403, "Origen de la solicitud no permitido.");
    if (hasBody(req) && !req.is("application/json"))
      return sendError(res, 415, "El cuerpo de la solicitud debe ser JSON (Content-Type: application/json).");
    next();
  };
}
