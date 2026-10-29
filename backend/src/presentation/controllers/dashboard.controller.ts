import type { Request, Response } from "express";
import type { DashboardUseCases } from "../../business/use-cases/dashboard.use-case.js";
import { toDashboardDto } from "../dto/output.dto.js";
import { actorOf } from "../middleware/session.middleware.js";

export function createDashboardController(dashboard: DashboardUseCases) {
  return {
    async show(_req: Request, res: Response) {
      res.json({ data: toDashboardDto(await dashboard.getDashboard(actorOf(res))) });
    },
  };
}
