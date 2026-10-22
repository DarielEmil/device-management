import { LoanStatus, Role, type Loan } from "../entities/models";

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
  if (loan.returnedOn) return LoanStatus.Returned;
  const days = daysUntil(loan.dueOn, today);
  return days < 0
    ? LoanStatus.Overdue
    : days <= 3
      ? LoanStatus.DueSoon
      : LoanStatus.Active;
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
  return role === Role.Manager
    ? ["/dashboard", "/inventory", "/loans", "/users"].includes(route ?? "")
    : ["/dashboard", "/available-equipment", "/my-loans"].includes(route ?? "");
}
