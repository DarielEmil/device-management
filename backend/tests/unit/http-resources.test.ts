import { describe, expect, it } from "vitest";
import { EquipmentStatus } from "../../src/business/entities/equipment.entity.js";
import { contract, expectContract } from "../support/frontend-contract.js";
import { ORIGIN, setupHttp } from "../support/http.js";
import { TODAY } from "../support/setup.js";

const PROTECTED = [
  ["get", "/api/equipment"],
  ["post", "/api/equipment"],
  ["get", "/api/employees"],
  ["post", "/api/employees"],
  ["get", "/api/loans"],
  ["post", "/api/loans"],
  ["post", "/api/loans/x/return"],
  ["get", "/api/accounts"],
  ["post", "/api/invitations"],
  ["post", "/api/accounts/x/deactivate"],
  ["get", "/api/dashboard"],
] as const;

describe("HTTP: autenticación y RBAC", () => {
  it.each(PROTECTED)("%s %s sin sesión → 401", async (method, path) => {
    const { http } = setupHttp();
    const response = await http()[method](path).set("Origin", ORIGIN);
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Inicia sesión para continuar.", fields: {} });
  });

  it.each([
    ["post", "/api/equipment"],
    ["get", "/api/employees"],
    ["post", "/api/employees"],
    ["post", "/api/loans"],
    ["post", "/api/loans/x/return"],
    ["get", "/api/accounts"],
    ["post", "/api/invitations"],
    ["post", "/api/accounts/x/deactivate"],
  ] as const)("el Empleado en %s %s → 403", async (method, path) => {
    const { asEmployee } = setupHttp();
    const browser = await asEmployee();
    const response = await browser[method](path);
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: "No tienes permiso para realizar esta acción.", fields: {} });
  });

  it("el Empleado solo ve los equipos disponibles", async () => {
    const { asEmployee, addEquipment } = setupHttp();
    const available = addEquipment();
    addEquipment({ status: EquipmentStatus.Loaned });
    const browser = await asEmployee();
    const body = expectContract(contract.equipmentList, (await browser.get("/api/equipment")).body);
    expect(body.data.map((item) => item.id)).toEqual([available.id]);
  });
});

describe("HTTP: errores", () => {
  it("JSON inválido → 422", async () => {
    const { asManager } = setupHttp();
    const browser = await asManager();
    const response = await browser
      .post("/api/equipment")
      .set("Content-Type", "application/json")
      .send('{"code": ');
    expect(response.status).toBe(422);
    expect(response.body).toEqual({ message: "Revisa los campos indicados.", fields: {} });
  });

  it("un cuerpo que no es un objeto → 422", async () => {
    const { asManager } = setupHttp();
    const browser = await asManager();
    const response = await browser.post("/api/equipment").set("Content-Type", "application/json").send("[1]");
    expect(response.status).toBe(422);
    expect(response.body.message).toBe("Revisa los campos indicados.");
  });

  it("tipos incorrectos en el DTO → 422 con fields", async () => {
    const { asManager } = setupHttp();
    const browser = await asManager();
    const response = await browser.post("/api/equipment", { code: 123, name: ["x"], type: "Laptop" });
    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      message: "Revisa los campos indicados.",
      fields: { code: "Valor no válido.", name: "Valor no válido." },
    });
  });

  it("campos vacíos → 422 con los mensajes en español de negocio", async () => {
    const { asManager } = setupHttp();
    const browser = await asManager();
    const response = await browser.post("/api/equipment", {});
    expect(response.status).toBe(422);
    expect(response.body.fields).toEqual({
      code: "El código es obligatorio.",
      name: "El nombre es obligatorio.",
      type: "Selecciona un tipo de equipo.",
    });
  });

  it("un filtro de estado desconocido → 422", async () => {
    const { asManager } = setupHttp();
    const browser = await asManager();
    const response = await browser.get("/api/equipment?status=perdido");
    expect(response.status).toBe(422);
    expect(response.body.fields).toEqual({ status: "Valor no válido." });
  });

  it("duplicado → 409 y recurso inexistente → 404", async () => {
    const { asManager, addEquipment } = setupHttp();
    const existing = addEquipment();
    const browser = await asManager();
    const duplicate = await browser.post("/api/equipment", { code: existing.code, name: "Otro", type: "Laptop" });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.fields).toEqual({ code: "Ya existe un equipo con ese código de activo." });

    const missing = await browser.post("/api/loans/no-existe/return");
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ message: "El préstamo no existe.", fields: {} });
  });

  it("un error inesperado → 500 genérico y el detalle solo en el log", async () => {
    const { asManager, uow, logger } = setupHttp();
    const browser = await asManager();
    uow.beforeWrite = () => {
      throw new Error("detalle interno de la base de datos");
    };
    const response = await browser.post("/api/equipment", { code: "LAP-900", name: "Equipo", type: "Laptop" });
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Ocurrió un error inesperado. Inténtalo de nuevo.", fields: {} });
    expect(JSON.stringify(response.body)).not.toContain("detalle interno");
    expect(logger.error).toHaveBeenCalledOnce();
  });
});

