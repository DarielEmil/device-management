import axios, { AxiosError, AxiosHeaders, type AxiosAdapter, type AxiosResponse } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveEnvironment, usesMocks } from "@/api/config/environment";
import { createHttpGateways } from "@/api/repositories/http-gateways";
import { createSeed } from "@/mocks/data/seed";

afterEach(() => vi.restoreAllMocks());
describe("selección de entorno", () => {
  it.each(["local", "dev"] as const)("%s usa mocks", (environment) =>
    expect(usesMocks(environment)).toBe(true),
  );
  it.each(["staging", "production"] as const)(
    "%s nunca usa mocks",
    (environment) => expect(usesMocks(environment)).toBe(false),
  );
  it("dev usa mocks por defecto, build/start usa APIs", () => {
    expect(resolveEnvironment(undefined, "development")).toBe("dev");
    expect(resolveEnvironment(undefined, "production")).toBe("production");
  });
  it("rechaza entornos desconocidos en vez de activar mocks silenciosamente", () => {
    expect(() => resolveEnvironment("prodution", "production")).toThrow(
      "inválido",
    );
  });
});
describe("adaptadores HTTP", () => {
  const adapter = vi.fn<AxiosAdapter>();

  beforeEach(() => {
    adapter.mockReset();
    const create = axios.create.bind(axios);
    vi.spyOn(axios, "create").mockImplementation((config) =>
      create({ ...config, adapter }),
    );
  });

  function reply(status: number, data: unknown) {
    adapter.mockImplementation(async (config) => {
      const response: AxiosResponse<unknown> = {
        status, data, statusText: String(status), headers: new AxiosHeaders(), config,
      };
      if (config.validateStatus && !config.validateStatus(status)) {
        throw new AxiosError("Request failed", "ERR_BAD_RESPONSE", config, undefined, response);
      }
      return response;
    });
  }

  it("valida y transforma el envelope antes de devolver entidades", async () => {
    reply(200, { data: createSeed().equipment });
    expect(
      await createHttpGateways(
        "https://api.example.test/api/",
      ).equipment.list(),
    ).toHaveLength(10);
    expect(adapter).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "https://api.example.test/api", url: "/equipment",
        withCredentials: true, method: "get", timeout: 15_000,
      }),
    );
  });
  it("rechaza respuestas incompatibles", async () => {
    reply(200, { data: [{ incompatible: true }] });
    await expect(
      createHttpGateways("/api").equipment.list(),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
  it("no transforma un error de red en datos mock", async () => {
    adapter.mockRejectedValue(new AxiosError("offline", "ERR_NETWORK"));
    await expect(
      createHttpGateways("/api").equipment.list(),
    ).rejects.toMatchObject({ code: "NETWORK" });
  });
  it("propaga errores de campo del backend", async () => {
    reply(409, { message: "Duplicado", fields: { code: "Código existente" } });
    await expect(
      createHttpGateways("/api").equipment.create({
        code: "EQ-006",
        name: "Dell",
        type: "Laptop",
        brand: "",
        model: "",
      }),
    ).rejects.toMatchObject({ code: "HTTP_ERROR", fields: { code: "Código existente" } });
    const config = adapter.mock.calls[0]?.[0];
    expect(config?.data).toBe(JSON.stringify({ code: "EQ-006", name: "Dell", type: "Laptop", brand: "", model: "" }));
    expect(config?.headers.get("Content-Type")).toBe("application/json");
  });
  it("vincula una cuenta con POST /accounts/:id/link-employee", async () => {
    const account = createSeed().accounts[0];
    reply(200, { data: { ...account, employeeId: "emp-1" } });
    await expect(
      createHttpGateways("/api").accounts.linkEmployee("user 1", "emp-1"),
    ).resolves.toMatchObject({ employeeId: "emp-1" });
    const config = adapter.mock.calls[0]?.[0];
    expect(config).toMatchObject({ url: "/accounts/user%201/link-employee", method: "post" });
    expect(config?.data).toBe(JSON.stringify({ employeeId: "emp-1" }));
  });
  it("una sesión no autenticada retorna null", async () => {
    reply(401, {});
    await expect(createHttpGateways("/api").auth.current()).resolves.toBeNull();
  });
  it("acepta respuestas sin contenido al cerrar sesión", async () => {
    reply(204, "");
    await expect(createHttpGateways("/api").auth.logout()).resolves.toBeUndefined();
  });
  it("normaliza timeouts de Axios como errores de conexión", async () => {
    adapter.mockRejectedValue(new AxiosError("timeout of 15000ms exceeded", "ECONNABORTED"));
    await expect(createHttpGateways("/api").equipment.list()).rejects.toMatchObject({ code: "NETWORK" });
  });
  it("los errores HTTP sin JSON utilizan un mensaje seguro", async () => {
    reply(503, "Service unavailable");
    await expect(createHttpGateways("/api").equipment.list()).rejects.toMatchObject({ code: "HTTP_ERROR", message: "No se pudo completar la solicitud." });
  });
  it("requiere URL explícita fuera de local/dev", async () => {
    await expect(
      createHttpGateways(undefined).equipment.list(),
    ).rejects.toMatchObject({ code: "CONFIGURATION" });
    expect(adapter).not.toHaveBeenCalled();
  });
});
