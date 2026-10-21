// `type` es texto libre normalizado antes de guardar para que "laptop" y
// "Laptop " se agrupen igual (Diagrama ER, regla 5).
export function normalizeEquipmentType(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}