describe("HTTP: equipos y empleados", () => {
  it("CU-01 y CU-02: registra y lista con el contrato del frontend", async () => {
    const { asManager } = setupHttp();
    const browser = await asManager();

    const equipment = await browser.post("/api/equipment", {
      code: "mon-010",
      name: "Dell UltraSharp 27",
      type: "monitor",
      brand: "Dell",
    });
    expect(equipment.status).toBe(201);
    expect(expectContract(contract.equipment, equipment.body).data).toMatchObject({
      code: "MON-010",
      type: "Monitor",
      brand: "Dell",
      model: "",
      status: "available",
    });
    expect(equipment.body.data).not.toHaveProperty("createdAt");

    const employee = await browser.post("/api/employees", {
      firstName: "Diego",
      lastName: "Torres",
      identity: "001-1234567-8",
      department: "Ventas",
    });
    expect(employee.status).toBe(201);
    expect(expectContract(contract.employee, employee.body).data).toMatchObject({
      firstName: "Diego",
      phone: "",
      active: true,
    });

    expectContract(contract.equipmentList, (await browser.get("/api/equipment")).body);
    const employees = expectContract(contract.employeeList, (await browser.get("/api/employees")).body);
    expect(employees.data.map((item) => item.firstName)).toContain("Diego");
  });
});

describe("HTTP: préstamo y devolución (CU-03, CU-04, CU-06)", () => {
  it("presta, lista, devuelve y rechaza una segunda devolución", async () => {
    const { asManager, asEmployee, addEquipment, ana } = setupHttp();
    const laptop = addEquipment();
    const manager = await asManager();

    const created = await manager.post("/api/loans", {
      employeeId: ana.id,
      equipmentId: laptop.id,
      dueOn: "2026-10-09",
    });
    expect(created.status).toBe(201);
    const loan = expectContract(contract.loan, created.body).data;
    expect(created.body.data).toMatchObject({
      borrowedOn: TODAY,
      dueOn: "2026-10-09",
      returnedOn: null,
      status: "due_soon",
      equipmentCode: laptop.code,
      employeeName: "Ana García",
    });

    const equipment = expectContract(contract.equipmentList, (await manager.get("/api/equipment")).body);
    expect(equipment.data.find((item) => item.id === laptop.id)?.status).toBe("loaned");

    const again = await manager.post("/api/loans", { employeeId: ana.id, equipmentId: laptop.id, dueOn: "2026-10-09" });
    expect(again.status).toBe(409);
    expect(again.body.fields).toEqual({ equipmentId: "El equipo seleccionado no está disponible." });

    const dueSoon = await manager.get("/api/loans?status=due_soon");
    expect(expectContract(contract.loanList, dueSoon.body).data.map((item) => item.id)).toEqual([loan.id]);
    expect((await manager.get("/api/loans?status=overdue")).body).toEqual({ data: [] });

    // El Empleado vinculado a Ana ve su préstamo.
    const employee = await asEmployee();
    expect((await employee.get("/api/loans")).body.data).toHaveLength(1);

    const returned = await manager.post(`/api/loans/${loan.id}/return`);
    expect(returned.status).toBe(200);
    expect(expectContract(contract.loan, returned.body).data).toMatchObject({
      returnedOn: TODAY,
    });
    expect(returned.body.data.status).toBe("returned");

    const twice = await manager.post(`/api/loans/${loan.id}/return`);
    expect(twice.status).toBe(409);
    expect(twice.body.message).toBe("Este préstamo ya fue devuelto.");

    const available = await manager.get("/api/equipment?status=available");
    expect(available.body.data.map((item: { id: string }) => item.id)).toContain(laptop.id);
  });

  it("una fecha prevista inválida → 422 con el campo", async () => {
    const { asManager, addEquipment, ana } = setupHttp();
    const laptop = addEquipment();
    const manager = await asManager();
    const response = await manager.post("/api/loans", { employeeId: ana.id, equipmentId: laptop.id, dueOn: "2026-10-01" });
    expect(response.status).toBe(422);
    expect(response.body.fields).toEqual({ dueOn: "La fecha prevista no puede ser anterior a hoy." });
  });
});

