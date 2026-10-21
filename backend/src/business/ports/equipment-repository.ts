import type { Equipment, EquipmentStatus } from "../entities/equipment.js";

export interface EquipmentRepository {
  list(filter?: { status?: EquipmentStatus }): Promise<Equipment[]>;
  findByCode(code: string): Promise<Equipment | null>;
  insert(equipment: Equipment): Promise<Equipment>;
}
