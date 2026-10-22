"use client";
import { LoanStatus, type Loan } from "@/business/entities/models";
import { daysUntil, loanStatus } from "@/business/rules/loans";
import { Button, StatusBadge } from "./primitives";
import { formatDate } from "../format";

export function LoanTable({
  loans,
  today,
  employee = false,
  compact = false,
  onReturn,
}: {
  loans: Loan[];
  today: string;
  employee?: boolean;
  compact?: boolean;
  onReturn?(loan: Loan): void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <caption className="sr-only">
          {employee ? "Mis préstamos de equipos" : "Préstamos de equipos"}
        </caption>
        <thead>
          <tr>
            {!employee && <th scope="col">Empleado</th>}
            <th scope="col">Equipo</th>
            {!compact && <th scope="col">Fecha préstamo</th>}
            <th scope="col">Fecha prevista</th>
            <th scope="col">{compact ? "Plazo" : "Fecha real"}</th>
            <th scope="col">Estado</th>
            {onReturn && (
              <th scope="col" className="text-right">
                Acciones
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {loans.map((loan) => {
            const status = loanStatus(loan, today);
            const days = daysUntil(loan.dueOn, today);
            return (
              <tr key={loan.id}>
                {!employee && (
                  <td className="font-medium">{loan.employeeName}</td>
                )}
                <td>
                  {compact ? (
                    <div className="flex items-center gap-2">
                      <span className="asset-code">{loan.equipmentCode}</span>
                      <span>{loan.equipmentName}</span>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium">{loan.equipmentName}</p>
                      <p className="mt-0.5 font-mono text-xs text-muted">
                        {loan.equipmentCode}
                      </p>
                    </div>
                  )}
                </td>
                {!compact && (
                  <td className="text-muted">{formatDate(loan.borrowedOn)}</td>
                )}
                <td className="text-muted">{formatDate(loan.dueOn)}</td>
                <td
                  className={
                    compact
                      ? status === LoanStatus.Overdue
                        ? "text-danger"
                        : "text-amber-700"
                      : "text-muted"
                  }
                >
                  {compact
                    ? days < 0
                      ? `${Math.abs(days)} ${days === -1 ? "día" : "días"} de atraso`
                      : days === 0
                        ? "Vence hoy"
                        : days === 1
                          ? "Vence mañana"
                          : `Vence en ${days} días`
                    : formatDate(loan.returnedOn)}
                </td>
                <td>
                  <StatusBadge status={status} />
                </td>
                {onReturn && (
                  <td className="text-right">
                    {!loan.returnedOn ? (
                      <Button
                        variant="ghost"
                        aria-label={`Registrar devolución de ${loan.equipmentCode}`}
                        onClick={() => onReturn(loan)}
                      >
                        Registrar devolución
                      </Button>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
