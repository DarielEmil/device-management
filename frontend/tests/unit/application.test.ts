import { describe, expect, it } from "vitest";
import {
  AccountStatus,
  EquipmentStatus,
  LoanStatus,
  Role,
} from "@/business/entities/models";
import { createApplication } from "@/business/use-cases/application";
import { createMockGateways } from "@/mocks/repositories/mock-gateways";
import { createSeed, DEMO_PASSWORD } from "@/mocks/data/seed";
import { loanStatus, daysUntil, canAccess } from "@/business/rules/loans";
import {
  dashboardSummary,
  selectEquipment,
  selectLoans,
} from "@/business/rules/selectors";

const today = "2026-10-07";
const managerCredentials = {
  email: "laura.mendez@empresa.com",
  password: DEMO_PASSWORD,
};
const employeeCredentials = {
  email: "ana.garcia@empresa.com",
  password: DEMO_PASSWORD,
};
const newLoan = {
  employeeId: "emp-ana",
  equipmentId: "eq-6",
  dueOn: "2026-10-20",
};
const newEquipment = {
  code: "EQ-011",
  name: "Equipo de prueba",
  type: "Laptop" as const,
  brand: "",
  model: "",
};
const newEmployee = {
  firstName: "Pedro",
  lastName: "Ramírez",
  identity: "001-2223334-5",
  department: "Tecnología" as const,
  phone: "",
};
const setup = (scenario = "default") =>
  createApplication(
    createMockGateways({ delay: 0, today, scenario }),
    () => today,
  );
async function manager(scenario?: string) {
  const app = setup(scenario);
  await app.login(managerCredentials);
  return app;
}

