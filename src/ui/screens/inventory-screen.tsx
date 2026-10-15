"use client";

import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { useState } from "react";
import { equipmentTypes } from "@/business/entities/models";
import { selectEquipment } from "@/business/rules/selectors";
import { useApplication } from "../context/application-context";
import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
  Pagination,
  SearchInput,
} from "../components/primitives";
import { EquipmentModal, LoanModal } from "../components/management-modals";
import { usePagination } from "../hooks/use-pagination";

export function InventoryScreen({
  availableOnly = false,
}: {
  availableOnly?: boolean;
}) {
  const { snapshot } = useApplication();
  const search = useSearchParams();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState(
    availableOnly ? "Disponible" : (search.get("status") ?? ""),
  );
  const [modal, setModal] = useState<"equipment" | "loan" | null>(null);
  const [equipmentId, setEquipmentId] = useState("");
  const items = selectEquipment(snapshot, {
    query,
    type,
    status: availableOnly ? "Disponible" : status,
  });
  const pagination = usePagination(items);
  const filtered = Boolean(query || type || (!availableOnly && status));
  function clearFilters() {
    setQuery("");
    setType("");
    setStatus(availableOnly ? "Disponible" : "");
    pagination.resetPage();
  }
  const emptyTitle = filtered
    ? "No encontramos equipos"
    : availableOnly
      ? "No hay equipos disponibles"
      : "Aún no hay equipos registrados";

  return (
    <>
      <PageHeader
        title={availableOnly ? "Equipos disponibles" : "Inventario"}
        subtitle={
          availableOnly
            ? "Consulta los equipos que están disponibles para préstamo."
            : `${snapshot.equipment.length} equipos registrados en el inventario`
        }
        action={
          !availableOnly && (
            <Button onClick={() => setModal("equipment")}>
              <Plus size={16} />
              Registrar equipo
            </Button>
          )
        }
      />
      <section className="panel" aria-label="Inventario de equipos">
        <div className="toolbar">
          <SearchInput
            value={query}
            onChange={(value) => {
              setQuery(value);
              pagination.resetPage();
            }}
            placeholder="Buscar por código, nombre o marca…"
          />
          <select
            className="toolbar-select"
            aria-label="Filtrar por tipo"
            value={type}
            onChange={(event) => {
              setType(event.target.value);
              pagination.resetPage();
            }}
          >
            <option value="">Tipo: Todos</option>
            {equipmentTypes.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          {!availableOnly && (
            <select
              className="toolbar-select"
              aria-label="Filtrar por estado"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                pagination.resetPage();
              }}
            >
              <option value="">Estado: Todos</option>
              <option>Disponible</option>
              <option>Prestado</option>
            </select>
          )}
          <span className="ml-auto text-xs text-muted">
            {items.length} {items.length === 1 ? "equipo" : "equipos"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <caption className="sr-only">
              {availableOnly ? "Equipos disponibles" : "Inventario"}
            </caption>
            <thead>
              <tr>
                {[
                  "Código",
                  "Nombre",
                  "Tipo",
                  "Marca",
                  "Modelo",
                  "Estado",
                  ...(!availableOnly ? ["Acciones"] : []),
                ].map((column) => (
                  <th scope="col" key={column}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagination.rows.map((equipment) => (
                <tr key={equipment.id}>
                  <td className="code text-slate-600">{equipment.code}</td>
                  <td className="font-medium">{equipment.name}</td>
                  <td>{equipment.type}</td>
                  <td className="text-muted">{equipment.brand || "—"}</td>
                  <td className="text-muted">{equipment.model || "—"}</td>
                  <td>
                    <Badge>{equipment.status}</Badge>
                  </td>
                  {!availableOnly && (
                    <td>
                      {equipment.status === "Disponible" ? (
                        <Button
                          variant="secondary"
                          aria-label={`Prestar ${equipment.code}`}
                          onClick={() => {
                            setEquipmentId(equipment.id);
                            setModal("loan");
                          }}
                        >
                          Prestar
                        </Button>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!items.length && (
          <EmptyState
            title={emptyTitle}
            description={
              filtered
                ? "Prueba con otros términos o limpia los filtros."
                : availableOnly
                  ? "Cuando se libere un equipo aparecerá aquí."
                  : "Registra tu primer equipo para comenzar."
            }
            action={
              filtered && (
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
          noun="equipos"
        />
      </section>
      {modal === "equipment" && (
        <EquipmentModal onClose={() => setModal(null)} />
      )}
      {modal === "loan" && (
        <LoanModal equipmentId={equipmentId} onClose={() => setModal(null)} />
      )}
    </>
  );
}
