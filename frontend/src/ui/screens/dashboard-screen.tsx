"use client";

import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowRight,
  Box,
  CircleAlert,
  Monitor,
  Plus,
} from "lucide-react";
import { useState } from "react";
import {
  EquipmentStatus,
  LoanStatus,
  Role,
} from "@/business/entities/models";
import { dashboardSummary } from "@/business/rules/selectors";
import { useApplication } from "../context/application-context";
import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
  StatusBadge,
} from "../components/primitives";
import { LoanModal } from "../components/management-modals";
import { LoanTable } from "../components/loan-table";
import { formatDate } from "../format";

export function DashboardScreen() {
  const { session } = useApplication();
  return session?.account.role === Role.Employee ? (
    <EmployeeDashboard />
  ) : (
    <ManagerDashboard />
  );
}

function ManagerDashboard() {
  const { snapshot, application, mockMode } = useApplication();
  const [loanModal, setLoanModal] = useState(false);
  const summary = dashboardSummary(snapshot, application.today());
  const metrics = [
    {
      label: "Equipos totales",
      value: summary.total,
      icon: Monitor,
      href: "/inventory",
    },
    {
      label: "Disponibles",
      value: summary.available,
      icon: Box,
      href: `/inventory?status=${EquipmentStatus.Available}`,
    },
    {
      label: "Prestados",
      value: summary.loaned,
      icon: ArrowLeftRight,
      href: `/inventory?status=${EquipmentStatus.Loaned}`,
    },
    {
      label: "Devoluciones atrasadas",
      value: summary.overdue,
      icon: CircleAlert,
      href: `/loans?status=${LoanStatus.Overdue}`,
    },
  ];
  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Vista general del estado de equipos y préstamos activos"
        action={
          <Button onClick={() => setLoanModal(true)}>
            <Plus size={16} />
            Nuevo préstamo
          </Button>
        }
      />
      <section
        aria-label="Métricas clave"
        className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4"
      >
        {metrics.map(({ label, value, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-lg border border-border p-5 transition-colors hover:border-border-strong"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
                {label}
              </span>
              <Icon size={16} className="text-muted" />
            </div>
            <p className="mt-3 text-[28px] font-semibold leading-9">{value}</p>
          </Link>
        ))}
      </section>
      <section className="panel mb-6">
        <div className="panel-heading">
          <div className="flex flex-wrap items-center gap-3">
            <h3>Devoluciones próximas y atrasadas</h3>
            <Badge tone="neutral">{`${summary.pending.length} pendientes`}</Badge>
          </div>
          <Link className="link text-[13px]" href="/loans">
            Ver préstamos
            <ArrowRight size={16} />
          </Link>
        </div>
        <LoanTable
          loans={summary.pending}
          today={application.today()}
          compact
        />
        {!summary.pending.length && (
          <EmptyState
            title="No hay devoluciones pendientes"
            description="Aquí verás los préstamos próximos a vencer o atrasados."
          />
        )}
      </section>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="panel">
          <div className="panel-heading">
            <h3>Actividad reciente</h3>
            <span className="text-xs text-muted">Últimos registros</span>
          </div>
          {summary.recent.length ? (
            <ol className="divide-y divide-border px-5">
              {summary.recent.map((loan) => (
                <li key={loan.id} className="py-3.5">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium">
                      {loan.returnedOn
                        ? "Devolución completada"
                        : "Préstamo registrado"}
                    </span>
                    <span className="text-xs text-muted">
                      {formatDate(loan.returnedOn ?? loan.borrowedOn)}
                    </span>
                  </div>
                  <p className="text-[13px] text-slate-600">
                    {loan.employeeName} · {loan.equipmentName}
                  </p>
                  <span className="mt-1 inline-block font-mono text-xs text-muted">
                    {loan.equipmentCode}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              title="Aún no hay actividad"
              description="Los préstamos y devoluciones aparecerán aquí."
            />
          )}
        </section>
        <section className="panel flex flex-col">
          <div className="panel-heading">
            <h3>Equipos por tipo</h3>
            <span className="text-xs text-muted">
              Total: {summary.total} equipos
            </span>
          </div>
          <div className="flex-1 space-y-6 p-5">
            {summary.distribution.map(({ type, count }) => (
              <div key={type}>
                <div className="mb-2 flex justify-between text-[13px]">
                  <span className="font-medium">{type}</span>
                  <span>
                    {count} <span className="text-xs text-muted">unidades</span>
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-slate-100"
                  role="meter"
                  aria-label={type}
                  aria-valuenow={count}
                  aria-valuemin={0}
                  aria-valuemax={Math.max(1, summary.total)}
                >
                  <div
                    className="h-full rounded-full bg-slate-500"
                    style={{
                      width: `${summary.total ? (count / summary.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between gap-2 border-t border-border px-5 py-3 text-xs text-muted">
            <span>
              {mockMode ? "Datos de demostración" : "Inventario registrado"}
            </span>
            <span>Corte: {formatDate(application.today())}</span>
          </div>
        </section>
      </div>
      {mockMode && (
        <p className="mt-5 text-xs text-muted">
          Los indicadores se calculan con los registros de muestra. Los cambios
          se reinician al recargar.
        </p>
      )}
      {loanModal && <LoanModal onClose={() => setLoanModal(false)} />}
    </>
  );
}

function EmployeeDashboard() {
  const { snapshot, session, application } = useApplication();
  const active = snapshot.loans.filter((loan) => !loan.returnedOn);
  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Hola, ${session?.account.name.split(" ")[0] ?? ""}. Consulta tus equipos y las fechas de devolución.`}
      />
      <section className="panel mb-6">
        <div className="panel-heading">
          <h3>Mis equipos asignados</h3>
          <Link className="link text-[13px]" href="/my-loans">
            Ver mis préstamos
            <ArrowRight size={16} />
          </Link>
        </div>
        <LoanTable loans={active} today={application.today()} employee />
        {!active.length && (
          <EmptyState
            title="No tienes equipos asignados"
            description="Cuando te asignen un equipo, lo verás aquí junto a su fecha de devolución."
          />
        )}
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Equipos disponibles</h3>
            <p className="mt-1 text-[13px] text-muted">
              Consulta el catálogo y contacta al encargado para solicitar un
              equipo.
            </p>
          </div>
          <Link className="link text-[13px]" href="/available-equipment">
            Ver catálogo
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <caption className="sr-only">
              Catálogo de equipos disponibles
            </caption>
            <thead>
              <tr>
                {["Código", "Nombre", "Tipo", "Estado"].map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {snapshot.equipment.slice(0, 4).map((item) => (
                <tr key={item.id}>
                  <td className="code text-slate-600">{item.code}</td>
                  <td className="font-medium">{item.name}</td>
                  <td>{item.type}</td>
                  <td>
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!snapshot.equipment.length && (
          <EmptyState
            title="No hay equipos disponibles"
            description="Cuando se libere un equipo aparecerá aquí."
          />
        )}
      </section>
    </>
  );
}
