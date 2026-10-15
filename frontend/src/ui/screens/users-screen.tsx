"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, UserPlus } from "lucide-react";
import { useState } from "react";
import {
  departments,
  fullName,
  type Account,
} from "@/business/entities/models";
import { selectAccounts, selectEmployees } from "@/business/rules/selectors";
import { useApplication } from "../context/application-context";
import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
  Pagination,
  SearchInput,
} from "../components/primitives";
import {
  DeactivateModal,
  EmployeeModal,
  InviteModal,
} from "../components/management-modals";
import { usePagination } from "../hooks/use-pagination";
import { initials } from "../format";

export function UsersScreen() {
  const { snapshot } = useApplication();
  const search = useSearchParams();
  const employeesTab = search.get("tab") === "employees";
  const [modal, setModal] = useState<"employee" | "invite" | null>(null);
  return (
    <>
      <PageHeader
        title="Gestión de usuarios"
        subtitle="Administra las cuentas y los empleados de tu organización."
        action={
          <Button
            onClick={() => setModal(employeesTab ? "employee" : "invite")}
          >
            {employeesTab ? <Plus size={16} /> : <UserPlus size={16} />}
            {employeesTab ? "Registrar empleado" : "Invitar usuario"}
          </Button>
        }
      />
      <nav className="tabs" aria-label="Gestión de usuarios">
        <Link
          href="/users?tab=accounts"
          aria-current={!employeesTab ? "page" : undefined}
          className={`tab ${!employeesTab ? "tab-active" : ""}`}
        >
          Cuentas <span className="text-xs">({snapshot.accounts.length})</span>
        </Link>
        <Link
          href="/users?tab=employees"
          aria-current={employeesTab ? "page" : undefined}
          className={`tab ${employeesTab ? "tab-active" : ""}`}
        >
          Empleados{" "}
          <span className="text-xs">({snapshot.employees.length})</span>
        </Link>
      </nav>
      {employeesTab ? <EmployeesTable /> : <AccountsTable />}
      {modal === "employee" && <EmployeeModal onClose={() => setModal(null)} />}
      {modal === "invite" && <InviteModal onClose={() => setModal(null)} />}
    </>
  );
}

function EmployeesTable() {
  const { snapshot } = useApplication();
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const items = selectEmployees(snapshot, { query, department });
  const pagination = usePagination(items);
  return (
    <section className="panel">
      <div className="toolbar">
        <SearchInput
          value={query}
          onChange={(value) => {
            setQuery(value);
            pagination.resetPage();
          }}
          placeholder="Buscar por nombre o cédula…"
        />
        <select
          className="toolbar-select"
          aria-label="Filtrar por departamento"
          value={department}
          onChange={(event) => {
            setDepartment(event.target.value);
            pagination.resetPage();
          }}
        >
          <option value="">Departamento: Todos</option>
          {departments.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <caption className="sr-only">Empleados registrados</caption>
          <thead>
            <tr>
              {[
                "Nombre",
                "Cédula",
                "Departamento",
                "Teléfono",
                "Préstamos activos",
                "Cuenta",
                "Estado",
              ].map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagination.rows.map((employee) => (
              <tr key={employee.id}>
                <td className="font-medium">{fullName(employee)}</td>
                <td className="code text-slate-600">{employee.identity}</td>
                <td>{employee.department}</td>
                <td className="text-muted">{employee.phone || "—"}</td>
                <td>
                  {
                    snapshot.loans.filter(
                      (loan) =>
                        loan.employeeId === employee.id && !loan.returnedOn,
                    ).length
                  }
                </td>
                <td className="text-muted">
                  {snapshot.accounts.some(
                    (account) => account.employeeId === employee.id,
                  )
                    ? "Con cuenta"
                    : "Sin cuenta"}
                </td>
                <td>
                  <Badge tone={employee.active ? "success" : "neutral"}>
                    {employee.active ? "Activo" : "Inactivo"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!items.length && (
        <EmptyState
          title={
            query || department
              ? "No encontramos empleados"
              : "Aún no hay empleados registrados"
          }
          description={
            query || department
              ? "Prueba con otros términos o limpia los filtros."
              : "Registra un empleado para asignarle equipos."
          }
          action={
            (query || department) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setQuery("");
                  setDepartment("");
                  pagination.resetPage();
                }}
              >
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
        noun="empleados"
      />
    </section>
  );
}

function AccountsTable() {
  const { snapshot, session } = useApplication();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [deactivating, setDeactivating] = useState<Account | null>(null);
  const items = selectAccounts(snapshot, { query, role, status });
  const pagination = usePagination(items);
  return (
    <>
      <section className="panel">
        <div className="toolbar">
          <SearchInput
            value={query}
            onChange={(value) => {
              setQuery(value);
              pagination.resetPage();
            }}
            placeholder="Buscar por nombre o correo…"
          />
          <select
            className="toolbar-select"
            aria-label="Filtrar por rol"
            value={role}
            onChange={(event) => {
              setRole(event.target.value);
              pagination.resetPage();
            }}
          >
            <option value="">Rol: Todos</option>
            <option>Encargado</option>
            <option>Empleado</option>
          </select>
          <select
            className="toolbar-select"
            aria-label="Filtrar por estado de cuenta"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              pagination.resetPage();
            }}
          >
            <option value="">Estado: Todos</option>
            <option>Activo</option>
            <option>Inactivo</option>
            <option>Invitado</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <caption className="sr-only">Cuentas de usuario</caption>
            <thead>
              <tr>
                {[
                  "Usuario",
                  "Correo electrónico",
                  "Rol",
                  "Estado",
                  "Acciones",
                ].map((column) => (
                  <th scope="col" key={column}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagination.rows.map((account) => (
                <tr key={account.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-xs text-muted">
                        {initials(account.name)}
                      </span>
                      <span className="font-medium">{account.name}</span>
                      {account.id === session?.account.id && (
                        <span className="text-xs text-muted">(Tú)</span>
                      )}
                    </div>
                  </td>
                  <td className="text-muted">{account.email}</td>
                  <td>{account.role}</td>
                  <td>
                    <Badge
                      tone={account.status === "Activo" ? "success" : undefined}
                    >
                      {account.status}
                    </Badge>
                  </td>
                  <td>
                    {account.status !== "Inactivo" &&
                    account.id !== session?.account.id ? (
                      <Button
                        variant="ghost"
                        className="text-danger hover:bg-red-50"
                        onClick={() => setDeactivating(account)}
                      >
                        Desactivar
                      </Button>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!items.length && (
          <EmptyState
            title="No encontramos cuentas"
            description="Prueba con otros términos o limpia los filtros."
            action={
              <Button
                variant="ghost"
                onClick={() => {
                  setQuery("");
                  setRole("");
                  setStatus("");
                  pagination.resetPage();
                }}
              >
                Limpiar filtros
              </Button>
            }
          />
        )}
        <Pagination
          page={pagination.page}
          total={items.length}
          pageSize={pagination.pageSize}
          onChange={pagination.setPage}
          noun="cuentas"
        />
      </section>
      {deactivating && (
        <DeactivateModal
          account={deactivating}
          onClose={() => setDeactivating(null)}
        />
      )}
    </>
  );
}
