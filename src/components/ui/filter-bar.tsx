import type { ReactNode } from "react";

/** GET form for list filters: works without JavaScript and keeps filters in the URL. */
export function FilterBar({ children, resetHref }: { children: ReactNode; resetHref: string }) {
  return (
    <form method="get" role="search" className="flex flex-wrap items-end gap-3 border-b border-border px-5 py-4">
      {children}
      <button type="submit" className="h-10 rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-surface-muted">
        Filtrer
      </button>
      <a href={resetHref} className="h-10 px-2 text-sm leading-10 text-text-muted hover:text-text">
        Réinitialiser
      </a>
    </form>
  );
}

export function FilterSelect({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <select name={name} defaultValue={value ?? ""} className="h-10 rounded-lg border border-border bg-surface px-3 text-sm">
        <option value="">Tous</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterSearch({ value, placeholder }: { value?: string; placeholder: string }) {
  return (
    <label className="min-w-48 flex-1 text-sm">
      <span className="mb-1 block font-medium">Recherche</span>
      <input
        type="search"
        name="q"
        defaultValue={value}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm"
      />
    </label>
  );
}
