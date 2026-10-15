export function formatDate(value: string | null): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
export function initials(value: string): string {
  return value
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
}
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
