import { createAccountUseCases } from "./accounts.js";
import { createAuthUseCases } from "./auth.js";
import { createDashboardUseCases } from "./dashboard.js";
import type { UseCaseDeps } from "./deps.js";
import { createEmployeeUseCases } from "./employees.js";
import { createEquipmentUseCases } from "./equipment.js";
import { createLoanUseCases } from "./loans.js";

// Punto de entrada de negocio para presentación (issue #6): cada controlador
// recibe estos casos de uso ya compuestos con sus adaptadores.
export function createUseCases(deps: UseCaseDeps) {
  return {
    auth: createAuthUseCases(deps),
    accounts: createAccountUseCases(deps),
    equipment: createEquipmentUseCases(deps),
    employees: createEmployeeUseCases(deps),
    loans: createLoanUseCases(deps),
    dashboard: createDashboardUseCases(deps),
  };
}

export type UseCases = ReturnType<typeof createUseCases>;
export type { UseCaseDeps } from "./deps.js";
