import { describe, expect, it } from "vitest";
import { hashSessionToken } from "../../src/business/rules/security.js";
import { expectDomainError } from "../support/expect-domain-error.js";
import { DEMO_PASSWORD, setup } from "../support/setup.js";

describe("cuentas", () => {
  it("lista las cuentas sin exponer el hash de la contraseña", async () => {
    const { useCases, manager } = setup();
    const accounts = await useCases.accounts.listAccounts(manager);
    expect(accounts).toHaveLength(2);
    expect(accounts.some((account) => "passwordHash" in account)).toBe(false);
  });

  it("invita una cuenta vinculada a un empleado y toma su nombre", async () => {
    const { useCases, manager, addEmployee, notifier } = setup();
    const marta = addEmployee({ firstName: "Marta", lastName: "López" });
    const invited = await useCases.accounts.inviteAccount(manager, {
      email: "Marta.Lopez@empresa.com",
      role: "Empleado",
      employeeId: marta.id,
    });
    expect(invited).toMatchObject({
      name: "Marta López",
      email: "marta.lopez@empresa.com",
      role: "Empleado",
      status: "Invitado",
      employeeId: marta.id,
    });
    expect(notifier.events).toEqual([{ type: "invitation", user: invited }]);
  });

  it("invita una cuenta sin empleado usando el correo como nombre", async () => {
    const { useCases, manager } = setup();
    const invited = await useCases.accounts.inviteAccount(manager, {
      email: "soporte@empresa.com",
      role: "Encargado",
      employeeId: "",
    });
    expect(invited).toMatchObject({ name: "soporte@empresa.com", employeeId: null, role: "Encargado" });
  });

  it("rechaza correos repetidos y empleados inactivos, inexistentes o ya vinculados", async () => {
    const { useCases, manager, ana, addEmployee } = setup();
    await expectDomainError(
      useCases.accounts.inviteAccount(manager, { email: "ana.garcia@empresa.com", role: "Empleado" }),
      { code: "CONFLICT", fields: { email: "Ya existe una cuenta con este correo." } },
    );
    const field = { employeeId: "Selecciona un empleado activo sin cuenta vinculada." };
    await expectDomainError(
      useCases.accounts.inviteAccount(manager, { email: "n1@empresa.com", role: "Empleado", employeeId: ana.id }),
      { code: "CONFLICT", fields: field },
    );
    const inactive = addEmployee({ active: false });
    await expectDomainError(
      useCases.accounts.inviteAccount(manager, { email: "n2@empresa.com", role: "Empleado", employeeId: inactive.id }),
      { code: "CONFLICT", fields: field },
    );
    await expectDomainError(
      useCases.accounts.inviteAccount(manager, { email: "n3@empresa.com", role: "Empleado", employeeId: "no-existe" }),
      { code: "NOT_FOUND", fields: field },
    );
  });

  it("dos invitaciones simultáneas para el mismo empleado: solo una pasa", async () => {
    const { useCases, manager, addEmployee, uow } = setup();
    const marta = addEmployee({ firstName: "Marta", lastName: "López" });
    const results = await Promise.allSettled([
      useCases.accounts.inviteAccount(manager, { email: "m1@empresa.com", role: "Empleado", employeeId: marta.id }),
      useCases.accounts.inviteAccount(manager, { email: "m2@empresa.com", role: "Empleado", employeeId: marta.id }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect([...uow.store.users.values()].filter((user) => user.employeeId === marta.id)).toHaveLength(1);
  });

  it("si otra cuenta vincula al empleado justo antes del insert, responde CONFLICT", async () => {
    const { useCases, manager, addEmployee, addUser, uow } = setup();
    const marta = addEmployee({ firstName: "Marta", lastName: "López" });
    // Simula otra transacción que confirma entre la verificación y el insert:
    // la restricción única de la DB es la que detiene esta invitación.
    uow.beforeWrite = (operation) => {
      if (operation === "users.insert") addUser({ email: "otra@empresa.com", employeeId: marta.id });
    };
    await expectDomainError(
      useCases.accounts.inviteAccount(manager, { email: "m1@empresa.com", role: "Empleado", employeeId: marta.id }),
      { code: "CONFLICT", fields: { employeeId: expect.any(String) } },
    );
  });

  it("desactiva la cuenta, su empleado y todas sus sesiones", async () => {
    const { useCases, manager, employeeUser, ana, uow } = setup();
    const { token } = await useCases.auth.login({ email: employeeUser.email, password: DEMO_PASSWORD });
    const deactivated = await useCases.accounts.deactivateAccount(manager, employeeUser.id);
    expect(deactivated.status).toBe("Inactivo");
    expect(uow.store.users.get(employeeUser.id)?.status).toBe("Inactivo");
    expect(uow.store.employees.get(ana.id)?.active).toBe(false);
    expect(uow.store.sessions.has(hashSessionToken(token))).toBe(false);
  });

  it("no desactiva si el empleado tiene préstamos activos", async () => {
    const { useCases, manager, employeeUser, ana, addEquipment, addLoan, uow } = setup();
    addLoan({ employeeId: ana.id, equipmentId: addEquipment().id });
    await expectDomainError(useCases.accounts.deactivateAccount(manager, employeeUser.id), {
      code: "CONFLICT",
      message:
        "No se puede desactivar: el empleado tiene préstamos activos. Registra la devolución primero.",
    });
    expect(uow.store.users.get(employeeUser.id)?.status).toBe("Activo");
  });

  it("una baja y un préstamo simultáneos no dejan un empleado inactivo con préstamo activo", async () => {
    const { useCases, manager, employeeUser, ana, addEquipment, uow } = setup();
    const laptop = addEquipment();
    await Promise.allSettled([
      useCases.accounts.deactivateAccount(manager, employeeUser.id),
      useCases.loans.createLoan(manager, { employeeId: ana.id, equipmentId: laptop.id, dueOn: "2026-10-20" }),
    ]);
    const activeLoans = [...uow.store.loans.values()].filter(
      (loan) => loan.employeeId === ana.id && loan.status === "Activo",
    );
    expect(uow.store.employees.get(ana.id)?.active === false && activeLoans.length > 0).toBe(false);
  });

  it("no permite desactivar la propia cuenta, una inexistente o una ya inactiva", async () => {
    const { useCases, manager, addUser } = setup();
    await expectDomainError(useCases.accounts.deactivateAccount(manager, manager.userId), {
      code: "CONFLICT",
      message: "No puedes desactivar tu propia cuenta.",
    });
    await expectDomainError(useCases.accounts.deactivateAccount(manager, "no-existe"), {
      code: "NOT_FOUND",
    });
    const inactive = addUser({ status: "Inactivo" });
    await expectDomainError(useCases.accounts.deactivateAccount(manager, inactive.id), {
      code: "CONFLICT",
      message: "La cuenta ya está inactiva.",
    });
  });

  it("solo el Encargado gestiona cuentas", async () => {
    const { useCases, employee, managerUser } = setup();
    await expectDomainError(useCases.accounts.listAccounts(employee), { code: "FORBIDDEN" });
    await expectDomainError(
      useCases.accounts.inviteAccount(employee, { email: "x@empresa.com", role: "Encargado" }),
      { code: "FORBIDDEN" },
    );
    await expectDomainError(useCases.accounts.deactivateAccount(employee, managerUser.id), {
      code: "FORBIDDEN",
    });
  });
});

describe("dashboard", () => {
  const scenario = () => {
    const context = setup();
    const { ana, addEmployee, addEquipment, addLoan } = context;
    const carlos = addEmployee({ firstName: "Carlos", lastName: "Ruiz" });
    addEquipment({ type: "Monitor" });
    const overdue = addLoan({ employeeId: ana.id, equipmentId: addEquipment().id, dueOn: "2026-10-05", borrowedOn: "2026-09-20" });
    const dueSoon = addLoan({ employeeId: carlos.id, equipmentId: addEquipment().id, dueOn: "2026-10-08", borrowedOn: "2026-10-06" });
    addLoan({ employeeId: ana.id, equipmentId: addEquipment({ type: "Tablet" }).id, dueOn: "2026-10-30", borrowedOn: "2026-10-03" });
    const returned = addLoan({
      employeeId: carlos.id,
      equipmentId: addEquipment({ type: "Monitor" }).id,
      borrowedOn: "2026-09-01",
      dueOn: "2026-09-15",
      status: "Devuelto",
      returnedOn: "2026-10-07",
    });
    return { ...context, overdue, dueSoon, returned };
  };

  it("el Encargado ve indicadores del inventario y de todos los préstamos", async () => {
    const { useCases, manager, overdue, dueSoon, returned } = scenario();
    const dashboard = await useCases.dashboard.getDashboard(manager);
    if (dashboard.role !== "Encargado") throw new Error("Se esperaba el dashboard del Encargado");
    expect(dashboard.equipment).toEqual({ total: 5, available: 2, loaned: 3 });
    expect(dashboard.distribution).toEqual([
      { type: "Laptop", count: 2 },
      { type: "Monitor", count: 2 },
      { type: "Periférico", count: 0 },
      { type: "Tablet", count: 1 },
    ]);
    expect(dashboard).toMatchObject({ activeLoans: 3, overdue: 1, dueSoon: 1 });
    expect(dashboard.pending.map((loan) => loan.id)).toEqual([overdue.id, dueSoon.id]);
    expect(dashboard.recent[0]?.id).toBe(returned.id);
    expect(dashboard.recent[1]?.id).toBe(dueSoon.id);
  });

  it("el Empleado solo ve sus préstamos, sin indicadores del inventario", async () => {
    const { useCases, employee, overdue } = scenario();
    const dashboard = await useCases.dashboard.getDashboard(employee);
    expect(dashboard.role).toBe("Empleado");
    expect("equipment" in dashboard).toBe(false);
    expect(dashboard).toMatchObject({ activeLoans: 2, overdue: 1, dueSoon: 0 });
    expect(dashboard.pending.map((loan) => loan.id)).toEqual([overdue.id]);
    expect(dashboard.recent.every((loan) => loan.employeeName === "Ana García")).toBe(true);
  });

  it("muestra como mucho 5 movimientos recientes", async () => {
    const { useCases, manager, ana, addEquipment, addLoan } = setup();
    for (let day = 1; day <= 7; day++)
      addLoan({
        employeeId: ana.id,
        equipmentId: addEquipment().id,
        borrowedOn: `2026-10-0${day}`,
        dueOn: "2026-10-30",
      });
    const dashboard = await useCases.dashboard.getDashboard(manager);
    expect(dashboard.recent.map((loan) => loan.borrowedOn)).toEqual([
      "2026-10-07",
      "2026-10-06",
      "2026-10-05",
      "2026-10-04",
      "2026-10-03",
    ]);
  });
});
