import type { AccountNotifier } from "./business/ports/notifier.js";
import { createSystemClock } from "./business/rules/clock.rules.js";
import { createScryptPasswordHasher } from "./business/rules/security.rules.js";
import { createUseCases, type UseCases } from "./business/use-cases/index.js";
import type { AppConfig } from "./config/env.js";
import { createPrismaClient } from "./db/client.js";
import { createPrismaUnitOfWork } from "./db/unit-of-work.js";

export interface Container {
  useCases: UseCases;
  close(): Promise<void>;
}

// Todavía no hay proveedor de correo: las notificaciones solo quedan en el log.
export function createLogNotifier(log: (message: string) => void = console.info): AccountNotifier {
  return {
    async invitationCreated(user) {
      log(`[notificación] Invitación creada para ${user.email} (${user.role}).`);
    },
    async passwordRecoveryRequested(user) {
      log(`[notificación] Recuperación de contraseña solicitada por ${user.email}.`);
    },
  };
}

// Composición: el único lugar que conoce las tres capas. Un solo PrismaClient por proceso.
export function createContainer(config: Pick<AppConfig, "databaseUrl">): Container {
  const prisma = createPrismaClient(config.databaseUrl);
  const useCases = createUseCases({
    uow: createPrismaUnitOfWork(prisma),
    clock: createSystemClock(),
    passwordHasher: createScryptPasswordHasher(),
    notifier: createLogNotifier(),
  });
  return { useCases, close: () => prisma.$disconnect() };
}
