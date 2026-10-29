import {
  fullName,
  type Employee,
  type EmployeeInput,
} from "../entities/employee.entity.js";
import { DomainError, DomainErrorCode } from "../entities/errors.entity.js";
import type { Actor } from "../entities/user.entity.js";
import { authorize, Permission } from "../rules/permissions.rules.js";
import { parseEmployeeInput } from "../rules/validation.rules.js";
import type { UseCaseDeps } from "./deps.use-case.js";

export function createEmployeeUseCases({ uow, clock }: UseCaseDeps) {
  return {
    async registerEmployee(
      actor: Actor,
      input: EmployeeInput,
    ): Promise<Employee> {
      authorize(actor, Permission.EmployeesWrite);
      const data = parseEmployeeInput(input);
      const { employees } = uow.repositories;
      const existing = await employees.findByIdentity(data.identity);
      if (existing)
        throw new DomainError("Ya existe un empleado con esta cédula.", DomainErrorCode.Conflict, {
          identity: `Ya existe un empleado con esta cédula (${fullName(existing)}).`,
        });
      return employees.insert({
        ...data,
        active: true,
        createdAt: clock.now(),
      });
    },

    async listEmployees(actor: Actor): Promise<Employee[]> {
      authorize(actor, Permission.EmployeesRead);
      return uow.repositories.employees.list();
    },
  };
}

export type EmployeeUseCases = ReturnType<typeof createEmployeeUseCases>;
