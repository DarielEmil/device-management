// Fecha de calendario sin hora, en formato YYYY-MM-DD.
export type IsoDate = string;

// Estado almacenado: un préstamo pasa de Activo a Devuelto una sola vez.
export const loanStatus = ["Active", "Returned"] as const;
export type LoanStatus = (typeof LoanStatus)[keyof typeof LoanStatus];

// Estado que ve el usuario. "Por vencer" y "Atrasado" se derivan de las
// fechas al consultar; nunca se guardan (ver rules/loans.ts).
export const loanDisplayStatus = [
  "Active",
  "Due soon",
  "Overdue",
  "Returned",
] as const;
export type LoanDisplayStatus = (typeof loanDisplayStatus)[number];

export interface Loan {
  id: string;
  employeeId: string;
  equipmentId: string;
  borrowedOn: IsoDate;
  dueOn: IsoDate;
  // null mientras está Activo; la fecha de devolución cuando está Devuelto.
  returnedOn: IsoDate | null;
  status: LoanStatus;
  createdAt: Date;
}

// Préstamo con los datos de equipo y empleado que muestra el frontend, para
// que un Empleado no necesite acceso al inventario ni a la lista de empleados.
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
