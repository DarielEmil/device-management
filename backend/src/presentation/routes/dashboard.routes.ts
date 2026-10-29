import { Router, type RequestHandler } from "express";
import type { DashboardUseCases } from "../../business/use-cases/dashboard.use-case.js";
import { createDashboardController } from "../controllers/dashboard.controller.js";

export function createDashboardRouter(dashboard: DashboardUseCases, session: RequestHandler): Router {
  const controller = createDashboardController(dashboard);
  const router = Router();
  router.use(session);
  router.get("/", controller.show);
  return router;
}
