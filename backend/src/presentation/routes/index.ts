import { Router } from "express";
import type { UseCases } from "../../business/use-cases/index.js";
import { requireSession, type SessionCookies } from "../middleware/session.middleware.js";
import { createAccountsRouter, createInvitationsRouter } from "./accounts.routes.js";
import { createAuthRouter } from "./auth.routes.js";
import { createDashboardRouter } from "./dashboard.routes.js";
import { createEmployeesRouter } from "./employees.routes.js";
import { createEquipmentRouter } from "./equipment.routes.js";
import { createLoansRouter } from "./loans.routes.js";

export interface RouterOptions {
  useCases: UseCases;
  cookies: SessionCookies;
}

// Rutas del contrato del frontend (frontend/src/api/repositories/http-gateways.ts).
export function createRouter({ useCases, cookies }: RouterOptions): Router {
  const router = Router();
  const session = requireSession(useCases.auth, cookies);

  router.get("/health", (_req, res) => {
    res.json({ data: { status: "ok" } });
  });

  router.use("/auth", createAuthRouter(useCases.auth, cookies, session));
  router.use("/equipment", createEquipmentRouter(useCases.equipment, session));
  router.use("/employees", createEmployeesRouter(useCases.employees, session));
  router.use("/loans", createLoansRouter(useCases.loans, session));
  router.use("/accounts", createAccountsRouter(useCases.accounts, session));
  router.use("/invitations", createInvitationsRouter(useCases.accounts, session));
  router.use("/dashboard", createDashboardRouter(useCases.dashboard, session));
  return router;
}
