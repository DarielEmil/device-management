import { Router, type RequestHandler } from "express";
import type { AccountUseCases } from "../../business/use-cases/accounts.use-case.js";
import { createAccountsController } from "../controllers/accounts.controller.js";

// Cuentas e invitaciones comparten controlador; el frontend las expone en rutas distintas.
export function createAccountsRouter(accounts: AccountUseCases, session: RequestHandler): Router {
  const controller = createAccountsController(accounts);
  const router = Router();
  router.use(session);
  router.get("/", controller.list);
  router.post("/:id/link-employee", controller.linkEmployee);
  router.post("/:id/deactivate", controller.deactivate);
  return router;
}

export function createInvitationsRouter(accounts: AccountUseCases, session: RequestHandler): Router {
  const controller = createAccountsController(accounts);
  const router = Router();
  router.use(session);
  router.post("/", controller.invite);
  return router;
}
