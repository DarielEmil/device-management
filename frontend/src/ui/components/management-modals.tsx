"use client";

import { useState } from "react";
import { loanDateError } from "@/business/rules/loans";
import {
  departments,
  equipmentTypes,
  EquipmentStatus,
  fullName,
  Role,
  type Account,
  type Loan,
} from "@/business/entities/models";
import {
  employeeInputSchema,
  equipmentInputSchema,
  inviteInputSchema,
  loanInputSchema,
  type EmployeeInput,
  type EquipmentInput,
  type InviteInput,
  type LoanInput,
} from "@/business/rules/validation";
import { useApplication } from "../context/application-context";
import { useFormModel, type FormValues } from "../hooks/use-form-model";
import {
  Badge,
  InlineError,
  Input,
  Modal,
  ModalFooter,
  Select,
} from "./primitives";
import { SearchableSelect } from "./searchable-select";
import { formatDate, roleLabels } from "../format";

export function EquipmentModal({ onClose }: { onClose(): void }) {
  const { application, refresh, notify } = useApplication();
  const initial: FormValues<EquipmentInput> = {
    code: "",
    name: "",
    type: "",
    brand: "",
    model: "",
  };
  const form = useFormModel(equipmentInputSchema, initial, async (input) => {
    await application.registerEquipment(input);
    await refresh();
    notify("Equipo registrado. Ya está disponible para préstamo.");
    onClose();
  });
  return (
    <Modal
      title="Registrar equipo"
      description="Añade un equipo al inventario. Quedará disponible."
      onClose={onClose}
      busy={form.busy}
    >
      <form onSubmit={form.onSubmit} noValidate className="space-y-4">
        <Input
          label="Código de activo"
          className="font-mono"
          placeholder="EQ-011"
          required
          {...form.field("code")}
        />
        <Input
          label="Nombre"
          placeholder="Nombre del equipo"
          required
          {...form.field("name")}
        />
        <Select label="Tipo" required {...form.field("type")}>
          <option value="">Selecciona un tipo</option>
          {equipmentTypes.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Marca" hint="Opcional" {...form.field("brand")} />
          <Input label="Modelo" hint="Opcional" {...form.field("model")} />
        </div>
        <InlineError>{form.errors.form}</InlineError>
        <ModalFooter
          onCancel={onClose}
          label="Registrar equipo"
          busy={form.busy}
          disabled={!form.valid}
        />
      </form>
    </Modal>
  );
}

export function EmployeeModal({ onClose }: { onClose(): void }) {
  const { application, refresh, notify } = useApplication();
  const initial: FormValues<EmployeeInput> = {
    firstName: "",
    lastName: "",
    identity: "",
    department: "",
    phone: "",
  };
  const form = useFormModel(employeeInputSchema, initial, async (input) => {
    await application.registerEmployee(input);
    await refresh();
    notify("Empleado registrado correctamente.");
    onClose();
  });
  return (
    <Modal
      title="Registrar empleado"
      description="El colaborador podrá recibir equipos en préstamo."
      onClose={onClose}
      busy={form.busy}
    >
      <form onSubmit={form.onSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Nombres" required {...form.field("firstName")} />
          <Input label="Apellidos" required {...form.field("lastName")} />
        </div>
        <Input
          label="Cédula"
          className="font-mono"
          placeholder="000-0000000-0"
          required
          {...form.field("identity")}
        />
        <Select label="Departamento" required {...form.field("department")}>
          <option value="">Selecciona un departamento</option>
          {departments.map((department) => (
            <option key={department}>{department}</option>
          ))}
        </Select>
        <Input
          label="Teléfono"
          type="tel"
          placeholder="809-000-0000"
          hint="Opcional"
          {...form.field("phone")}
        />
        <InlineError>{form.errors.form}</InlineError>
        <ModalFooter
          onCancel={onClose}
          label="Registrar empleado"
          busy={form.busy}
          disabled={!form.valid}
        />
      </form>
    </Modal>
  );
}

export function LoanModal({
  onClose,
  equipmentId = "",
}: {
  onClose(): void;
  equipmentId?: string;
}) {
  const { application, snapshot, refresh, notify } = useApplication();
  const initial: LoanInput = { employeeId: "", equipmentId, dueOn: "" };
  const form = useFormModel(loanInputSchema, initial, async (input) => {
    await application.createLoan(input);
    await refresh();
    notify("Préstamo registrado correctamente.");
    onClose();
  });
  const invalidDate = loanDateError(form.values.dueOn, application.today());
  return (
    <Modal
      title="Nuevo préstamo"
      description="Asigna un equipo disponible a un empleado."
      onClose={onClose}
      busy={form.busy}
    >
      <form onSubmit={form.onSubmit} noValidate className="space-y-5">
        <SearchableSelect
          label="Empleado"
          placeholder="Buscar empleado…"
          required
          value={form.values.employeeId}
          onChange={(value) => form.set("employeeId", value)}
          options={snapshot.employees
            .filter((employee) => employee.active)
            .map((employee) => ({
              value: employee.id,
              label: fullName(employee),
              detail: employee.identity,
            }))}
          error={form.errors.employeeId}
        />
        <SearchableSelect
          label="Equipo"
          placeholder="Buscar equipo disponible…"
          required
          value={form.values.equipmentId}
          onChange={(value) => form.set("equipmentId", value)}
          options={snapshot.equipment
            .filter((equipment) => equipment.status === EquipmentStatus.Available)
            .map((equipment) => ({
              value: equipment.id,
              label: `${equipment.code} · ${equipment.name}`,
              detail: equipment.type,
            }))}
          error={form.errors.equipmentId}
        />
        {form.errors.equipmentId && (
          <button
            type="button"
            className="link text-xs"
            onClick={() => form.set("equipmentId", "")}
          >
            Elegir otro equipo
          </button>
        )}
        <Input
          label="Fecha prevista de devolución"
          type="date"
          min={application.today()}
          required
          {...form.field("dueOn")}
          error={
            invalidDate
              ? "La fecha prevista no puede ser anterior a hoy."
              : form.errors.dueOn
          }
          hint={`Fecha de préstamo: ${formatDate(application.today())}`}
        />
        <InlineError>{form.errors.form}</InlineError>
        <ModalFooter
          onCancel={onClose}
          label="Confirmar préstamo"
          busy={form.busy}
          disabled={!form.valid || Boolean(invalidDate)}
        />
      </form>
    </Modal>
  );
}

export function ReturnModal({
  loan,
  onClose,
}: {
  loan: Loan;
  onClose(): void;
}) {
  const { application, refresh, notify } = useApplication();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal
      title="Registrar devolución"
      description="Confirma que has recibido el equipo del empleado."
      onClose={onClose}
      busy={busy}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          try {
            await application.returnLoan(loan.id);
            await refresh();
            notify(
              "Devolución registrada. El equipo vuelve a estar disponible.",
            );
            onClose();
          } catch (reason) {
            setError(
              reason instanceof Error
                ? reason.message
                : "No se pudo registrar la devolución.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <dl className="rounded-lg border border-border bg-panel p-4 space-y-3">
          <div>
            <dt className="text-xs text-muted">Empleado</dt>
            <dd className="mt-1 font-medium">{loan.employeeName}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Equipo</dt>
            <dd className="mt-1">
              {loan.equipmentName}{" "}
              <span className="asset-code ml-1">{loan.equipmentCode}</span>
            </dd>
          </div>
          <div className="flex gap-8">
            <div>
              <dt className="text-xs text-muted">Fecha prevista</dt>
              <dd className="mt-1">{formatDate(loan.dueOn)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Fecha de devolución</dt>
              <dd className="mt-1">{formatDate(application.today())}</dd>
            </div>
          </div>
        </dl>
        <p className="my-4 text-[13px] text-muted">
          El préstamo quedará Devuelto y el equipo Disponible.
        </p>
        <InlineError>{error}</InlineError>
        <ModalFooter
          onCancel={onClose}
          label="Registrar devolución"
          busy={busy}
          disabled={Boolean(loan.returnedOn)}
        />
      </form>
    </Modal>
  );
}

export function InviteModal({ onClose }: { onClose(): void }) {
  const { application, snapshot, refresh, notify, mockMode } = useApplication();
  const initial: InviteInput = { email: "", role: Role.Employee, employeeId: "" };
  const form = useFormModel(inviteInputSchema, initial, async (input) => {
    await application.inviteUser(input);
    await refresh();
    notify(
      mockMode
        ? "Invitación simulada creada. No se envió un correo real."
        : "Invitación enviada correctamente.",
    );
    onClose();
  });
  const options = snapshot.employees.filter(
    (employee) =>
      employee.active &&
      !snapshot.accounts.some((account) => account.employeeId === employee.id),
  );
  return (
    <Modal
      title="Invitar usuario"
      description={
        mockMode
          ? "Simula una invitación sin enviar correos reales."
          : "Se enviará un correo para activar la cuenta."
      }
      onClose={onClose}
      busy={form.busy}
    >
      <form onSubmit={form.onSubmit} noValidate className="space-y-5">
        <Input
          label="Correo electrónico"
          type="email"
          placeholder="nombre@empresa.com"
          required
          {...form.field("email")}
        />
        <fieldset>
          <legend className="mb-2 text-[13px] font-medium">Rol *</legend>
          <div className="flex rounded-sm border border-border-strong p-1">
            {[Role.Employee, Role.Manager].map((role) => (
              <label
                className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-sm px-3 py-2 ${form.values.role === role ? "bg-primary/10 text-primary" : "text-muted"}`}
                key={role}
              >
                <input
                  type="radio"
                  name="role"
                  value={role}
                  checked={form.values.role === role}
                  onChange={() => form.set("role", role)}
                  className="accent-primary"
                />
                {roleLabels[role]}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            Encargado: gestión total. Empleado: catálogo y préstamos propios.
          </p>
        </fieldset>
        <SearchableSelect
          label="Vincular a empleado (opcional)"
          placeholder="Selecciona un empleado…"
          options={options.map((employee) => ({
            value: employee.id,
            label: fullName(employee),
            detail: employee.identity,
          }))}
          value={form.values.employeeId}
          onChange={(value) => form.set("employeeId", value)}
          error={form.errors.employeeId}
        />
        <InlineError>{form.errors.form}</InlineError>
        <ModalFooter
          onCancel={onClose}
          label={mockMode ? "Crear invitación" : "Enviar invitación"}
          busy={form.busy}
          disabled={!form.valid}
        />
      </form>
    </Modal>
  );
}

export function DeactivateModal({
  account,
  onClose,
}: {
  account: Account;
  onClose(): void;
}) {
  const { application, snapshot, refresh, notify } = useApplication();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const activeLoans = snapshot.loans.filter(
    (loan) => loan.employeeId === account.employeeId && !loan.returnedOn,
  ).length;
  return (
    <Modal
      title="Desactivar usuario"
      description="La cuenta perderá el acceso a la aplicación."
      onClose={onClose}
      busy={busy}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          try {
            await application.deactivateUser(account.id);
            await refresh();
            notify("Cuenta desactivada. Sus préstamos se conservan.");
            onClose();
          } catch (reason) {
            setError(
              reason instanceof Error
                ? reason.message
                : "No se pudo desactivar la cuenta.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="rounded-lg border border-border bg-panel p-4">
          <p className="font-medium">{account.name}</p>
          <p className="mt-1 text-[13px] text-muted">{account.email}</p>
          <div className="mt-3">
            <Badge tone="neutral">{roleLabels[account.role]}</Badge>
          </div>
        </div>
        <p className="my-4 text-[13px] text-muted">
          Tiene{" "}
          <strong className="font-medium text-ink">
            {activeLoans}{" "}
            {activeLoans === 1 ? "préstamo activo" : "préstamos activos"}
          </strong>
          . Desactivar la cuenta no registra devoluciones ni cierra préstamos.
        </p>
        <InlineError>{error}</InlineError>
        <ModalFooter
          onCancel={onClose}
          label="Desactivar usuario"
          busy={busy}
          danger
        />
      </form>
    </Modal>
  );
}
