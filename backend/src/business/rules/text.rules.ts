export const collapseSpaces = (value: string): string =>
  value.trim().replace(/\s+/g, " ");

export const comparisonKey = (value: string): string =>
  collapseSpaces(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
