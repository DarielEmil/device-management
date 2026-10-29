import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { DomainErrorCode } from "../../src/business/entities/errors.entity.js";
import { EquipmentStatus } from "../../src/business/entities/equipment.entity.js";
import { LoanStatus } from "../../src/business/entities/loan.entity.js";
import { Role, UserStatus, actorFrom } from "../../src/business/entities/user.entity.js";
import { createUseCases } from "../../src/business/use-cases/index.js";
import { expectDomainError } from "../support/expect-domain-error.js";
import { createFakeClock, createFakePasswordHasher, createRecordingNotifier } from "../support/in-memory.js";
import { connect, employeeFixture, equipmentFixture, loanFixture, truncate, userFixture } from "./support.js";

const { prisma, uow, repositories } = connect();

beforeEach(() => truncate(prisma));
afterAll(() => prisma.$disconnect());

async function loanParties() {
  const manager = await repositories.users.insert(userFixture());
  const employee = await repositories.employees.insert(employeeFixture());
  const equipment = await repositories.equipment.insert(equipmentFixture());
  return { manager, employee, equipment };
}

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("mapeo de repositorios", () => {
  it("Prisma genera el id como UUID v7 y insert devuelve el registro creado", async () => {
    const data = equipmentFixture();
    const first = await repositories.equipment.insert(data);
    const second = await repositories.equipment.insert(equipmentFixture());
    expect(first).toEqual({ ...data, id: expect.stringMatching(UUID_V7) });
    expect(second.id).toMatch(UUID_V7);
    expect(first.id < second.id).toBe(true);
  });

  it("guarda y lee las entidades con los valores de negocio", async () => {
    const { manager, employee, equipment } = await loanParties();
    expect(await repositories.equipment.findByCode(equipment.code)).toEqual(equipment);
    expect(await repositories.employees.findByIdentity(employee.identity)).toEqual(employee);
    expect(await repositories.users.findByEmail(manager.email)).toEqual(manager);

    const loan = await repositories.loans.insert(
      loanFixture({ employeeId: employee.id, equipmentId: equipment.id, registeredById: manager.id }),
    );
    expect(await repositories.loans.findById(loan.id)).toEqual({
      ...loan,
      equipmentCode: equipment.code,
      equipmentName: equipment.name,
      employeeName: "Ana García",
    });
  });

  it("guarda en español los estados y roles", async () => {
    await repositories.users.insert(userFixture({ role: Role.Employee, status: UserStatus.Invited, passwordHash: null }));
    await repositories.equipment.insert(equipmentFixture({ status: EquipmentStatus.Loaned }));
    const [user] = await prisma.user.findMany();
    const [device] = await prisma.device.findMany();
    expect(user).toMatchObject({ role: "Empleado", status: "Invitado", passwordHash: null });
    expect(device?.status).toBe("Prestado");
  });

  it("touch solo avanza la sesión y borrar el usuario borra sus sesiones", async () => {
    const user = await repositories.users.insert(userFixture());
    const t0 = new Date("2026-10-07T12:00:00.000Z");
    const later = new Date("2026-10-07T12:10:00.000Z");
    await repositories.sessions.insert({ id: "a".repeat(64), userId: user.id, createdAt: t0, lastSeenAt: t0, expiresAt: later });

    await repositories.sessions.touch("a".repeat(64), later, new Date("2026-10-07T12:40:00.000Z"));
    await repositories.sessions.touch("a".repeat(64), t0, t0);
    expect(await repositories.sessions.findById("a".repeat(64))).toMatchObject({ lastSeenAt: later });

    await prisma.user.delete({ where: { id: user.id } });
    expect(await repositories.sessions.findById("a".repeat(64))).toBeNull();
  });
});

describe("restricciones únicas", () => {
  it("rechaza un código de equipo duplicado como CONFLICT en code", async () => {
    await repositories.equipment.insert(equipmentFixture({ code: "EQ-001" }));
    await expectDomainError(repositories.equipment.insert(equipmentFixture({ code: "EQ-001" })), { code: DomainErrorCode.Conflict, fields: { code: expect.any(String) } });
  });

  it("rechaza una cédula duplicada como CONFLICT en identity", async () => {
    await repositories.employees.insert(employeeFixture({ identity: "001-1234567-8" }));
    await expectDomainError(repositories.employees.insert(employeeFixture({ identity: "001-1234567-8" })), { code: DomainErrorCode.Conflict, fields: { identity: expect.any(String) } });
  });
});

describe("vincular cuenta con empleado", () => {
  const useCasesFor = () =>
    createUseCases({ uow, clock: createFakeClock(), passwordHasher: createFakePasswordHasher(), notifier: createRecordingNotifier() });

  it("vincula y un segundo vínculo al mismo empleado responde CONFLICT en employeeId", async () => {
    const manager = actorFrom(await repositories.users.insert(userFixture()));
    const employee = await repositories.employees.insert(employeeFixture());
    const first = await repositories.users.insert(userFixture({ role: Role.Employee, name: "Cuenta 1" }));
    const second = await repositories.users.insert(userFixture({ role: Role.Employee }));
    const useCases = useCasesFor();

    const linked = await useCases.accounts.linkEmployee(manager, first.id, { employeeId: employee.id });
    expect(linked).toMatchObject({ id: first.id, name: "Cuenta 1", employeeId: employee.id });
    expect((await repositories.users.findById(first.id))?.employeeId).toBe(employee.id);
    await expectDomainError(useCases.accounts.linkEmployee(manager, second.id, { employeeId: employee.id }), {
      code: DomainErrorCode.Conflict,
      fields: { employeeId: expect.any(String) },
    });
  });

  it("la DB rechaza el vínculo duplicado y no sobrescribe una cuenta ya vinculada", async () => {
    const employee = await repositories.employees.insert(employeeFixture());
    const other = await repositories.employees.insert(employeeFixture());
    const first = await repositories.users.insert(userFixture());
    const second = await repositories.users.insert(userFixture());
    await repositories.users.linkEmployee(first.id, employee.id);
    await expectDomainError(repositories.users.linkEmployee(second.id, employee.id), {
      code: DomainErrorCode.Conflict,
      fields: { employeeId: expect.any(String) },
    });
    await expectDomainError(repositories.users.linkEmployee(first.id, other.id), { code: DomainErrorCode.Conflict });
    expect((await repositories.users.findById(first.id))?.employeeId).toBe(employee.id);
  });

  it("dos vínculos simultáneos al mismo empleado: solo uno se aplica", async () => {
    const manager = actorFrom(await repositories.users.insert(userFixture()));
    const employee = await repositories.employees.insert(employeeFixture());
    const accounts = await Promise.all([repositories.users.insert(userFixture()), repositories.users.insert(userFixture())]);
    const useCases = useCasesFor();
    const results = await Promise.allSettled(
      accounts.map((account) => useCases.accounts.linkEmployee(manager, account.id, { employeeId: employee.id })),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.user.count({ where: { employeeId: employee.id } })).toBe(1);
  });
});

