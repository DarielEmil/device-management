import { Router, type RequestHandler } from "express";
import type { AuthUseCases } from "../../business/use-cases/auth.use-case.js";
import { createAuthController } from "../controllers/auth.controller.js";
import type { SessionCookies } from "../middleware/session.middleware.js";

export function createAuthRouter(
  auth: AuthUseCases,
  cookies: SessionCookies,
  session: RequestHandler,
): Router {
  const controller = createAuthController(auth, cookies);
  const router = Router();
  router.post("/register", controller.register);
  router.post("/login", controller.login);
  router.post("/logout", controller.logout);
  router.get("/session", session, controller.session);
  router.post("/recover", controller.recover);
  return router;
}
