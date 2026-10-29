import type { CookieOptions, Request, RequestHandler, Response } from "express";
import { DomainError, DomainErrorCode } from "../../business/entities/errors.entity.js";
import type { Actor } from "../../business/entities/user.entity.js";
import type { AuthUseCases, CurrentSession } from "../../business/use-cases/auth.use-case.js";

export const SESSION_COOKIE = "dm_session";

export interface SessionCookies {
  set(res: Response, token: string, expiresAt: Date): void;
  clear(res: Response): void;
}

export function createSessionCookies({ secure }: { secure: boolean }): SessionCookies {
  const base: CookieOptions = { httpOnly: true, sameSite: "lax", path: "/api", secure };
  return {
    // Expires sigue a session.expiresAt: el navegador la descarta cuando negocio la daría por vencida.
    set: (res, token, expiresAt) =>
      res.cookie(SESSION_COOKIE, token, { ...base, expires: expiresAt }),
    clear: (res) => res.clearCookie(SESSION_COOKIE, base),
  };
}

export function readSessionToken(req: Request): string | undefined {
  const cookies: Record<string, unknown> = req.cookies ?? {};
  const value = cookies[SESSION_COOKIE];
  return typeof value === "string" && value ? value : undefined;
}

// Solo exige una sesión válida y adjunta el Actor; los permisos por rol los decide negocio.
export function requireSession(auth: AuthUseCases, cookies: SessionCookies): RequestHandler {
  return async (req, res, next) => {
    const token = readSessionToken(req);
    try {
      const current = await auth.getCurrentSession(token);
      // Negocio pudo deslizar expiresAt: se reenvía la cookie con la nueva fecha.
      if (token) cookies.set(res, token, current.session.expiresAt);
      res.locals.session = current;
    } catch (error) {
      if (token && error instanceof DomainError && error.code === DomainErrorCode.Unauthenticated)
        cookies.clear(res);
      throw error;
    }
    next();
  };
}

export function currentSession(res: Response): CurrentSession {
  const session = res.locals.session as CurrentSession | undefined;
  if (!session) throw new Error("La ruta no está protegida con requireSession.");
  return session;
}

export const actorOf = (res: Response): Actor => currentSession(res).actor;
