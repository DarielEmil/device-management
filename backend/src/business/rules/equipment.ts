import { equipmentTypes, type EquipmentType } from "../entities/equipment.js";
import { collapseSpaces, comparisonKey } from "./text.js";

// " laptop ", "LAPTOP" o "periferico" se guardan como el valor del catálogo
// ("Laptop", "Periférico") para que filtros y conteos agrupen igual y el
// frontend siempre reciba un tipo que conoce. Devuelve null si no existe.
export function normalizeEquipmentType(value: string): EquipmentType | null {
  const key = comparisonKey(value);
  return equipmentTypes.find((type) => comparisonKey(type) === key) ?? null;
}

// El código de activo se compara y guarda en mayúsculas: "lap-001" y
// "LAP-001" son el mismo equipo.
export const normalizeEquipmentCode = (value: string): string =>
  collapseSpaces(value).toUpperCase();
