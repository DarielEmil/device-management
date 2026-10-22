import type { Clock } from "../ports/clock.js";
import type { AccountNotifier } from "../ports/notifier.js";
import type { PasswordHasher } from "../ports/security.js";
import type { UnitOfWork } from "../ports/unit-of-work.js";
import { uuidv7 } from "../rules/id.rules.js";
import type { SessionPolicy } from "../rules/session.rules.js";

export interface UseCaseDeps {
  uow: UnitOfWork;
  clock: Clock;
  passwordHasher: PasswordHasher;
  notifier: AccountNotifier;
  sessionPolicy?: SessionPolicy;
}

export const newId = (clock: Clock): string => uuidv7(clock.now().getTime());
