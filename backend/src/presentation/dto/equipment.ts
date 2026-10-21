import { z } from "zod";
import type { Equipment } from "../../business/entities/equipment.js";

export const createEquipmentDto = z.object({
  code: z.string().trim().min(1, "Requerido").max(30),
  name: z.string().trim().min(1, "Requerido").max(100),
  type: z.string().trim().min(1, "Requerido").max(40),
  brand: z.string().trim().max(60).default(""),
  model: z.string().trim().max(60).default(""),
});

export const listEquipmentQueryDto = z.object({
  status: z.enum(["Disponible", "Prestado"]).optional(),
});

export const toEquipmentResponse = (equipment: Equipment) => ({
  id: equipment.id,
  code: equipment.code,
  name: equipment.name,
  type: equipment.type,
  brand: equipment.brand,
  model: equipment.model,
  status: equipment.status,
});
