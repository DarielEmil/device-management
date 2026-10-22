"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Search,
  X,
} from "lucide-react";
import {
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { statusLabels, type StatusValue } from "../format";

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      type="button"
      className={`button button-${variant} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
}
export function Input({
  label,
  error,
  hint,
  required,
  id,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="field">
      <label htmlFor={inputId}>
        {label}
        {required && (
          <span className="text-muted" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      <input
        className={`input ${className}`}
        id={inputId}
        aria-required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? `${inputId}-description` : undefined}
        {...props}
      />
      {(error || hint) && (
        <p
          id={`${inputId}-description`}
          className={error ? "field-error" : "field-hint"}
        >
          {error && <AlertCircle size={12} />}
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
export function Select({
  label,
  error,
  hint,
  required,
  id,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="field">
      <label htmlFor={inputId}>
        {label}
        {required && (
          <span className="text-muted" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      <div className="relative">
        <select
          className="input appearance-none pr-8"
          id={inputId}
          aria-required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error || hint ? `${inputId}-description` : undefined
          }
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-3 text-muted"
          size={14}
        />
      </div>
      {(error || hint) && (
        <p
          id={`${inputId}-description`}
          className={error ? "field-error" : "field-hint"}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
type BadgeTone = "success" | "info" | "neutral" | "warning" | "danger";
const statusTones: Record<StatusValue, BadgeTone> = {
  available: "success",
  loaned: "info",
  active: "info",
  returned: "neutral",
  due_soon: "warning",
  overdue: "danger",
  inactive: "neutral",
  invited: "warning",
};
export function Badge({
  children,
  tone = "neutral",
}: {
  children: string;
  tone?: BadgeTone;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function StatusBadge({
  status,
  tone,
}: {
  status: StatusValue;
  tone?: BadgeTone;
}) {
  return (
    <Badge tone={tone ?? statusTones[status]}>{statusLabels[status]}</Badge>
  );
}
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        <p className="mt-1 text-muted">{subtitle}</p>
      </div>
      {action}
    </header>
  );
}
export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange(value: string): void;
  placeholder: string;
}) {
  return (
    <div className="relative min-w-60 flex-1 max-w-md">
      <Search size={16} className="absolute left-3 top-3 text-muted" />
      <input
        aria-label={placeholder}
        className="input pl-9 pr-9"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="p-12 text-center">
      <h3>{title}</h3>
      <p className="mt-2 text-muted">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
export function InlineError({ children }: { children?: ReactNode }) {
  return children ? (
    <p className="field-error" role="alert">
      <AlertCircle size={14} />
      {children}
    </p>
  ) : null;
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="notice" role="status">
      <Check size={16} />
      {children}
    </div>
  );
}
export function Modal({
  title,
  description,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  onClose(): void;
  busy?: boolean;
}) {
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          className="modal-content"
          onOpenAutoFocus={() => {
            returnFocus.current =
              document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const target = returnFocus.current;
            if (target?.isConnected) target.focus();
            else document.getElementById("contenido")?.focus();
          }}
          onInteractOutside={(event) => {
            if (busy) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault();
          }}
        >
          <div className="mb-6 pr-8">
            <Dialog.Title className="text-xl font-semibold leading-7">
              {title}
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-muted">
              {description}
            </Dialog.Description>
          </div>
          <Dialog.Close
            className="icon-button absolute right-5 top-5"
            aria-label="Cerrar modal"
            disabled={busy}
          >
            <X size={20} />
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function ModalFooter({
  onCancel,
  label,
  busy,
  disabled = false,
  danger = false,
}: {
  onCancel(): void;
  label: string;
  busy: boolean;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <footer className="modal-footer">
      <Button variant="secondary" onClick={onCancel} disabled={busy}>
        Cancelar
      </Button>
      <Button
        type="submit"
        variant={danger ? "danger" : "primary"}
        disabled={disabled || busy}
      >
        {busy ? "Guardando…" : label}
      </Button>
    </footer>
  );
}
export function Pagination({
  page,
  total,
  pageSize,
  onChange,
  noun = "registros",
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange(page: number): void;
  noun?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <footer className="table-footer">
      <span>
        Mostrando {total ? (page - 1) * pageSize + 1 : 0}–
        {Math.min(page * pageSize, total)} de {total} {noun}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Página anterior"
        >
          <ArrowLeft size={14} />
          Anterior
        </Button>
        <span className="px-2 text-ink" aria-live="polite">
          {page} / {pages}
        </span>
        <Button
          variant="secondary"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          aria-label="Página siguiente"
        >
          Siguiente
          <ArrowRight size={14} />
        </Button>
      </div>
    </footer>
  );
}
export function LoadingState() {
  return (
    <div role="status" aria-label="Cargando datos" className="space-y-6">
      <span className="sr-only">Cargando datos…</span>
      <div className="skeleton h-9 w-52" />
      <div className="grid grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="skeleton h-28" />
        ))}
      </div>
      <div className="panel p-5 space-y-5">
        {[0, 1, 2, 3, 4].map((item) => (
          <div key={item} className="skeleton h-6" />
        ))}
      </div>
    </div>
  );
}
