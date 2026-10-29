import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createSystemClock } from "../../src/business/rules/clock.rules.js";
import { createScryptPasswordHasher } from "../../src/business/rules/security.rules.js";
import { createApp } from "../../src/app.js";
import { createContainer } from "../../src/container.js";
import { contract, expectContract } from "../support/frontend-contract.js";
import { ORIGIN, sessionCookie, tokenOf } from "../support/http.js";
import { connect, employeeFixture, equipmentFixture, truncate, userFixture } from "./support.js";
import { testDatabaseUrl } from "./test-database.js";

// Humo: la composición real (container.ts) sobre la base de tests, con HTTP de punta a punta.
const { prisma, repositories } = connect();
const container = createContainer({ databaseUrl: testDatabaseUrl() });
const app = createApp({ useCases: container.useCases, corsOrigins: [ORIGIN], cookieSecure: false });

beforeEach(() => truncate(prisma));
afterAll(async () => {
  await container.close();
  await prisma.$disconnect();
});

const PASSWORD = "Demo2026!";

describe("HTTP contra MySQL", () => {
  it("login, lista equipos, presta y devuelve", async () => {
    const manager = await repositories.users.insert(
      userFixture({ email: "laura.mendez@empresa.com", passwordHash: await createScryptPasswordHasher().hash(PASSWORD) }),
    );
    const employee = await repositories.employees.insert(employeeFixture());
    const laptop = await repositories.equipment.insert(equipmentFixture());

    const login = await request(app)
      .post("/api/auth/login")
      .set("Origin", ORIGIN)
      .send({ email: manager.email, password: PASSWORD });
    expect(login.status).toBe(200);
    expect(expectContract(contract.session, login.body).data?.account.id).toBe(manager.id);
    const cookie = `dm_session=${tokenOf(sessionCookie(login.headers["set-cookie"]))}`;
    const get = (path: string) => request(app).get(path).set("Cookie", cookie);
    const post = (path: string, body?: object) =>
      request(app).post(path).set("Cookie", cookie).set("Origin", ORIGIN).send(body);

    const equipment = expectContract(contract.equipmentList, (await get("/api/equipment")).body);
    expect(equipment.data.map((item) => item.id)).toEqual([laptop.id]);

    const created = await post("/api/loans", {
      employeeId: employee.id,
      equipmentId: laptop.id,
      dueOn: createSystemClock().today(),
    });
    expect(created.status).toBe(201);
    const loan = expectContract(contract.loan, created.body).data;
    expect(created.body.data.status).toBe("due_soon");
    expect((await get("/api/equipment?status=loaned")).body.data).toHaveLength(1);

    const returned = await post(`/api/loans/${loan.id}/return`);
    expect(returned.status).toBe(200);
    expect(returned.body.data).toMatchObject({ id: loan.id, status: "returned" });
    expect((await repositories.equipment.findById(laptop.id))?.status).toBe("available");

    expect((await post("/api/auth/logout")).status).toBe(204);
    expect((await get("/api/auth/session")).status).toBe(401);
  });
});
