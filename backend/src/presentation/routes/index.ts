import { Router } from "express";
import type { EquipmentUseCases } from "../../business/use-cases/equipment.js";
import { createEquipmentController } from "../controllers/equipment-controller.js";

export interface UseCases {
  equipment: EquipmentUseCases;
}

export function createRouter(useCases: UseCases): Router {
  const router = Router();
  const equipment = createEquipmentController(useCases.equipment);

  router.get("/health", (_req, res) => {
    res.json({ data: { status: "ok" } });
  });
  router.get("/equipment", equipment.list);
  router.post("/equipment", equipment.create);

  return router;
}
