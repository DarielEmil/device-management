import {
  fullName,
  type Employee,
  type EmployeeInput,
} from "../entities/employee.js";
import { DomainError } from "../entities/errors.js";
import type { Actor } from "../entities/user.js";
import { authorize } from "../rules/permissions.js";
import { parseEmployeeInput } from "../rules/validation.js";
import { newId, type UseCaseDeps } from "./deps.js";

export function createEmployeeUseCases({ uow, clock }: UseCaseDeps) {
  return {
    // CU-02 Registrar empleado (Encargado).
    // Alternos: datos inválidos → VALIDATION; cédula repetida → CONFLICT.
    async registerEmployee(
      actor: Actor,
      input: EmployeeInput,
    ): Promise<Employee> {
      authorize(actor, "employees:write");
      const data = parseEmployeeInput(input);
      const { employees } = uow.repositories;
      const existing = await employees.findByIdentity(data.identity);
      if (existing)
        throw new DomainError("Ya existe un empleado con esta cédula.", "CONFLICT", {
          identity: `Ya existe un empleado con esta cédula (${fullName(existing)}).`,
        });
      const created: Employee = {
        id: newId(clock),
        ...data,
        active: true,
        createdAt: clock.now(),
      };
      await employees.insert(created);
      return created;
    },

    async listEmployees(actor: Actor): Promise<Employee[]> {
      authorize(actor, "employees:read");
      return uow.repositories.employees.list();
    },
  };
}

export type EmployeeUseCases = ReturnType<typeof createEmployeeUseCases>;
