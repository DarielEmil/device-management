import type { Equipment } from "../../business/entities/equipment.js";
import type { EquipmentRepository } from "../../business/ports/equipment-repository.js";

// Adaptador temporal hasta elegir el motor de DB (pendiente en el ER).
// Cuando exista, se reemplaza solo esta clase: negocio depende del port.
export function createInMemoryEquipmentRepository(): EquipmentRepository {
  const rows = new Map<string, Equipment>();
  return {
    async list(filter) {
      return [...rows.values()].filter(
        (row) => !filter?.status || row.status === filter.status,
      );
    },
    async findByCode(code) {
      return [...rows.values()].find((row) => row.code === code) ?? null;
    },
    async insert(equipment) {
      rows.set(equipment.id, equipment);
      return equipment;
    },
  };
}
