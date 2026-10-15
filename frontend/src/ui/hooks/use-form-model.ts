"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import type { z } from "zod";
import { DomainError, type FieldErrors } from "@/business/entities/models";

export type FormValues<T> = { [K in keyof T]: string };

export function useFormModel<T extends Record<string, string>>(
  schema: z.ZodType<T>,
  initial: FormValues<T>,
  submit: (values: T) => Promise<void>,
) {
  const [values, setValues] = useState<FormValues<T>>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const formId = useId();
  const result = schema.safeParse(values);
  const valid =
    result.success &&
    Object.keys(errors).filter((field) => field !== "form").length === 0;

  function set<K extends keyof T>(key: K, value: string) {
    setValues((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) =>
      Object.fromEntries(
        Object.entries(previous).filter(
          ([field]) => field !== key && field !== "form",
        ),
      ),
    );
  }
  function blur(key: keyof T) {
    const parsed = schema.safeParse(values);
    const issue = parsed.success
      ? undefined
      : parsed.error.issues.find((item) => item.path[0] === key);
    if (issue) setErrors((previous) => ({ ...previous, [key]: issue.message }));
  }
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [
            String(issue.path[0]),
            issue.message,
          ]),
        ),
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    setErrors({});
    try {
      await submit(parsed.data);
    } catch (error) {
      const fields = error instanceof DomainError ? error.fields : {};
      setErrors(
        Object.keys(fields).length
          ? fields
          : {
              form:
                error instanceof Error
                  ? error.message
                  : "No se pudo completar la acción.",
            },
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function field(key: keyof T & string) {
    return {
      id: `${formId}-${key}`,
      name: key,
      value: values[key],
      error: errors[key],
      onBlur: () => blur(key),
      onChange: (event: { target: { value: string } }) =>
        set(key, event.target.value),
    };
  }
  return { values, errors, busy, valid, field, set, onSubmit };
}
