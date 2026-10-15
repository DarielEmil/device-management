import type { Loan, LoanStatus, Role } from "../entities/models";

export function localToday(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function daysUntil(dueOn: string, today: string): number {
  return Math.round(
    (Date.parse(`${dueOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
      86_400_000,
  );
}

export function loanStatus(loan: Loan, today: string): LoanStatus {
  if (loan.returnedOn) return "Devuelto";
  const days = daysUntil(loan.dueOn, today);
  return days < 0 ? "Atrasado" : days <= 3 ? "Por vencer" : "Activo";
}

export function loanDateError(
  dueOn: string,
  today: string,
): string | undefined {
  return dueOn && dueOn < today
    ? "La fecha prevista no puede ser anterior a hoy."
    : undefined;
}

export function canAccess(role: Role, path: string): boolean {
  const route = path.split("?")[0];
  return role === "Encargado"
    ? ["/dashboard", "/inventory", "/loans", "/users"].includes(route ?? "")
    : ["/dashboard", "/available-equipment", "/my-loans"].includes(route ?? "");
}
