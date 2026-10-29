import type { Employee } from "../../business/entities/employee.entity.js";
import type { EmployeeRepository } from "../../business/ports/repositories.js";
import { translateUniqueViolation } from "../errors.js";
import type { Employee as EmployeeRow } from "../generated/prisma/client.js";
import { department } from "../mappers.js";
import type { Db } from "./db.js";

const toEmployee = (row: EmployeeRow): Employee => ({
  id: row.id,
  firstName: row.firstName,
  lastName: row.lastName,
  identity: row.nationalId,
  department: department(row.department),
  phone: row.phone ?? "",
  active: row.isActive,
  createdAt: row.createdAt,
});

export function createEmployeeRepository(db: Db): EmployeeRepository {
  async function findById(id: string) {
    const row = await db.employee.findUnique({ where: { id } });
    return row ? toEmployee(row) : null;
  }

  return {
    async list() {
      const rows = await db.employee.findMany({ orderBy: { id: "asc" } });
      return rows.map(toEmployee);
    },
    findById,
    async findByIdForUpdate(id) {
      await db.$queryRaw`SELECT id FROM employees WHERE id = ${id} FOR UPDATE`;
      return findById(id);
    },
    async findByIdentity(identity) {
      const row = await db.employee.findUnique({ where: { nationalId: identity } });
      return row ? toEmployee(row) : null;
    },
    async insert(employee) {
      const row = await translateUniqueViolation(() =>
        db.employee.create({
          data: {
            firstName: employee.firstName,
            lastName: employee.lastName,
            nationalId: employee.identity,
            department: employee.department,
            phone: employee.phone || null,
            isActive: employee.active,
            createdAt: employee.createdAt,
          },
        }),
      );
      return toEmployee(row);
    },
    async setActive(id, active) {
      await db.employee.update({ where: { id }, data: { isActive: active } });
    },
  };
}
