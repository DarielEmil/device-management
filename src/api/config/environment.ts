import { z } from "zod";

export type AppEnvironment = "local" | "dev" | "staging" | "production";

export function resolveEnvironment(
  explicit: string | undefined,
  nodeEnvironment: string | undefined,
): AppEnvironment {
  const environment =
    explicit ?? (nodeEnvironment === "development" ? "dev" : "production");
  if (!["local", "dev", "staging", "production"].includes(environment))
    throw new Error(`NEXT_PUBLIC_APP_ENV inválido: ${environment}`);
  return environment as AppEnvironment;
}

export function usesMocks(environment: AppEnvironment): boolean {
  return environment === "local" || environment === "dev";
}

export const environment = resolveEnvironment(
  process.env.NEXT_PUBLIC_APP_ENV,
  process.env.NODE_ENV,
);
export const mockMode = usesMocks(environment);
export const referenceDate = mockMode
  ? (process.env.NEXT_PUBLIC_MOCK_TODAY ?? "2026-10-07")
  : undefined;
if (referenceDate) z.iso.date().parse(referenceDate);
export const mockScenario = process.env.NEXT_PUBLIC_MOCK_SCENARIO ?? "default";
export const mockDelay = Math.max(
  0,
  Number(process.env.NEXT_PUBLIC_MOCK_DELAY_MS ?? 350) || 0,
);
export const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
