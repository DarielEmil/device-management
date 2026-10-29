import type { UnitOfWork } from "../business/ports/unit-of-work.js";
import type { PrismaClient } from "./client.js";
import { Prisma } from "./generated/prisma/client.js";
import { createRepositories } from "./repositories/index.js";

// READ COMMITTED: tras bloquear una fila (FOR UPDATE), las lecturas siguientes
// ven lo último confirmado y no la instantánea de REPEATABLE READ.
export function createPrismaUnitOfWork(prisma: PrismaClient): UnitOfWork {
  return {
    repositories: createRepositories(prisma),
    transaction(work) {
      return prisma.$transaction((tx) => work(createRepositories(tx)), {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      });
    },
  };
}
