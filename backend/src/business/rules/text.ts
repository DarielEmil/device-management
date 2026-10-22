// Quita espacios al inicio y al final y deja uno solo entre palabras.
export const collapseSpaces = (value: string): string =>
  value.trim().replace(/\s+/g, " ");

// Clave para comparar sin distinguir mayúsculas ni tildes:
// "Periférico", "periferico" y "PERIFERICO" producen la misma clave.
export const comparisonKey = (value: string): string =>
  collapseSpaces(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
