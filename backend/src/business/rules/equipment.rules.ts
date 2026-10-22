import { EquipmentType } from "../entities/equipment.entity.js";
import { collapseSpaces, comparisonKey } from "./text.rules.js";

export function normalizeEquipmentType(value: string): EquipmentType | null {
  const key = comparisonKey(value);
  return Object.values(EquipmentType).find((type) => comparisonKey(type) === key) ?? null;
}

export const normalizeEquipmentCode = (value: string): string =>
  collapseSpaces(value).toUpperCase();