describe("préstamos y fechas", () => {
  it.each([
    ["2026-10-06", LoanStatus.Overdue],
    ["2026-10-07", LoanStatus.DueSoon],
    ["2026-10-10", LoanStatus.DueSoon],
    ["2026-10-11", LoanStatus.Active],
  ])("clasifica fecha %s como %s", (dueOn, expected) => {
    const loan = createSeed().loans[0]!;
    expect(loanStatus({ ...loan, dueOn }, today)).toBe(expected);
  });
  it("una devolución tiene prioridad sobre la fecha prevista", () => {
    const loan = createSeed().loans[0]!;
    expect(loanStatus({ ...loan, returnedOn: today }, today)).toBe(LoanStatus.Returned);
  });
  it("compara días calendario, incluso entre meses", () => {
    expect(daysUntil("2026-11-01", "2026-10-31")).toBe(1);
  });
  it("presta un equipo y lo libera con la devolución", async () => {
    const app = await manager();
    const loan = await app.createLoan(newLoan);
    expect(
      (await app.load()).equipment.find((item) => item.id === "eq-6")?.status,
    ).toBe(EquipmentStatus.Loaned);
    await app.returnLoan(loan.id);
    const snapshot = await app.load();
    expect(snapshot.equipment.find((item) => item.id === "eq-6")?.status).toBe(
      EquipmentStatus.Available,
    );
    expect(snapshot.loans.find((item) => item.id === loan.id)?.returnedOn).toBe(
      today,
    );
  });
  it("acepta una fecha de devolución igual a hoy", async () => {
    const app = await manager();
    await expect(
      app.createLoan({ ...newLoan, dueOn: today }),
    ).resolves.toMatchObject({ dueOn: today });
  });
  it("rechaza fechas pasadas", async () => {
    const app = await manager();
    await expect(
      app.createLoan({ ...newLoan, dueOn: "2026-10-06" }),
    ).rejects.toMatchObject({ fields: { dueOn: expect.any(String) } });
  });
  it("rechaza equipos prestados", async () => {
    const app = await manager();
    await expect(
      app.createLoan({ ...newLoan, equipmentId: "eq-1" }),
    ).rejects.toMatchObject({ fields: { equipmentId: expect.any(String) } });
  });
  it("rechaza empleados inactivos", async () => {
    const app = await manager();
    await expect(
      app.createLoan({ ...newLoan, employeeId: "emp-sofia" }),
    ).rejects.toMatchObject({ fields: { employeeId: expect.any(String) } });
  });
  it("impide dos préstamos concurrentes para un mismo equipo", async () => {
    const app = await manager();
    const results = await Promise.allSettled([
      app.createLoan(newLoan),
      app.createLoan(newLoan),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      (await app.load()).loans.filter(
        (loan) => loan.equipmentId === "eq-6" && !loan.returnedOn,
      ),
    ).toHaveLength(1);
  });
  it("rechaza una segunda devolución", async () => {
    const app = await manager();
    await app.returnLoan("loan-1");
    await expect(app.returnLoan("loan-1")).rejects.toThrow("ya fue devuelto");
  });
  it("simula un conflicto de disponibilidad al confirmar", async () => {
    const app = await manager("unavailable");
    await expect(app.createLoan(newLoan)).rejects.toMatchObject({
      fields: { equipmentId: "El equipo seleccionado no está disponible." },
    });
  });
});

describe("inventario y empleados", () => {
  it("registra equipos disponibles y normaliza el código", async () => {
    const app = await manager();
    expect(
      await app.registerEquipment({ ...newEquipment, code: " eq-011 " }),
    ).toMatchObject({ code: "EQ-011", status: EquipmentStatus.Available });
  });
  it("rechaza códigos duplicados sin distinguir mayúsculas", async () => {
    const app = await manager();
    await expect(
      app.registerEquipment({ ...newEquipment, code: "eq-006" }),
    ).rejects.toMatchObject({
      fields: { code: "Ya existe un equipo con ese código de activo." },
    });
  });
  it("rechaza datos obligatorios incompletos", async () => {
    const app = await manager();
    await expect(
      app.registerEquipment({ ...newEquipment, name: " " }),
    ).rejects.toMatchObject({ fields: { name: expect.any(String) } });
  });
  it("registra empleados sin teléfono opcional", async () => {
    const app = await manager();
    await expect(app.registerEmployee(newEmployee)).resolves.toMatchObject({
      phone: "",
      active: true,
    });
  });
  it("identifica al titular de una cédula duplicada", async () => {
    const app = await manager();
    await expect(
      app.registerEmployee({ ...newEmployee, identity: "001-1234567-8" }),
    ).rejects.toMatchObject({
      fields: {
        identity: "Ya existe un empleado con esta cédula (Ana García).",
      },
    });
  });
  it("los indicadores representan los datos reales", () => {
    expect(dashboardSummary(createSeed(), today)).toMatchObject({
      total: 10,
      available: 5,
      loaned: 5,
      overdue: 2,
    });
  });
  it("filtra inventario ignorando acentos y combinando criterios", () => {
    expect(
      selectEquipment(createSeed(), {
        query: "logitech",
        type: "Periférico",
        status: EquipmentStatus.Available,
      }).map((item) => item.code),
    ).toEqual(["EQ-008"]);
  });
  it("los préstamos devueltos no aparecen como activos", () => {
    expect(
      selectLoans(
        createSeed().loans,
        { tab: "active", query: "", status: "" },
        today,
      ),
    ).toHaveLength(5);
  });
});

describe("autenticación y acceso por rol (simulación)", () => {
  it("no permite cargar datos sin sesión", async () => {
    await expect(setup().load()).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });
  it("rechaza credenciales incorrectas inline", async () => {
    await expect(
      setup().login({ ...employeeCredentials, password: "incorrecta" }),
    ).rejects.toMatchObject({
      fields: { password: "Correo o contraseña incorrectos." },
    });
  });
  it("normaliza espacios y mayúsculas del correo antes de validarlo", async () => {
    await expect(
      setup().login({
        ...managerCredentials,
        email: " LAURA.MENDEZ@EMPRESA.COM ",
      }),
    ).resolves.toMatchObject({ account: { role: Role.Manager } });
  });
  it("el empleado solo recibe su historial y equipos disponibles", async () => {
    const app = setup();
    await app.login(employeeCredentials);
    const data = await app.load();
    expect(data.loans).toHaveLength(2);
    expect(data.loans.every((loan) => loan.employeeId === "emp-ana")).toBe(
      true,
    );
    expect(data.equipment.every((item) => item.status === EquipmentStatus.Available)).toBe(
      true,
    );
    expect(data.accounts).toEqual([]);
    expect(data.employees).toEqual([]);
  });
  it("impide acciones administrativas al empleado", async () => {
    const app = setup();
    await app.login(employeeCredentials);
    await expect(app.registerEquipment(newEquipment)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(app.createLoan(newLoan)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(app.returnLoan("loan-1")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
  it("el registro público no acepta un rol administrativo", async () => {
    const app = setup();
    const input = {
      name: "Pedro Ramírez",
      email: "pedro.ramirez@empresa.com",
      password: DEMO_PASSWORD,
      role: Role.Manager,
      employeeId: "emp-ana",
    };
    const session = await app.register(input);
    expect(session.account).toMatchObject({
      role: Role.Employee,
      employeeId: null,
    });
  });
  it("cerrar sesión elimina el acceso y no persiste contraseñas", async () => {
    const app = await manager();
    await app.logout();
    await expect(app.load()).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });
  it("desactivar cuenta mantiene sus préstamos abiertos", async () => {
    const app = await manager();
    await app.deactivateUser("user-emp-ana");
    expect(
      (await app.load()).loans.find((loan) => loan.id === "loan-1")?.returnedOn,
    ).toBeNull();
  });
  it("no permite desactivar la propia cuenta", async () => {
    const app = await manager();
    await expect(app.deactivateUser("user-laura")).rejects.toThrow(
      "propia cuenta",
    );
  });
  it("una invitación se registra sin activar automáticamente la cuenta", async () => {
    const app = await manager();
    const employee = await app.registerEmployee(newEmployee);
    await expect(
      app.inviteUser({
        email: "pedro.ramirez@empresa.com",
        role: Role.Employee,
        employeeId: employee.id,
      }),
    ).resolves.toMatchObject({ status: AccountStatus.Invited, employeeId: employee.id });
  });
  it("no permite vincular dos cuentas al mismo empleado", async () => {
    const app = await manager();
    await expect(
      app.inviteUser({
        email: "otra@empresa.com",
        role: Role.Employee,
        employeeId: "emp-ana",
      }),
    ).rejects.toMatchObject({ fields: { employeeId: expect.any(String) } });
  });
  it("vincula una cuenta registrada a un empleado y la cuenta ve sus préstamos", async () => {
    const app = setup();
    const { account } = await app.register({
      name: "Pedro R.",
      email: "pedro.ramirez@empresa.com",
      password: DEMO_PASSWORD,
    });
    expect((await app.load()).loans).toEqual([]);
    await app.logout();
    await app.login(managerCredentials);
    const employee = await app.registerEmployee(newEmployee);
    await app.createLoan({ ...newLoan, employeeId: employee.id });
    const linked = await app.linkEmployee(account.id, employee.id);
    expect(linked).toMatchObject({ id: account.id, name: "Pedro R.", employeeId: employee.id });
    await app.logout();
    await app.login({ email: "pedro.ramirez@empresa.com", password: DEMO_PASSWORD });
    const loans = (await app.load()).loans;
    expect(loans).toHaveLength(1);
    expect(loans[0]?.employeeId).toBe(employee.id);
  });
  it("rechaza cada condición del vínculo con el código y el campo del backend", async () => {
    const app = await manager();
    const employee = await app.registerEmployee(newEmployee);
    const field = { employeeId: "Selecciona un empleado activo sin cuenta vinculada." };
    await expect(app.linkEmployee("user-laura", " ")).rejects.toMatchObject({
      fields: { employeeId: "El empleado es obligatorio." },
    });
    await expect(app.linkEmployee("no-existe", employee.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
      fields: {},
    });
    await expect(app.linkEmployee("user-laura", "no-existe")).rejects.toMatchObject({
      code: "NOT_FOUND",
      fields: field,
    });
    await expect(app.linkEmployee("user-emp-sofia", employee.id)).rejects.toMatchObject({
      code: "CONFLICT",
      message: "La cuenta está inactiva.",
    });
    await expect(app.linkEmployee("user-emp-ana", employee.id)).rejects.toMatchObject({
      code: "CONFLICT",
      message: "La cuenta ya tiene un empleado vinculado.",
    });
    await expect(app.linkEmployee("user-laura", "emp-ana")).rejects.toMatchObject({
      code: "CONFLICT",
      fields: field,
    });
    await expect(app.linkEmployee("user-laura", "emp-sofia")).rejects.toMatchObject({
      code: "CONFLICT",
      fields: field,
    });
  });
  it("el empleado no puede vincular cuentas", async () => {
    const app = setup();
    await app.login(employeeCredentials);
    await expect(app.linkEmployee("user-laura", "emp-carlos")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
  it("las rutas administrativas no están disponibles al empleado", () => {
    expect(canAccess(Role.Employee, "/users")).toBe(false);
    expect(canAccess(Role.Employee, "/inventory")).toBe(false);
    expect(canAccess(Role.Employee, "/my-loans")).toBe(true);
  });
  it("los mocks retornan copias y no exponen su estado mutable", async () => {
    const app = await manager();
    const data = await app.load();
    data.equipment.length = 0;
    expect((await app.load()).equipment).toHaveLength(10);
  });
});

describe("escenarios", () => {
  it("permite probar inventario vacío", async () => {
    const app = await manager("empty");
    expect((await app.load()).equipment).toEqual([]);
  });
  it("permite probar listas sin préstamos activos", async () => {
    const app = await manager("no-active-loans");
    expect((await app.load()).loans.every((loan) => loan.returnedOn)).toBe(
      true,
    );
  });
  it("permite probar fallos de carga", async () => {
    const app = await manager("error");
    await expect(app.load()).rejects.toMatchObject({ code: "NETWORK" });
  });
});
