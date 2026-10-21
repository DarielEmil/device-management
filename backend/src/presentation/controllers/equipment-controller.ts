import type { Request, Response } from "express";
import type { EquipmentUseCases } from "../../business/use-cases/equipment.js";
import {
  createEquipmentDto,
  listEquipmentQueryDto,
  toEquipmentResponse,
} from "../dto/equipment.js";

export function createEquipmentController(useCases: EquipmentUseCases) {
  return {
    async list(req: Request, res: Response) {
      const { status } = listEquipmentQueryDto.parse(req.query);
      const items = await useCases.list(status ? { status } : undefined);
      res.json({ data: items.map(toEquipmentResponse) });
    },
    async create(req: Request, res: Response) {
      const input = createEquipmentDto.parse(req.body);
      const created = await useCases.register(input);
      res.status(201).json({ data: toEquipmentResponse(created) });
    },
  };
}
