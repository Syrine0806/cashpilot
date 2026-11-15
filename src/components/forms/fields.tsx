"use client";

import clsx from "clsx";
import { useId, type ComponentProps, type ReactNode } from "react";
import { useFormState } from "./action-form";

const CONTROL =
  "block w-full rounded-lg border bg-surface px-3 text-sm text-text shadow-[inset_0_1px_0_rgb(0_0_0/0.02)] transition-colors placeholder:text-text-muted hover:border-border-strong focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15 disabled:bg-surface-muted";

function useField(name: string, defaultValue?: string | number | null) {
  const state = useFormState();
  const error = state.fieldErrors?.[name]?.[0];
  const value = state.values?.[name] ?? (defaultValue === null || defaultValue === undefined ? undefined : String(defaultValue));
  return { error, value };
}

function FieldShell({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label?: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("min-w-0", className)}>
      {label && (
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-text">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-negative">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>
      )}
    </div>
  );
}

type InputProps = Omit<ComponentProps<"input">, "defaultValue"> & {
  name: string;
  label?: string;
  hint?: ReactNode;
  defaultValue?: string | number | null;
  wrapperClassName?: string;
};

export function Input({ name, label, hint, defaultValue, className, wrapperClassName, id, ...props }: InputProps) {
  const generated = useId();
  const inputId = id ?? generated;
  const { error, value } = useField(name, defaultValue);
  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error} className={wrapperClassName}>
      <input
        id={inputId}
        name={name}
        defaultValue={props.type === "file" ? undefined : value}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={clsx(CONTROL, "h-10", error ? "border-negative" : "border-border", props.type === "file" && "py-2", className)}
        {...props}
      />
    </FieldShell>
  );
}

/** Amount input: accepts "1 234,500" — parsed on the server into millimes. */
export function AmountInput(props: Omit<InputProps, "type" | "inputMode">) {
  return (
    <Input
      type="text"
      inputMode="decimal"
      pattern="-?[0-9 ]+([.,][0-9]{1,3})?"
      title="Montant, ex. 1250,500"
      placeholder="0,000"
      autoComplete="off"
      {...props}
      className={clsx("text-right tabular", props.className)}
    />
  );
}

type SelectProps = Omit<ComponentProps<"select">, "defaultValue"> & {
  name: string;
  label?: string;
  hint?: ReactNode;
  defaultValue?: string | null;
  options: { value: string; label: string }[];
  placeholder?: string;
  wrapperClassName?: string;
};

export function Select({ name, label, hint, defaultValue, options, placeholder, className, wrapperClassName, id, ...props }: SelectProps) {
  const generated = useId();
  const selectId = id ?? generated;
  const { error, value } = useField(name, defaultValue);
  return (
    <FieldShell id={selectId} label={label} hint={hint} error={error} className={wrapperClassName}>
      <select
        id={selectId}
        name={name}
        defaultValue={value ?? ""}
        aria-invalid={Boolean(error)}
        className={clsx(CONTROL, "h-10", error ? "border-negative" : "border-border", className)}
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

type TextareaProps = Omit<ComponentProps<"textarea">, "defaultValue"> & {
  name: string;
  label?: string;
  hint?: ReactNode;
  defaultValue?: string | null;
  wrapperClassName?: string;
};

export function Textarea({ name, label, hint, defaultValue, className, wrapperClassName, id, ...props }: TextareaProps) {
  const generated = useId();
  const areaId = id ?? generated;
  const { error, value } = useField(name, defaultValue);
  return (
    <FieldShell id={areaId} label={label} hint={hint} error={error} className={wrapperClassName}>
      <textarea
        id={areaId}
        name={name}
        rows={3}
        defaultValue={value}
        aria-invalid={Boolean(error)}
        className={clsx(CONTROL, "py-2", error ? "border-negative" : "border-border", className)}
        {...props}
      />
    </FieldShell>
  );
}

export function Checkbox({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-text">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 rounded border-border accent-[var(--brand)]" />
      {label}
    </label>
  );
}
