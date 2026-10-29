import type { Repositories } from "../../business/ports/repositories.js";
import type { Db } from "./db.js";
import { createEmployeeRepository } from "./employees.repository.js";
import { createEquipmentRepository } from "./equipment.repository.js";
import { createLoanRepository } from "./loans.repository.js";
import { createSessionRepository } from "./sessions.repository.js";
import { createUserRepository } from "./users.repository.js";

export function createRepositories(db: Db): Repositories {
  return {
    equipment: createEquipmentRepository(db),
    employees: createEmployeeRepository(db),
    loans: createLoanRepository(db),
    users: createUserRepository(db),
    sessions: createSessionRepository(db),
  };
}
