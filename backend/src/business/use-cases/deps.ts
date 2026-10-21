import type { Clock } from "../ports/clock.js";
import type { AccountNotifier } from "../ports/notifier.js";
import type { PasswordHasher } from "../ports/security.js";
import type { UnitOfWork } from "../ports/unit-of-work.js";
import { uuidv7 } from "../rules/id.js";
import type { SessionPolicy } from "../rules/session.js";

// Todo lo que necesitan los casos de uso, inyectado desde la composición
// (container.ts). En los tests se reemplaza por implementaciones en memoria.
export interface UseCaseDeps {
  uow: UnitOfWork;
  clock: Clock;
  passwordHasher: PasswordHasher;
  notifier: AccountNotifier;
  sessionPolicy?: SessionPolicy;
}

export const newId = (clock: Clock): string => uuidv7(clock.now().getTime());
