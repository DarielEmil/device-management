"use client";

import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { useState } from "react";
import { LoanStatus, type Loan } from "@/business/entities/models";
import { selectLoans, type LoanTab } from "@/business/rules/selectors";
import { useApplication } from "../context/application-context";
import {
  Button,
  EmptyState,
  PageHeader,
  Pagination,
  SearchInput,
} from "../components/primitives";
import { LoanTable } from "../components/loan-table";
import { LoanModal, ReturnModal } from "../components/management-modals";
import { usePagination } from "../hooks/use-pagination";
import { statusLabels } from "../format";

export function LoansScreen({ personal = false }: { personal?: boolean }) {
  const { snapshot, application } = useApplication();
  const search = useSearchParams();
  const [tab, setTab] = useState<LoanTab>("active");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(search.get("status") ?? "");
  const [newLoan, setNewLoan] = useState(false);
  const [returning, setReturning] = useState<Loan | null>(null);
  const items = selectLoans(
    snapshot.loans,
    { query, tab, status },
    application.today(),
  );
  const pagination = usePagination(items);
  const tabs: { value: LoanTab; label: string; count: number }[] = [
    {
      value: "active",
      label: "Activos",
      count: snapshot.loans.filter((loan) => !loan.returnedOn).length,
    },
    {
      value: "returned",
      label: "Devueltos",
      count: snapshot.loans.filter((loan) => loan.returnedOn).length,
    },
    { value: "all", label: "Todos", count: snapshot.loans.length },
  ];
  function clearFilters() {
    setQuery("");
    setStatus("");
    pagination.resetPage();
  }
  return (
    <>
      <PageHeader
        title={personal ? "Mis préstamos" : "Préstamos"}
        subtitle={
          personal
            ? "Consulta tus equipos asignados y el historial de devoluciones."
            : "Gestiona la asignación y devolución de equipos."
        }
        action={
          !personal && (
            <Button onClick={() => setNewLoan(true)}>
              <Plus size={16} />
              Nuevo préstamo
            </Button>
          )
        }
      />
      <nav className="tabs" aria-label="Estado de los préstamos">
        {tabs.map((item) => (
          <button
            type="button"
            key={item.value}
            aria-current={tab === item.value ? "page" : undefined}
            className={`tab ${tab === item.value ? "tab-active" : ""}`}
            onClick={() => {
              setTab(item.value);
              setStatus("");
              pagination.resetPage();
            }}
          >
            {item.label}
            <span className="text-xs">({item.count})</span>
          </button>
        ))}
      </nav>
      <section className="panel">
        <div className="toolbar">
          <SearchInput
            value={query}
            onChange={(value) => {
              setQuery(value);
              pagination.resetPage();
            }}
            placeholder={
              personal
                ? "Buscar por equipo o código…"
                : "Buscar por empleado o código…"
            }
          />
          {tab !== "returned" && (
            <select
              className="toolbar-select"
              aria-label="Filtrar por estado del préstamo"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                pagination.resetPage();
              }}
            >
              <option value="">Estado: Todos</option>
              {Object.values(LoanStatus)
                .filter((value) => tab === "all" || value !== LoanStatus.Returned)
                .map((value) => (
                  <option key={value} value={value}>
                    {statusLabels[value]}
                  </option>
                ))}
            </select>
          )}
        </div>
        <LoanTable
          loans={pagination.rows}
          today={application.today()}
          employee={personal}
          onReturn={personal ? undefined : setReturning}
        />
        {!items.length && (
          <EmptyState
            title={
              query || status
                ? "No encontramos préstamos"
                : tab === "active"
                  ? "No hay préstamos activos"
                  : tab === "returned"
                    ? "No hay préstamos devueltos"
                    : "Aún no hay préstamos"
            }
            description={
              query || status
                ? "Prueba con otros términos o limpia los filtros."
                : personal
                  ? "Tus préstamos aparecerán aquí cuando te asignen un equipo."
                  : "Cuando prestes un equipo aparecerá aquí."
            }
            action={
              (query || status) && (
                <Button variant="ghost" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              )
            }
          />
        )}
        <Pagination
          page={pagination.page}
          total={items.length}
          pageSize={pagination.pageSize}
          onChange={pagination.setPage}
          noun="préstamos"
        />
      </section>
      {newLoan && <LoanModal onClose={() => setNewLoan(false)} />}
      {returning && (
        <ReturnModal loan={returning} onClose={() => setReturning(null)} />
      )}
    </>
  );
}
