import {
  equipmentTypes,
  fullName,
  type Loan,
  type Snapshot,
} from "../entities/models";
import { loanStatus } from "./loans";

const normalized = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const matches = (value: string, query: string) =>
  normalized(value).includes(normalized(query.trim()));

export function selectEquipment(
  snapshot: Snapshot,
  filters: { query: string; type: string; status: string },
) {
  return snapshot.equipment.filter(
    (item) =>
      matches(
        `${item.code} ${item.name} ${item.brand} ${item.model}`,
        filters.query,
      ) &&
      (!filters.type || item.type === filters.type) &&
      (!filters.status || item.status === filters.status),
  );
}
export type LoanTab = "active" | "returned" | "all";
export function selectLoans(
  loans: Loan[],
  filters: { query: string; tab: LoanTab; status: string },
  today: string,
) {
  return loans
    .filter(
      (loan) =>
        matches(
          `${loan.employeeName} ${loan.equipmentCode} ${loan.equipmentName}`,
          filters.query,
        ) &&
        (filters.tab === "all" ||
          (filters.tab === "returned"
            ? Boolean(loan.returnedOn)
            : !loan.returnedOn)) &&
        (!filters.status || loanStatus(loan, today) === filters.status),
    )
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn));
}
export function selectEmployees(
  snapshot: Snapshot,
  filters: { query: string; department: string },
) {
  return snapshot.employees.filter(
    (employee) =>
      matches(`${fullName(employee)} ${employee.identity}`, filters.query) &&
      (!filters.department || employee.department === filters.department),
  );
}
export function selectAccounts(
  snapshot: Snapshot,
  filters: { query: string; role: string; status: string },
) {
  return snapshot.accounts.filter(
    (account) =>
      matches(`${account.name} ${account.email}`, filters.query) &&
      (!filters.role || account.role === filters.role) &&
      (!filters.status || account.status === filters.status),
  );
}
export function dashboardSummary(snapshot: Snapshot, today: string) {
  const active = snapshot.loans.filter((loan) => !loan.returnedOn);
  return {
    total: snapshot.equipment.length,
    available: snapshot.equipment.filter((item) => item.status === "Disponible")
      .length,
    loaned: snapshot.equipment.filter((item) => item.status === "Prestado")
      .length,
    overdue: active.filter((loan) => loanStatus(loan, today) === "Atrasado")
      .length,
    pending: active
      .filter((loan) => loanStatus(loan, today) !== "Activo")
      .sort((a, b) => a.dueOn.localeCompare(b.dueOn)),
    distribution: equipmentTypes.map((type) => ({
      type,
      count: snapshot.equipment.filter((item) => item.type === type).length,
    })),
    recent: [...snapshot.loans]
      .sort((a, b) =>
        (b.returnedOn ?? b.borrowedOn).localeCompare(
          a.returnedOn ?? a.borrowedOn,
        ),
      )
      .slice(0, 5),
  };
}