describe("un solo préstamo activo por equipo", () => {
  it("la DB rechaza un segundo préstamo Activo y acepta uno nuevo tras la devolución", async () => {
    const { manager, employee, equipment } = await loanParties();
    const parties = { employeeId: employee.id, equipmentId: equipment.id, registeredById: manager.id };
    const first = await repositories.loans.insert(loanFixture(parties));
    await expectDomainError(repositories.loans.insert(loanFixture(parties)), { code: DomainErrorCode.Conflict, fields: { equipmentId: expect.any(String) } });

    await repositories.loans.markReturned(first.id, "2026-10-05", manager.id);
    await repositories.loans.insert(loanFixture(parties));
    expect(await repositories.loans.list({ status: LoanStatus.Active })).toHaveLength(1);
  });

  it("dos préstamos simultáneos del mismo equipo: solo uno se crea", async () => {
    const { manager, employee, equipment } = await loanParties();
    const useCases = createUseCases({ uow, clock: createFakeClock(), passwordHasher: createFakePasswordHasher(), notifier: createRecordingNotifier() });
    const actor = actorFrom(manager);
    const input = { employeeId: employee.id, equipmentId: equipment.id, dueOn: "2026-10-20" };
    const results = await Promise.allSettled([useCases.loans.createLoan(actor, input), useCases.loans.createLoan(actor, input)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.loan.count()).toBe(1);
    expect((await repositories.equipment.findById(equipment.id))?.status).toBe(EquipmentStatus.Loaned);
  });
});

describe("CHECK", () => {
  async function insertRaw(values: { loanDate: string; expected: string; actual: string | null; status: string }) {
    const { manager, employee, equipment } = await loanParties();
    return prisma.$executeRaw`INSERT INTO loans (id, employee_id, device_id, registered_by_id, loan_date, expected_return_date, actual_return_date, status)
      VALUES (UUID(), ${employee.id}, ${equipment.id}, ${manager.id}, ${values.loanDate}, ${values.expected}, ${values.actual}, ${values.status})`;
  }

  it("rechaza fecha prevista anterior al préstamo", async () => {
    await expect(insertRaw({ loanDate: "2026-10-05", expected: "2026-10-04", actual: null, status: "Activo" })).rejects.toThrow(/ck_loans_expected_return_date/);
  });

  it("rechaza fecha real anterior al préstamo", async () => {
    await expect(insertRaw({ loanDate: "2026-10-05", expected: "2026-10-10", actual: "2026-10-01", status: "Devuelto" })).rejects.toThrow(/ck_loans_actual_return_date/);
  });

  it("exige fecha real si y solo si está Devuelto", async () => {
    await expect(insertRaw({ loanDate: "2026-10-05", expected: "2026-10-10", actual: null, status: "Devuelto" })).rejects.toThrow(/ck_loans_returned_state/);
    await truncate(prisma);
    await expect(insertRaw({ loanDate: "2026-10-05", expected: "2026-10-10", actual: "2026-10-06", status: "Activo" })).rejects.toThrow(/ck_loans_returned_state/);
  });

  it("rechaza estados fuera del catálogo", async () => {
    await expect(insertRaw({ loanDate: "2026-10-05", expected: "2026-10-10", actual: null, status: "Vencido" })).rejects.toThrow(/ck_loans_status/);
    await expect(prisma.device.create({ data: { ...equipmentFixture(), status: "Roto", createdAt: undefined } })).rejects.toThrow(/ck_devices_status/);
  });
});

describe("transacciones", () => {
  it("revierte todo si el trabajo falla", async () => {
    let insertedId = "";
    await expect(
      uow.transaction(async (repos) => {
        insertedId = (await repos.equipment.insert(equipmentFixture())).id;
        throw new Error("falla a mitad");
      }),
    ).rejects.toThrow("falla a mitad");
    expect(insertedId).toMatch(UUID_V7);
    expect(await repositories.equipment.findById(insertedId)).toBeNull();
  });
});

describe("tamaños de columna", () => {
  it("acepta equipos con los largos máximos que permite la validación", async () => {
    const equipment = await repositories.equipment.insert(
      equipmentFixture({ code: "X".repeat(40), name: "N".repeat(120), brand: "B".repeat(80), model: "M".repeat(80) }),
    );
    expect(await repositories.equipment.findById(equipment.id)).toMatchObject({
      code: "X".repeat(40),
      name: "N".repeat(120),
      brand: "B".repeat(80),
      model: "M".repeat(80),
    });
  });
});
