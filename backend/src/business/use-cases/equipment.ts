import { DomainError } from "../entities/errors.js";
import type {
  Equipment,
  EquipmentStatus,
  NewEquipment,
} from "../entities/equipment.js";
import type { EquipmentRepository } from "../ports/equipment-repository.js";
import { normalizeEquipmentType } from "../rules/equipment.js";
import { uuidv7 } from "../rules/id.js";

export interface EquipmentUseCases {
  register(input: NewEquipment): Promise<Equipment>;
  listAvailable(): Promise<Equipment[]>;
  list(filter?: { status?: EquipmentStatus }): Promise<Equipment[]>;
}

export function createEquipmentUseCases(
  repository: EquipmentRepository,
  clock: () => Date = () => new Date(),
): EquipmentUseCases {
  return {
    // CU-01 — Registrar equipo
    async register(input) {
      const code = input.code.trim();
      if (await repository.findByCode(code))
        throw new DomainError(
          "Ya existe un equipo con ese código.",
          "CONFLICT",
          { code: "Ya existe un equipo con ese código." },
        );
      return repository.insert({
        id: uuidv7(),
        code,
        name: input.name.trim(),
        type: normalizeEquipmentType(input.type),
        brand: input.brand.trim(),
        model: input.model.trim(),
        status: "Disponible",
        createdAt: clock(),
      });
    },
    // CU-05 — Consultar equipos disponibles
    listAvailable: () => repository.list({ status: "Disponible" }),
    list: (filter) => repository.list(filter),
  };
}
