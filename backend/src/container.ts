import { createEquipmentUseCases } from "./business/use-cases/equipment.js";
import { createInMemoryEquipmentRepository } from "./db/repositories/in-memory-equipment-repository.js";
import type { UseCases } from "./presentation/routes/index.js";

// Única pieza que conoce las tres capas: conecta adaptadores con casos de uso.
export function createUseCases(): UseCases {
  return {
    equipment: createEquipmentUseCases(createInMemoryEquipmentRepository()),
  };
}
