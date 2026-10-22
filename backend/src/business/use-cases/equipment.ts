import type {
  Equipment,
  EquipmentInput,
  EquipmentStatus,
} from "../entities/equipment.js";
import { DomainError } from "../entities/errors.js";
import type { Actor } from "../entities/user.js";
import { authorize } from "../rules/permissions.js";
import { parseEquipmentInput } from "../rules/validation.js";
import { newId, type UseCaseDeps } from "./deps.js";

const DUPLICATE_CODE = "Ya existe un equipo con ese código de activo.";

export function createEquipmentUseCases({ uow, clock }: UseCaseDeps) {
  return {
    // CU-01 Registrar equipo (Encargado).
    // Alternos: datos inválidos → VALIDATION; código repetido → CONFLICT.
    async registerEquipment(
      actor: Actor,
      input: EquipmentInput,
    ): Promise<Equipment> {
      authorize(actor, "equipment:write");
      const data = parseEquipmentInput(input);
      const { equipment } = uow.repositories;
      if (await equipment.findByCode(data.code))
        throw new DomainError(DUPLICATE_CODE, "CONFLICT", {
          code: DUPLICATE_CODE,
        });
      const created: Equipment = {
        id: newId(clock),
        ...data,
        status: "Disponible",
        createdAt: clock.now(),
      };
      await equipment.insert(created);
      return created;
    },

    // Inventario. Encargado ve todo y puede filtrar por estado; Empleado
    // solo ve los equipos que puede pedir prestados.
    async listEquipment(
      actor: Actor,
      filter: { status?: EquipmentStatus } = {},
    ): Promise<Equipment[]> {
      authorize(actor, "equipment:read");
      if (actor.role === "Empleado") {
        if (filter.status && filter.status !== "Disponible") return [];
        return uow.repositories.equipment.list({ status: "Disponible" });
      }
      return uow.repositories.equipment.list(filter);
    },

    // CU-05 Consultar equipos disponibles (Encargado y Empleado).
    async listAvailableEquipment(actor: Actor): Promise<Equipment[]> {
      authorize(actor, "equipment:read");
      return uow.repositories.equipment.list({ status: "Disponible" });
    },
  };
}

export type EquipmentUseCases = ReturnType<typeof createEquipmentUseCases>;