describe("HTTP: cuentas e invitaciones", () => {
  it("lista, invita y desactiva; no permite desactivarse a sí mismo", async () => {
    const { asManager, managerUser, notifier } = setupHttp();
    const manager = await asManager();

    const accounts = expectContract(contract.accountList, (await manager.get("/api/accounts")).body);
    expect(accounts.data).toHaveLength(2);
    expect(JSON.stringify(accounts)).not.toContain("hashed:");

    const invited = await manager.post("/api/invitations", { email: "nuevo@empresa.com", role: "employee", employeeId: null });
    expect(invited.status).toBe(201);
    const account = expectContract(contract.account, invited.body).data;
    expect(account).toMatchObject({ email: "nuevo@empresa.com", role: "employee", status: "invited" });
    expect(notifier.events.map((event) => event.type)).toEqual(["invitation"]);

    const deactivated = await manager.post(`/api/accounts/${account.id}/deactivate`);
    expect(deactivated.status).toBe(200);
    expect(expectContract(contract.account, deactivated.body).data.status).toBe("inactive");

    const self = await manager.post(`/api/accounts/${managerUser.id}/deactivate`);
    expect(self.status).toBe(409);
    expect(self.body.message).toBe("No puedes desactivar tu propia cuenta.");

    const badRole = await manager.post("/api/invitations", { email: "x@empresa.com", role: "admin" });
    expect(badRole.status).toBe(422);
    expect(badRole.body.fields).toEqual({ role: "Selecciona un rol." });
  });
});

describe("HTTP: dashboard", () => {
  it("el Encargado recibe los indicadores del inventario y el Empleado no", async () => {
    const { asManager, asEmployee, addEquipment, addLoan, ana } = setupHttp();
    const laptop = addEquipment();
    addEquipment({ type: "Monitor" });
    addLoan({ employeeId: ana.id, equipmentId: laptop.id, dueOn: "2026-10-05" });

    const manager = (await (await asManager()).get("/api/dashboard")).body.data;
    expect(manager).toMatchObject({
      role: "manager",
      activeLoans: 1,
      overdue: 1,
      equipment: { total: 2, available: 1, loaned: 1 },
    });
    expect(manager.pending[0]).toMatchObject({ status: "overdue", equipmentCode: laptop.code });
    expect(manager.pending[0]).not.toHaveProperty("registeredById");

    const employee = (await (await asEmployee()).get("/api/dashboard")).body.data;
    expect(employee).toMatchObject({ role: "employee", activeLoans: 1 });
    expect(employee).not.toHaveProperty("equipment");
  });
});
