import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config/env.js";

const valid = {
  NODE_ENV: "production",
  PORT: "8080",
  CORS_ORIGIN: "http://127.0.0.1:3000",
  DATABASE_URL: "mysql://user:pass@127.0.0.1:3306/device_management",
};

describe("configuración", () => {
  it("lee las variables y usa Secure por defecto fuera de development", () => {
    expect(loadConfig(valid)).toEqual({
      nodeEnv: "production",
      port: 8080,
      corsOrigins: ["http://127.0.0.1:3000"],
      databaseUrl: valid.DATABASE_URL,
      cookieSecure: true,
    });
    expect(loadConfig({ ...valid, NODE_ENV: "development" }).cookieSecure).toBe(false);
    expect(loadConfig({ ...valid, COOKIE_SECURE: "false" }).cookieSecure).toBe(false);
    expect(loadConfig({ ...valid, CORS_ORIGIN: "http://127.0.0.1:3000, http://localhost:3000" }).corsOrigins)
      .toEqual(["http://127.0.0.1:3000", "http://localhost:3000"]);
  });

  it("falla al arrancar si falta algo o es inválido, con todos los problemas", () => {
    expect(() => loadConfig({})).toThrow(/NODE_ENV[\s\S]*PORT[\s\S]*CORS_ORIGIN[\s\S]*DATABASE_URL/);
    expect(() => loadConfig({ ...valid, CORS_ORIGIN: "http://127.0.0.1:3000/" })).toThrow(/CORS_ORIGIN/);
    expect(() => loadConfig({ ...valid, COOKIE_SECURE: "si" })).toThrow(/COOKIE_SECURE/);
  });
});
