import type { Request, Response } from "express";
import type { EquipmentUseCases } from "../../business/use-cases/equipment.use-case.js";
import { equipmentInputDto, equipmentQueryDto, parseBody, parseQuery } from "../dto/input.dto.js";
import { toEquipmentDto } from "../dto/output.dto.js";
import { actorOf } from "../middleware/session.middleware.js";

export function createEquipmentController(equipment: EquipmentUseCases) {
  return {
    async list(req: Request, res: Response) {
      const { status } = parseQuery(equipmentQueryDto, req.query);
      const items = await equipment.listEquipment(actorOf(res), { status });
      res.json({ data: items.map(toEquipmentDto) });
    },

    // CU-01
    async create(req: Request, res: Response) {
      const body = parseBody(equipmentInputDto, req.body);
      const created = await equipment.registerEquipment(actorOf(res), {
        code: body.code ?? "",
        name: body.name ?? "",
        type: body.type ?? "",
        brand: body.brand,
        model: body.model,
      });
      res.status(201).json({ data: toEquipmentDto(created) });
    },
  };
}
