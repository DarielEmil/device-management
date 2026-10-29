import { DomainError, DomainErrorCode } from "../../business/entities/errors.entity.js";
import type { User } from "../../business/entities/user.entity.js";
import type { UserRepository } from "../../business/ports/repositories.js";
import { translateUniqueViolation } from "../errors.js";
import type { User as UserRow } from "../generated/prisma/client.js";
import { role, userStatus } from "../mappers.js";
import type { Db } from "./db.js";

const toUser = (row: UserRow): User => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: role.fromDb(row.role),
  status: userStatus.fromDb(row.status),
  employeeId: row.employeeId,
  passwordHash: row.passwordHash,
  createdAt: row.createdAt,
});

export function createUserRepository(db: Db): UserRepository {
  return {
    async list() {
      const rows = await db.user.findMany({ orderBy: { id: "asc" } });
      return rows.map(toUser);
    },
    async findById(id) {
      const row = await db.user.findUnique({ where: { id } });
      return row ? toUser(row) : null;
    },
    async findByEmail(email) {
      const row = await db.user.findUnique({ where: { email } });
      return row ? toUser(row) : null;
    },
    async findByEmployeeId(employeeId) {
      const row = await db.user.findUnique({ where: { employeeId } });
      return row ? toUser(row) : null;
    },
    async insert(user) {
      const row = await translateUniqueViolation(() =>
        db.user.create({
          data: {
            employeeId: user.employeeId,
            name: user.name,
            email: user.email,
            passwordHash: user.passwordHash,
            role: role.toDb(user.role),
            status: userStatus.toDb(user.status),
            createdAt: user.createdAt,
          },
        }),
      );
      return toUser(row);
    },
    async updateStatus(id, status) {
      await db.user.update({ where: { id }, data: { status: userStatus.toDb(status) } });
    },
    async linkEmployee(id, employeeId) {
      // Condicional: si otra transacción ya vinculó la cuenta, no se sobrescribe.
      const { count } = await translateUniqueViolation(() =>
        db.user.updateMany({ where: { id, employeeId: null }, data: { employeeId } }),
      );
      if (count === 0)
        throw new DomainError("La cuenta ya tiene un empleado vinculado.", DomainErrorCode.Conflict);
    },
  };
}
