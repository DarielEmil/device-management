import {
  AccountStatus,
  DomainError,
  EquipmentStatus,
  fullName,
  Role,
  type Account,
  type Session,
} from "@/business/entities/models";
import type { Gateways } from "@/business/ports/gateways";
import { localToday } from "@/business/rules/loans";
import { DEMO_PASSWORD } from "../data/seed";
import { createScenario } from "../scenarios/scenarios";

export interface MockOptions {
  delay?: number;
  scenario?: string;
  today?: string;
}

export function createMockGateways(options: MockOptions = {}): Gateways {
  const { data, scenario } = createScenario(options.scenario ?? "default");
  const passwords = new Map(
    data.accounts.map((account) => [account.email, DEMO_PASSWORD]),
  );
  let session: Session | null = null;
  let sequence = 0;
  const id = (prefix: string) => `${prefix}-mock-${++sequence}`;
  const today = () => options.today || localToday();
  const clone = <T>(value: T): T => structuredClone(value);
  const wait = () =>
    new Promise<void>((resolve) => setTimeout(resolve, options.delay ?? 350));
  const actor = () => {
    if (!session)
      throw new DomainError(
        "Inicia sesión para continuar.",
        {},
        "UNAUTHENTICATED",
      );
    return session.account;
  };
  const manager = () => {
    if (actor().role !== Role.Manager)
      throw new DomainError(
        "No tienes permiso para realizar esta acción.",
        {},
        "FORBIDDEN",
      );
  };
  const list = async () => {
    await wait();
    actor();
    if (scenario === "error")
      throw new DomainError(
        "No se pudieron cargar los datos. Inténtalo de nuevo.",
        {},
        "NETWORK",
      );
  };

  return {
    auth: {
      async current() {
        await wait();
        return clone(session);
      },
      async login(input) {
        await wait();
        const account = data.accounts.find(
          (item) => item.email === input.email && item.status === AccountStatus.Active,
        );
        if (!account || passwords.get(input.email) !== input.password)
          throw new DomainError("Correo o contraseña incorrectos.", {
            password: "Correo o contraseña incorrectos.",
          });
        session = { account: clone(account) };
        return clone(session);
      },
      async register(input) {
        await wait();
        if (data.accounts.some((account) => account.email === input.email))
          throw new DomainError("Correo registrado.", {
            email: "Ya existe una cuenta con este correo.",
          });
        // Public registration never assigns privileges or links an employee by guessing a name/email.
        const account: Account = {
          id: id("user"),
          name: input.name,
          email: input.email,
          role: Role.Employee,
          status: AccountStatus.Active,
          employeeId: null,
        };
        data.accounts.push(account);
        passwords.set(input.email, input.password);
        session = { account: clone(account) };
        return clone(session);
      },
      async logout() {
        await wait();
        session = null;
      },
      async recover() {
        await wait(); /* Simulation only: no email leaves the browser. */
      },
    },
    equipment: {
      async list() {
        await list();
        return clone(
          actor().role === Role.Manager
            ? data.equipment
            : data.equipment.filter((item) => item.status === EquipmentStatus.Available),
        );
      },
      async create(input) {
        await wait();
        manager();
        if (
          data.equipment.some(
            (item) => item.code.toUpperCase() === input.code.toUpperCase(),
          )
        )
          throw new DomainError("Código duplicado.", {
            code: "Ya existe un equipo con ese código de activo.",
          });
        const item = { ...input, id: id("eq"), status: EquipmentStatus.Available };
        data.equipment.push(item);
        return clone(item);
      },
    },
    employees: {
      async list() {
        await list();
        manager();
        return clone(data.employees);
      },
      async create(input) {
        await wait();
        manager();
        const existing = data.employees.find(
          (employee) => employee.identity === input.identity,
        );
        if (existing)
          throw new DomainError("Cédula duplicada.", {
            identity: `Ya existe un empleado con esta cédula (${fullName(existing)}).`,
          });
        const employee = { ...input, id: id("emp"), active: true };
        data.employees.push(employee);
        return clone(employee);
      },
    },
    loans: {
      async list() {
        await list();
        return clone(
          actor().role === Role.Manager
            ? data.loans
            : data.loans.filter(
                (loan) => loan.employeeId === actor().employeeId,
              ),
        );
      },
      async create(input) {
        await wait();
        manager();
        const equipment = data.equipment.find(
          (item) => item.id === input.equipmentId,
        );
        const employee = data.employees.find(
          (item) => item.id === input.employeeId && item.active,
        );
        if (
          scenario === "unavailable" ||
          !equipment ||
          equipment.status !== EquipmentStatus.Available ||
          data.loans.some(
            (loan) =>
              loan.equipmentId === input.equipmentId && !loan.returnedOn,
          )
        )
          throw new DomainError("Equipo no disponible.", {
            equipmentId: "El equipo seleccionado no está disponible.",
          });
        if (!employee)
          throw new DomainError("Empleado inválido.", {
            employeeId: "Selecciona un empleado activo.",
          });
        if (input.dueOn < today())
          throw new DomainError("Fecha inválida.", {
            dueOn: "La fecha prevista no puede ser anterior a hoy.",
          });
        // No awaits between the availability check and mutation: one atomic in-memory operation.
        const loan = {
          ...input,
          id: id("loan"),
          borrowedOn: today(),
          returnedOn: null,
          equipmentCode: equipment.code,
          equipmentName: equipment.name,
          employeeName: fullName(employee),
        };
        data.loans.push(loan);
        equipment.status = EquipmentStatus.Loaned;
        return clone(loan);
      },
      async returnLoan(loanId) {
        await wait();
        manager();
        const loan = data.loans.find((item) => item.id === loanId);
        if (!loan || loan.returnedOn)
          throw new DomainError(
            "Este préstamo ya fue devuelto o no está disponible.",
          );
        loan.returnedOn = today();
        const equipment = data.equipment.find(
          (item) => item.id === loan.equipmentId,
        );
        if (equipment) equipment.status = EquipmentStatus.Available;
        return clone(loan);
      },
    },
    accounts: {
      async list() {
        await list();
        manager();
        return clone(data.accounts);
      },
      async invite(input) {
        await wait();
        manager();
        if (data.accounts.some((account) => account.email === input.email))
          throw new DomainError("Correo registrado.", {
            email: "Ya existe una cuenta con este correo.",
          });
        const employee = data.employees.find(
          (item) => item.id === input.employeeId,
        );
        if (
          input.employeeId &&
          (!employee ||
            !employee.active ||
            data.accounts.some(
              (account) => account.employeeId === input.employeeId,
            ))
        )
          throw new DomainError("Empleado inválido.", {
            employeeId: "Selecciona un empleado activo sin cuenta vinculada.",
          });
        const account: Account = {
          id: id("user"),
          name: employee ? fullName(employee) : input.email,
          email: input.email,
          role: input.role,
          status: AccountStatus.Invited,
          employeeId: employee?.id ?? null,
        };
        data.accounts.push(account);
        return clone(account);
      },
      // Mismas reglas, códigos y mensajes que POST /accounts/:id/link-employee.
      async linkEmployee(accountId, employeeId) {
        await wait();
        manager();
        if (!employeeId.trim())
          throw new DomainError("Revisa los campos indicados.", {
            employeeId: "El empleado es obligatorio.",
          });
        const account = data.accounts.find((item) => item.id === accountId);
        if (!account)
          throw new DomainError("La cuenta no existe.", {}, "NOT_FOUND");
        if (account.status === AccountStatus.Inactive)
          throw new DomainError("La cuenta está inactiva.", {}, "CONFLICT");
        if (account.employeeId)
          throw new DomainError(
            "La cuenta ya tiene un empleado vinculado.",
            {},
            "CONFLICT",
          );
        const field = {
          employeeId: "Selecciona un empleado activo sin cuenta vinculada.",
        };
        const employee = data.employees.find((item) => item.id === employeeId);
        if (!employee)
          throw new DomainError("El empleado no existe.", field, "NOT_FOUND");
        if (
          !employee.active ||
          data.accounts.some((item) => item.employeeId === employee.id)
        )
          throw new DomainError(
            "El empleado no se puede vincular.",
            field,
            "CONFLICT",
          );
        account.employeeId = employee.id;
        return clone(account);
      },
      async deactivate(accountId) {
        await wait();
        manager();
        const account = data.accounts.find((item) => item.id === accountId);
        if (!account || account.id === actor().id)
          throw new DomainError("No puedes desactivar esta cuenta.");
        account.status = AccountStatus.Inactive;
        if (account.employeeId) {
          const employee = data.employees.find(
            (item) => item.id === account.employeeId,
          );
          if (employee) employee.active = false;
        }
        return clone(account);
      },
    },
  };
}
