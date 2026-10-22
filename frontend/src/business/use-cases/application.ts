import {
  DomainError,
  EquipmentStatus,
  fullName,
  Role,
  type Session,
  type Snapshot,
} from "../entities/models";
import type { Gateways } from "../ports/gateways";
import { localToday, loanDateError } from "../rules/loans";
import {
  employeeInputSchema,
  equipmentInputSchema,
  inviteInputSchema,
  loanInputSchema,
  loginInputSchema,
  registerInputSchema,
  validate,
  type EmployeeInput,
  type EquipmentInput,
  type InviteInput,
  type LoanInput,
  type LoginInput,
  type RegisterInput,
} from "../rules/validation";

export function createApplication(
  gateways: Gateways,
  clock: () => string = localToday,
) {
  let session: Session | null = null;
  const requireSession = () => {
    if (!session)
      throw new DomainError(
        "Inicia sesión para continuar.",
        {},
        "UNAUTHENTICATED",
      );
    return session.account;
  };
  const requireManager = () => {
    const account = requireSession();
    if (account.role !== Role.Manager)
      throw new DomainError(
        "No tienes permiso para realizar esta acción.",
        {},
        "FORBIDDEN",
      );
    return account;
  };

  return {
    today: clock,
    async restoreSession() {
      session = await gateways.auth.current();
      return session;
    },
    async login(input: LoginInput) {
      session = await gateways.auth.login(validate(loginInputSchema, input));
      return session;
    },
    async register(input: RegisterInput) {
      session = await gateways.auth.register(
        validate(registerInputSchema, input),
      );
      return session;
    },
    async logout() {
      await gateways.auth.logout();
      session = null;
    },
    async recover(email: string) {
      const input = validate(loginInputSchema.pick({ email: true }), { email });
      await gateways.auth.recover(input.email);
    },
    async load(): Promise<Snapshot> {
      const actor = requireSession();
      if (actor.role === Role.Employee) {
        const [equipment, loans] = await Promise.all([
          gateways.equipment.list(),
          gateways.loans.list(),
        ]);
        return {
          equipment: equipment.filter((item) => item.status === EquipmentStatus.Available),
          loans: actor.employeeId
            ? loans.filter((loan) => loan.employeeId === actor.employeeId)
            : [],
          employees: [],
          accounts: [],
        };
      }
      const [equipment, employees, loans, accounts] = await Promise.all([
        gateways.equipment.list(),
        gateways.employees.list(),
        gateways.loans.list(),
        gateways.accounts.list(),
      ]);
      return { equipment, employees, loans, accounts };
    },
    async registerEquipment(value: EquipmentInput) {
      requireManager();
      const input = validate(equipmentInputSchema, value);
      const equipment = await gateways.equipment.list();
      if (equipment.some((item) => item.code.toUpperCase() === input.code))
        throw new DomainError("Código duplicado.", {
          code: "Ya existe un equipo con ese código de activo.",
        });
      return gateways.equipment.create(input);
    },
    async registerEmployee(value: EmployeeInput) {
      requireManager();
      const input = validate(employeeInputSchema, value);
      const employees = await gateways.employees.list();
      const existing = employees.find(
        (employee) => employee.identity === input.identity,
      );
      if (existing)
        throw new DomainError("Cédula duplicada.", {
          identity: `Ya existe un empleado con esta cédula (${fullName(existing)}).`,
        });
      return gateways.employees.create(input);
    },
    async createLoan(value: LoanInput) {
      requireManager();
      const input = validate(loanInputSchema, value);
      const dateError = loanDateError(input.dueOn, clock());
      if (dateError)
        throw new DomainError("Fecha inválida.", {
          dueOn: dateError,
        });
      const [equipment, employees] = await Promise.all([
        gateways.equipment.list(),
        gateways.employees.list(),
      ]);
      if (
        !employees.some(
          (employee) => employee.id === input.employeeId && employee.active,
        )
      )
        throw new DomainError("Empleado inválido.", {
          employeeId: "Selecciona un empleado activo.",
        });
      if (
        !equipment.some(
          (item) =>
            item.id === input.equipmentId &&
            item.status === EquipmentStatus.Available,
        )
      )
        throw new DomainError("Equipo no disponible.", {
          equipmentId: "El equipo seleccionado no está disponible.",
        });
      return gateways.loans.create(input);
    },
    async returnLoan(id: string) {
      requireManager();
      const loan = (await gateways.loans.list()).find((item) => item.id === id);
      if (!loan || loan.returnedOn)
        throw new DomainError(
          "Este préstamo ya fue devuelto o no está disponible.",
        );
      return gateways.loans.returnLoan(id);
    },
    async inviteUser(value: InviteInput) {
      requireManager();
      const input = validate(inviteInputSchema, value);
      const accounts = await gateways.accounts.list();
      if (accounts.some((account) => account.email === input.email))
        throw new DomainError("Correo registrado.", {
          email: "Ya existe una cuenta con este correo.",
        });
      if (
        input.employeeId &&
        accounts.some((account) => account.employeeId === input.employeeId)
      )
        throw new DomainError("Empleado vinculado.", {
          employeeId: "El empleado ya tiene una cuenta vinculada.",
        });
      return gateways.accounts.invite(input);
    },
    async deactivateUser(id: string) {
      const actor = requireManager();
      if (actor.id === id)
        throw new DomainError("No puedes desactivar tu propia cuenta.");
      return gateways.accounts.deactivate(id);
    },
  };
}

export type Application = ReturnType<typeof createApplication>;
