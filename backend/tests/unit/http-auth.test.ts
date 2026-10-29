import { describe, expect, it } from "vitest";
import { UserStatus } from "../../src/business/entities/user.entity.js";
import { hashSessionToken } from "../../src/business/rules/security.rules.js";
import { contract, expectContract } from "../support/frontend-contract.js";
import { ORIGIN, sessionCookie, setupHttp, tokenOf } from "../support/http.js";
import { DEMO_PASSWORD } from "../support/setup.js";

const MINUTE = 60_000;

describe("HTTP: salud y rutas desconocidas", () => {
  it("GET /api/health responde sin sesión", async () => {
    const { http } = setupHttp();
    const response = await http().get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { status: "ok" } });
  });

  it("una ruta desconocida responde 404 con { message, fields }", async () => {
    const { http } = setupHttp();
    const response = await http().get("/api/no-existe");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "El recurso solicitado no existe.", fields: {} });
  });
});

describe("HTTP: login y cookie de sesión", () => {
  it("crea la cookie HttpOnly, SameSite=Lax, Path=/api con la expiración de la sesión", async () => {
    const { http, uow, managerUser } = setupHttp();
    const response = await http()
      .post("/api/auth/login")
      .set("Origin", ORIGIN)
      .send({ email: managerUser.email, password: DEMO_PASSWORD });

    expect(response.status).toBe(200);
    const body = expectContract(contract.session, response.body);
    expect(body.data?.account).toEqual({
      id: managerUser.id,
      name: "Laura Méndez",
      email: managerUser.email,
      role: "manager",
      status: "active",
      employeeId: null,
    });
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");

    const cookie = sessionCookie(response.headers["set-cookie"]);
    expect(cookie).toBeDefined();
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/api");
    // Reloj falso: 12:00 UTC + 30 min de inactividad.
    expect(cookie).toContain("Expires=Wed, 07 Oct 2026 12:30:00 GMT");
    expect(cookie).not.toContain("Secure");
    expect(uow.store.sessions.has(hashSessionToken(tokenOf(cookie)))).toBe(true);
  });

  it("marca la cookie Secure cuando se configura", async () => {
    const { http, managerUser } = setupHttp({ cookieSecure: true });
    const response = await http()
      .post("/api/auth/login")
      .set("Origin", ORIGIN)
      .send({ email: managerUser.email, password: DEMO_PASSWORD });
    expect(sessionCookie(response.headers["set-cookie"])).toContain("Secure");
  });

  it("credenciales incorrectas → 401 con el mensaje en el campo y sin cookie", async () => {
    const { http, managerUser } = setupHttp();
    const response = await http()
      .post("/api/auth/login")
      .set("Origin", ORIGIN)
      .send({ email: managerUser.email, password: "otra-clave" });
    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "Correo o contraseña incorrectos.",
      fields: { password: "Correo o contraseña incorrectos." },
    });
    expect(sessionCookie(response.headers["set-cookie"])).toBeUndefined();
  });

  it("campos vacíos o ausentes → 422 con los mensajes de negocio", async () => {
    const { http } = setupHttp();
    const response = await http().post("/api/auth/login").set("Origin", ORIGIN).send({});
    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      message: "Revisa los campos indicados.",
      fields: {
        email: "Introduce un correo válido.",
        password: "La contraseña es obligatoria.",
      },
    });
  });

  it("un nuevo login desde el mismo navegador invalida la sesión anterior", async () => {
    const { http, uow, managerUser } = setupHttp();
    const login = (cookie?: string) => {
      const pending = http().post("/api/auth/login").set("Origin", ORIGIN);
      if (cookie) pending.set("Cookie", cookie.split(";")[0] ?? "");
      return pending.send({ email: managerUser.email, password: DEMO_PASSWORD });
    };
    const first = sessionCookie((await login()).headers["set-cookie"]);
    const second = sessionCookie((await login(first)).headers["set-cookie"]);
    expect(tokenOf(second)).not.toBe(tokenOf(first));
    expect(uow.store.sessions.has(hashSessionToken(tokenOf(first)))).toBe(false);
    expect(uow.store.sessions.has(hashSessionToken(tokenOf(second)))).toBe(true);
  });
});

describe("HTTP: sesión actual", () => {
  it("sin cookie → 401", async () => {
    const { http } = setupHttp();
    const response = await http().get("/api/auth/session");
    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Inicia sesión para continuar.");
  });

  it("con cookie → la cuenta, y renueva la cookie cuando negocio desliza la expiración", async () => {
    const { asEmployee, clock, employeeUser } = setupHttp();
    const browser = await asEmployee();
    clock.advance(10 * MINUTE);

    const response = await browser.get("/api/auth/session");
    expect(response.status).toBe(200);
    const body = expectContract(contract.session, response.body);
    expect(body.data?.account.id).toBe(employeeUser.id);
    expect(sessionCookie(response.headers["set-cookie"])).toContain(
      "Expires=Wed, 07 Oct 2026 12:40:00 GMT",
    );
  });

  it("una sesión vencida → 401 y borra la cookie", async () => {
    const { asEmployee, clock } = setupHttp();
    const browser = await asEmployee();
    clock.advance(31 * MINUTE);
    const response = await browser.get("/api/auth/session");
    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Tu sesión expiró. Inicia sesión de nuevo.");
    expect(sessionCookie(response.headers["set-cookie"])).toContain("Expires=Thu, 01 Jan 1970");
  });
});

