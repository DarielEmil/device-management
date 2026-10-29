import request from "supertest";
import { vi } from "vitest";
import { createApp } from "../../src/app.js";
import { SESSION_COOKIE } from "../../src/presentation/middleware/session.middleware.js";
import { DEMO_PASSWORD, setup } from "./setup.js";

export const ORIGIN = "http://127.0.0.1:3000";

export function setupHttp(options: { cookieSecure?: boolean } = {}) {
  const context = setup();
  const logger = { error: vi.fn() };
  const app = createApp({
    useCases: context.useCases,
    corsOrigins: [ORIGIN],
    cookieSecure: options.cookieSecure ?? false,
    logger,
  });

  // Simula el navegador: envía la cookie de sesión y un Origin permitido. La cookie se
  // envía a mano porque el reloj falso la emite con un Expires ya pasado en tiempo real.
  async function signIn(email: string, password = DEMO_PASSWORD) {
    const response = await request(app)
      .post("/api/auth/login")
      .set("Origin", ORIGIN)
      .send({ email, password });
    if (response.status !== 200) throw new Error(`Login falló: ${response.status}`);
    const cookie = `${SESSION_COOKIE}=${tokenOf(sessionCookie(response.headers["set-cookie"]))}`;
    return {
      cookie,
      get: (path: string) => request(app).get(path).set("Cookie", cookie),
      post: (path: string, body?: object) => {
        const pending = request(app).post(path).set("Cookie", cookie).set("Origin", ORIGIN);
        return body === undefined ? pending : pending.send(body);
      },
    };
  }

  return {
    ...context,
    app,
    logger,
    http: () => request(app),
    asManager: () => signIn(context.managerUser.email),
    asEmployee: () => signIn(context.employeeUser.email),
  };
}

export function sessionCookie(setCookie: string | string[] | undefined): string | undefined {
  const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  return cookies.find((cookie) => cookie.startsWith(`${SESSION_COOKIE}=`));
}

export const tokenOf = (cookie: string | undefined) =>
  cookie?.split(";")[0]?.slice(SESSION_COOKIE.length + 1) ?? "";
