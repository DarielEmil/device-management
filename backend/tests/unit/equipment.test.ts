import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { createEquipmentUseCases } from "../../src/business/use-cases/equipment.js";
import { createInMemoryEquipmentRepository } from "../../src/db/repositories/in-memory-equipment-repository.js";
import { uuidv7 } from "../../src/business/rules/id.js";
import { normalizeEquipmentType } from "../../src/business/rules/equipment.js";

const makeApp = () =>
  createApp(
    { equipment: createEquipmentUseCases(createInMemoryEquipmentRepository()) },
    "http://localhost:3000",
  );
const laptop = { code: "LAP-001", name: "MacBook Pro", type: "laptop ", brand: "Apple", model: "M3" };

describe("rules", () => {
  it("normaliza el tipo de equipo", () => {
    expect(normalizeEquipmentType("  laPTOP ")).toBe("Laptop");
  });
  it("genera UUID v7 ordenables", () => {
    const a = uuidv7(1_000);
    const b = uuidv7(2_000);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(a < b).toBe(true);
  });
});

describe("equipment API", () => {
  it("responde health", async () => {
    const res = await request(makeApp()).get("/api/health");
    expect(res.body).toEqual({ data: { status: "ok" } });
  });

  it("CU-01 registra un equipo Disponible con tipo normalizado", async () => {
    const res = await request(makeApp()).post("/api/equipment").send(laptop);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ code: "LAP-001", type: "Laptop", status: "Disponible" });
  });

  it("CU-01 3a rechaza datos incompletos", async () => {
    const res = await request(makeApp()).post("/api/equipment").send({ code: "" });
    expect(res.status).toBe(422);
    expect(res.body.error.fields).toHaveProperty("code");
    expect(res.body.error.fields).toHaveProperty("name");
  });

  it("CU-01 3b rechaza código duplicado", async () => {
    const app = makeApp();
    await request(app).post("/api/equipment").send(laptop);
    const res = await request(app).post("/api/equipment").send(laptop);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe("Ya existe un equipo con ese código.");
  });

  it("CU-05 lista y filtra por estado", async () => {
    const app = makeApp();
    await request(app).post("/api/equipment").send(laptop);
    expect((await request(app).get("/api/equipment?status=Disponible")).body.data).toHaveLength(1);
    expect((await request(app).get("/api/equipment?status=Prestado")).body.data).toHaveLength(0);
  });

  it("devuelve 404 en rutas desconocidas", async () => {
    expect((await request(makeApp()).get("/api/nada")).status).toBe(404);
  });
});
