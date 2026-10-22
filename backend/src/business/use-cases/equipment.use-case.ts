import {
  EquipmentStatus,
  type Equipment,
  type EquipmentInput,
} from "../entities/equipment.entity.js";
import { DomainError, DomainErrorCode } from "../entities/errors.entity.js";
import { Role, type Actor } from "../entities/user.entity.js";
import { authorize, Permission } from "../rules/permissions.rules.js";
import { parseEquipmentInput } from "../rules/validation.rules.js";
import { newId, type UseCaseDeps } from "./deps.use-case.js";

const DUPLICATE_CODE = "Ya existe un equipo con ese código de activo.";

export function createEquipmentUseCases({ uow, clock }: UseCaseDeps) {
  return {
    async registerEquipment(
      actor: Actor,
      input: EquipmentInput,
    ): Promise<Equipment> {
      authorize(actor, Permission.EquipmentWrite);
      const data = parseEquipmentInput(input);
      const { equipment } = uow.repositories;
      if (await equipment.findByCode(data.code))
        throw new DomainError(DUPLICATE_CODE, DomainErrorCode.Conflict, {
          code: DUPLICATE_CODE,
        });
      const created: Equipment = {
        id: newId(clock),
        ...data,
        status: EquipmentStatus.Available,
        createdAt: clock.now(),
      };
      await equipment.insert(created);
      return created;
    },

    async listEquipment(
      actor: Actor,
      filter: { status?: EquipmentStatus } = {},
    ): Promise<Equipment[]> {
      authorize(actor, Permission.EquipmentRead);
      if (actor.role === Role.Employee) {
        if (filter.status && filter.status !== EquipmentStatus.Available) return [];
        return uow.repositories.equipment.list({ status: EquipmentStatus.Available });
      }
      return uow.repositories.equipment.list(filter);
    },

    async listAvailableEquipment(actor: Actor): Promise<Equipment[]> {
      authorize(actor, Permission.EquipmentRead);
      return uow.repositories.equipment.list({ status: EquipmentStatus.Available });
    },
  };
}

export type EquipmentUseCases = ReturnType<typeof createEquipmentUseCases>;