describe("HTTP: registro, logout y recuperación", () => {
  it("POST /auth/register → 201, cuenta Empleado y cookie", async () => {
    const { http } = setupHttp();
    const response = await http()
      .post("/api/auth/register")
      .set("Origin", ORIGIN)
      .send({ name: "Diego Torres", email: "diego.torres@empresa.com", password: "secreta123" });
    expect(response.status).toBe(201);
    const body = expectContract(contract.session, response.body);
    expect(body.data?.account).toMatchObject({ role: "employee", status: "active", employeeId: null });
    expect(sessionCookie(response.headers["set-cookie"])).toContain("HttpOnly");
  });

  it("un correo ya registrado → 409", async () => {
    const { http, employeeUser } = setupHttp();
    const response = await http()
      .post("/api/auth/register")
      .set("Origin", ORIGIN)
      .send({ name: "Otra", email: employeeUser.email, password: "secreta123" });
    expect(response.status).toBe(409);
    expect(response.body.fields).toEqual({ email: "Ya existe una cuenta con este correo." });
  });

  it("logout → 204, borra la cookie y elimina la sesión", async () => {
    const { asManager, uow } = setupHttp();
    const browser = await asManager();
    expect(uow.store.sessions.size).toBe(1);

    const response = await browser.post("/api/auth/logout");
    expect(response.status).toBe(204);
    expect(sessionCookie(response.headers["set-cookie"])).toMatch(
      /^dm_session=;.*Path=\/api; Expires=Thu, 01 Jan 1970.*HttpOnly.*SameSite=Lax/,
    );
    expect(uow.store.sessions.size).toBe(0);
    expect((await browser.get("/api/auth/session")).status).toBe(401);
  });

  it("POST /auth/recover → 204 exista o no el correo", async () => {
    const { http, notifier, employeeUser } = setupHttp();
    for (const email of [employeeUser.email, "nadie@empresa.com"]) {
      const response = await http().post("/api/auth/recover").set("Origin", ORIGIN).send({ email });
      expect(response.status).toBe(204);
      expect(response.text).toBe("");
    }
    expect(notifier.events).toEqual([{ type: "recovery", user: expect.objectContaining({ id: employeeUser.id }) }]);
  });

  it("una cuenta desactivada pierde la sesión", async () => {
    const { asEmployee, asManager, employeeUser, uow } = setupHttp();
    const employee = await asEmployee();
    const manager = await asManager();
    const response = await manager.post(`/api/accounts/${employeeUser.id}/deactivate`);
    expect(response.status).toBe(200);
    expect(uow.store.users.get(employeeUser.id)?.status).toBe(UserStatus.Inactive);
    expect((await employee.get("/api/auth/session")).status).toBe(401);
  });
});

describe("HTTP: protección CSRF por origen", () => {
  const login = { email: "laura.mendez@empresa.com", password: DEMO_PASSWORD };

  it("un POST sin Origin ni Referer → 403", async () => {
    const { http } = setupHttp();
    const response = await http().post("/api/auth/login").send(login);
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: "Origen de la solicitud no permitido.", fields: {} });
  });

  it("un POST desde otro origen → 403, aunque tenga sesión", async () => {
    const { http, asManager } = setupHttp();
    expect((await http().post("/api/auth/login").set("Origin", "https://evil.example").send(login)).status).toBe(403);

    const browser = await asManager();
    const response = await browser
      .post("/api/equipment", { code: "LAP-900", name: "Equipo", type: "Laptop" })
      .set("Origin", "http://localhost:3000");
    expect(response.status).toBe(403);
  });

  it("acepta el Referer del origen permitido cuando falta Origin", async () => {
    const { http } = setupHttp();
    const response = await http()
      .post("/api/auth/login")
      .set("Referer", `${ORIGIN}/login`)
      .send(login);
    expect(response.status).toBe(200);
  });

  it("un POST con cuerpo que no es JSON → 415", async () => {
    const { http } = setupHttp();
    const response = await http()
      .post("/api/auth/login")
      .set("Origin", ORIGIN)
      .type("form")
      .send("email=laura.mendez%40empresa.com&password=Demo2026!");
    expect(response.status).toBe(415);
  });

  it("los GET no exigen Origin y CORS permite credenciales solo al frontend", async () => {
    const { http } = setupHttp();
    const allowed = await http().get("/api/health").set("Origin", ORIGIN);
    expect(allowed.headers["access-control-allow-origin"]).toBe(ORIGIN);
    expect(allowed.headers["access-control-allow-credentials"]).toBe("true");
    const other = await http().get("/api/health").set("Origin", "https://evil.example");
    expect(other.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
