import {
  LoanDisplayStatus,
  LoanStatus,
  type IsoDate,
  type Loan,
  type LoanDetails,
  type LoanView,
} from "../entities/loan.entity.js";
import { daysBetween } from "./dates.rules.js";

export const DUE_SOON_DAYS = 3;

export function loanDisplayStatus(
  loan: Pick<Loan, "status" | "dueOn">,
  today: IsoDate,
): LoanDisplayStatus {
  if (loan.status === LoanStatus.Returned) return LoanDisplayStatus.Returned;
  const days = daysBetween(today, loan.dueOn);
  if (days < 0) return LoanDisplayStatus.Overdue;
  return days <= DUE_SOON_DAYS ? LoanDisplayStatus.DueSoon : LoanDisplayStatus.Active;
}

export const toLoanView = (loan: LoanDetails, today: IsoDate): LoanView => ({
  ...loan,
  displayStatus: loanDisplayStatus(loan, today),
});

export const byDueOn = (a: Loan, b: Loan): number =>
  a.dueOn.localeCompare(b.dueOn) || a.createdAt.getTime() - b.createdAt.getTime();

export const byRecentActivity = (a: Loan, b: Loan): number =>
  (b.returnedOn ?? b.borrowedOn).localeCompare(a.returnedOn ?? a.borrowedOn) ||
  b.createdAt.getTime() - a.createdAt.getTime();
