import type { Snapshot } from "@/business/entities/models";
import { createSeed } from "../data/seed";

export const scenarios = [
  "default",
  "empty",
  "no-active-loans",
  "error",
  "unavailable",
] as const;
export type MockScenario = (typeof scenarios)[number];

export function createScenario(name: string): {
  data: Snapshot;
  scenario: MockScenario;
} {
  if (!scenarios.includes(name as MockScenario))
    throw new Error(`Escenario mock desconocido: ${name}`);
  const data = createSeed();
  if (name === "empty") {
    data.equipment = [];
    data.loans = [];
  }
  if (name === "no-active-loans") {
    data.loans = data.loans.filter((loan) => loan.returnedOn);
    data.equipment.forEach((item) => {
      item.status = "Disponible";
    });
  }
  return { data, scenario: name as MockScenario };
}
