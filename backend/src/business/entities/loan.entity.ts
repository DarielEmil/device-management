export type IsoDate = string;

export const LoanStatus = {
  Active: "active",
  Returned: "returned",
} as const;
export type LoanStatus = (typeof LoanStatus)[keyof typeof LoanStatus];

export const LoanDisplayStatus = {
  Active: LoanStatus.Active,
  DueSoon: "due_soon",
  Overdue: "overdue",
  Returned: LoanStatus.Returned,
} as const;
export type LoanDisplayStatus =
  (typeof LoanDisplayStatus)[keyof typeof LoanDisplayStatus];

export interface Loan {
  id: string;
  employeeId: string;
  equipmentId: string;
  borrowedOn: IsoDate;
  dueOn: IsoDate;
  returnedOn: IsoDate | null;
  status: LoanStatus;
  // Encargado que registró el préstamo (CU-03) y, al devolverlo, la devolución (CU-04).
  registeredById: string;
  returnedById: string | null;
  createdAt: Date;
}

export interface LoanDetails extends Loan {
  equipmentCode: string;
  equipmentName: string;
  employeeName: string;
}

export interface LoanView extends LoanDetails {
  displayStatus: LoanDisplayStatus;
}

export interface LoanInput {
  employeeId: string;
  equipmentId: string;
  dueOn: string;
}
