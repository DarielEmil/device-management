import type { Employee } from "../../src/business/entities/employee.js";
import type { Equipment } from "../../src/business/entities/equipment.js";
import type { Loan } from "../../src/business/entities/loan.js";
import { actorFrom, type Actor, type User } from "../../src/business/entities/user.js";
import { uuidv7 } from "../../src/business/rules/id.js";
import type { SessionPolicy } from "../../src/business/rules/session.js";
import { createUseCases } from "../../src/business/use-cases/index.js";
import {
  createFakeClock,
  createFakePasswordHasher,
  createInMemoryUnitOfWork,
  createRecordingNotifier,
} from "./in-memory.js";

export const DEMO_PASSWORD = "Demo2026!";
export const TODAY = "2026-10-07";

// Contexto de prueba: casos de uso reales sobre ports falsos, con un
// Encargado y un Empleado (vinculado a un empleado) ya creados.
export function setup(options: { sessionPolicy?: SessionPolicy } = {}) {
  const uow = createInMemoryUnitOfWork();
  const clock = createFakeClock();
  const passwordHasher = createFakePasswordHasher();
  const notifier = createRecordingNotifier();
  const useCases = createUseCases({
    uow,
    clock,
    passwordHasher,
    notifier,
    sessionPolicy: options.sessionPolicy,
  });

  const created = () => clock.now();
  const id = () => uuidv7(clock.now().getTime());

  const addEquipment = (data: Partial<Equipment> = {}): Equipment => {
    const equipment: Equipment = {
      id: id(),
      code: `LAP-${String(uow.store.equipment.size + 1).padStart(3, "0")}`,
      name: "MacBook Pro 14",
      type: "Laptop",
      brand: "Apple",
      model: "M3",
      status: "Disponible",
      createdAt: created(),
      ...data,
    };
    uow.store.equipment.set(equipment.id, equipment);
    return equipment;
  };

  const addEmployee = (data: Partial<Employee> = {}): Employee => {
    const number = String(uow.store.employees.size + 1).padStart(7, "0");
    const employee: Employee = {
      id: id(),
      firstName: "Ana",
      lastName: "García",
      identity: `001-${number}-1`,
      department: "Finanzas",
      phone: "",
      active: true,
      createdAt: created(),
      ...data,
    };
    uow.store.employees.set(employee.id, employee);
    return employee;
  };

  const addUser = (data: Partial<User> = {}): User => {
    const user: User = {
      id: id(),
      name: "Usuario",
      email: `usuario${uow.store.users.size + 1}@empresa.com`,
      role: "Empleado",
      status: "Activo",
      employeeId: null,
      passwordHash: `hashed:${DEMO_PASSWORD}`,
      createdAt: created(),
      ...data,
    };
    uow.store.users.set(user.id, user);
    return user;
  };

  const addLoan = (data: Partial<Loan> & Pick<Loan, "employeeId" | "equipmentId">): Loan => {
    const loan: Loan = {
      id: id(),
      borrowedOn: "2026-10-01",
      dueOn: "2026-10-20",
      returnedOn: null,
      status: "Activo",
      createdAt: created(),
      ...data,
    };
    uow.store.loans.set(loan.id, loan);
    if (loan.status === "Activo") {
      const equipment = uow.store.equipment.get(loan.equipmentId);
      if (equipment) equipment.status = "Prestado";
    }
    return loan;
  };

  const managerUser = addUser({
    name: "Laura Méndez",
    email: "laura.mendez@empresa.com",
    role: "Encargado",
  });
  const ana = addEmployee();
  const employeeUser = addUser({
    name: "Ana García",
    email: "ana.garcia@empresa.com",
    employeeId: ana.id,
  });
  const manager: Actor = actorFrom(managerUser);
  const employee: Actor = actorFrom(employeeUser);

  return {
    uow,
    clock,
    passwordHasher,
    notifier,
    useCases,
    manager,
    managerUser,
    employee,
    employeeUser,
    ana,
    addEquipment,
    addEmployee,
    addUser,
    addLoan,
  };
}

export type TestContext = ReturnType<typeof setup>;
