import type { Equipment } from "../../business/entities/equipment.entity.js";
import type { EquipmentRepository } from "../../business/ports/repositories.js";
import { translateUniqueViolation } from "../errors.js";
import type { Device } from "../generated/prisma/client.js";
import { equipmentStatus, equipmentType } from "../mappers.js";
import type { Db } from "./db.js";

const toEquipment = (row: Device): Equipment => ({
  id: row.id,
  code: row.code,
  name: row.name,
  type: equipmentType(row.type),
  brand: row.brand ?? "",
  model: row.model ?? "",
  status: equipmentStatus.fromDb(row.status),
  createdAt: row.createdAt,
});

export function createEquipmentRepository(db: Db): EquipmentRepository {
  async function findById(id: string) {
    const row = await db.device.findUnique({ where: { id } });
    return row ? toEquipment(row) : null;
  }

  return {
    async list(filter) {
      const rows = await db.device.findMany({
        where: filter?.status ? { status: equipmentStatus.toDb(filter.status) } : {},
        orderBy: { id: "asc" },
      });
      return rows.map(toEquipment);
    },
    findById,
    async findByIdForUpdate(id) {
      await db.$queryRaw`SELECT id FROM devices WHERE id = ${id} FOR UPDATE`;
      return findById(id);
    },
    async findByCode(code) {
      const row = await db.device.findUnique({ where: { code } });
      return row ? toEquipment(row) : null;
    },
    async insert(equipment) {
      const row = await translateUniqueViolation(() =>
        db.device.create({
          data: {
            code: equipment.code,
            name: equipment.name,
            type: equipment.type,
            brand: equipment.brand || null,
            model: equipment.model || null,
            status: equipmentStatus.toDb(equipment.status),
            createdAt: equipment.createdAt,
          },
        }),
      );
      return toEquipment(row);
    },
    async updateStatus(id, status) {
      await db.device.update({ where: { id }, data: { status: equipmentStatus.toDb(status) } });
    },
  };
}
