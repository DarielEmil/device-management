import type { Session } from "../../business/entities/session.entity.js";
import type { SessionRepository } from "../../business/ports/repositories.js";
import type { Session as SessionRow } from "../generated/prisma/client.js";
import type { Db } from "./db.js";

const toSession = (row: SessionRow): Session => ({
  id: row.id,
  userId: row.userId,
  createdAt: row.createdAt,
  lastSeenAt: row.lastActivityAt,
  expiresAt: row.expiresAt,
});

export function createSessionRepository(db: Db): SessionRepository {
  return {
    async findById(id) {
      const row = await db.session.findUnique({ where: { id } });
      return row ? toSession(row) : null;
    },
    async insert(session) {
      await db.session.create({
        data: {
          id: session.id,
          userId: session.userId,
          createdAt: session.createdAt,
          lastActivityAt: session.lastSeenAt,
          expiresAt: session.expiresAt,
        },
      });
    },
    async touch(id, lastSeenAt, expiresAt) {
      // updateMany: una sola sentencia, sin error si la sesión ya no existe.
      await db.session.updateMany({
        where: { id, lastActivityAt: { lt: lastSeenAt } },
        data: { lastActivityAt: lastSeenAt, expiresAt },
      });
    },
    async delete(id) {
      await db.session.deleteMany({ where: { id } });
    },
    async deleteByUserId(userId) {
      await db.session.deleteMany({ where: { userId } });
    },
  };
}
