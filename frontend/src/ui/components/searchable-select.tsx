"use client";

import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { useId, useState } from "react";

export interface SelectOption {
  value: string;
  label: string;
  detail?: string;
}
export function SearchableSelect({
  label,
  placeholder,
  options,
  value,
  onChange,
  error,
  required,
  disabled,
}: {
  label: string;
  placeholder: string;
  options: SelectOption[];
  value: string;
  onChange(value: string): void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const id = useId();
  const selected = options.find((option) => option.value === value);
  const normalized = (input: string) =>
    input
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const filtered = options.filter((option) =>
    normalized(`${option.label} ${option.detail ?? ""}`).includes(
      normalized(query),
    ),
  );
  const current = Math.min(active, Math.max(0, filtered.length - 1));
  function choose(next: string) {
    onChange(next);
    setOpen(false);
    setQuery("");
    setActive(0);
  }

  return (
    <div className="field">
      <label id={`${id}-label`} htmlFor={id}>
        {label}
        {required && <span className="text-muted"> *</span>}
      </label>
      <Popover.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          setQuery("");
          setActive(0);
        }}
      >
        <Popover.Trigger asChild>
          <button
            id={id}
            type="button"
            className="input flex items-center justify-between text-left"
            role="combobox"
            aria-expanded={open}
            aria-controls={`${id}-options`}
            aria-labelledby={`${id}-label`}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
            disabled={disabled}
          >
            <span className={`truncate ${selected ? "" : "text-muted"}`}>
              {selected?.label ?? placeholder}
            </span>
            <ChevronsUpDown size={16} className="shrink-0 text-muted" />
          </button>
        </Popover.Trigger>
        <Popover.Content
          align="start"
          className="select-popover"
          sideOffset={4}
        >
          <div className="relative border-b border-border">
            <Search size={16} className="absolute left-3 top-3 text-muted" />
            <input
              role="searchbox"
              className="w-full py-2.5 pl-9 pr-3 outline-none"
              aria-label={`Buscar ${label.toLowerCase()}`}
              aria-controls={`${id}-options`}
              aria-activedescendant={
                filtered[current] ? `${id}-option-${current}` : undefined
              }
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActive((index) =>
                    Math.min(index + 1, filtered.length - 1),
                  );
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActive((index) => Math.max(0, index - 1));
                }
                if (event.key === "Enter") {
                  event.preventDefault();
                  const option = filtered[current];
                  if (option) choose(option.value);
                }
              }}
            />
            <div
              id={`${id}-options`}
              role="listbox"
              aria-labelledby={`${id}-label`}
              className="max-h-56 overflow-auto p-1"
            >
              {filtered.length ? (
                filtered.map((option, index) => (
                  <button
                    id={`${id}-option-${index}`}
                    key={option.value}
                    role="option"
                    aria-selected={option.value === value}
                    type="button"
                    className={`select-option ${current === index ? "bg-panel" : ""}`}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(option.value)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{option.label}</span>
                      {option.detail && (
                        <span className="block font-mono text-xs text-muted">
                          {option.detail}
                        </span>
                      )}
                    </span>
                    {option.value === value && (
                      <Check size={16} className="text-primary" />
                    )}
                  </button>
                ))
              ) : (
                <p className="p-4 text-center text-muted">No hay resultados.</p>
              )}
            </div>
          </div>
        </Popover.Content>
      </Popover.Root>
      {value && !required && (
        <button
          type="button"
          className="link self-start text-xs"
          onClick={() => onChange("")}
        >
          <X size={12} />
          Quitar selección
        </button>
      )}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
