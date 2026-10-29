import type { Request, Response } from "express";
import type { AuthResult, AuthUseCases } from "../../business/use-cases/auth.use-case.js";
import { credentialsDto, parseBody, recoveryDto, registrationDto } from "../dto/input.dto.js";
import { toSessionDto } from "../dto/output.dto.js";
import {
  currentSession,
  readSessionToken,
  type SessionCookies,
} from "../middleware/session.middleware.js";

export function createAuthController(auth: AuthUseCases, cookies: SessionCookies) {
  const open = (res: Response, status: number, result: AuthResult) => {
    cookies.set(res, result.token, result.session.expiresAt);
    res.status(status).json({ data: toSessionDto(result.user) });
  };

  return {
    // `currentToken`: negocio invalida la sesión previa del navegador (regeneración del id).
    async register(req: Request, res: Response) {
      const body = parseBody(registrationDto, req.body);
      const result = await auth.register(
        { name: body.name ?? "", email: body.email ?? "", password: body.password ?? "" },
        { currentToken: readSessionToken(req) },
      );
      open(res, 201, result);
    },

    async login(req: Request, res: Response) {
      const body = parseBody(credentialsDto, req.body);
      const result = await auth.login(
        { email: body.email ?? "", password: body.password ?? "" },
        { currentToken: readSessionToken(req) },
      );
      open(res, 200, result);
    },

    async logout(req: Request, res: Response) {
      await auth.logout(readSessionToken(req));
      cookies.clear(res);
      res.status(204).end();
    },

    session(_req: Request, res: Response) {
      res.json({ data: toSessionDto(currentSession(res).user) });
    },

    // Siempre 204: la respuesta no revela si el correo tiene cuenta.
    async recover(req: Request, res: Response) {
      const body = parseBody(recoveryDto, req.body);
      await auth.requestPasswordRecovery(body.email ?? "");
      res.status(204).end();
    },
  };
}
