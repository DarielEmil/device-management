import type {
  IsoDate,
  Loan,
  LoanDetails,
  LoanDisplayStatus,
  LoanView,
} from "../entities/loan.js";
import { daysBetween } from "./dates.js";

// Días antes del vencimiento (inclusive) en los que se muestra "Por vencer".
export const DUE_SOON_DAYS = 3;

export function loanDisplayStatus(
  loan: Pick<Loan, "status" | "dueOn">,
  today: IsoDate,
): LoanDisplayStatus {
  if (loan.status === "Devuelto") return "Devuelto";
  const days = daysBetween(today, loan.dueOn);
  if (days < 0) return "Atrasado";
  return days <= DUE_SOON_DAYS ? "Por vencer" : "Activo";
}

export const toLoanView = (loan: LoanDetails, today: IsoDate): LoanView => ({
  ...loan,
  displayStatus: loanDisplayStatus(loan, today),
});

// Primero lo que vence antes.
export const byDueOn = (a: Loan, b: Loan): number =>
  a.dueOn.localeCompare(b.dueOn) || a.createdAt.getTime() - b.createdAt.getTime();

// Actividad más reciente primero: una devolución cuenta en su fecha de
// devolución; un préstamo abierto, en su fecha de préstamo.
export const byRecentActivity = (a: Loan, b: Loan): number =>
  (b.returnedOn ?? b.borrowedOn).localeCompare(a.returnedOn ?? a.borrowedOn) ||
  b.createdAt.getTime() - a.createdAt.getTime();
