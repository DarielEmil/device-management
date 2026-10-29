import { Router, type RequestHandler } from "express";
import type { EquipmentUseCases } from "../../business/use-cases/equipment.use-case.js";
import { createEquipmentController } from "../controllers/equipment.controller.js";

export function createEquipmentRouter(equipment: EquipmentUseCases, session: RequestHandler): Router {
  const controller = createEquipmentController(equipment);
  const router = Router();
  router.use(session);
  router.get("/", controller.list);
  router.post("/", controller.create);
  return router;
}
