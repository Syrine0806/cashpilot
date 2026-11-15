import clsx from "clsx";
import type { ReactNode } from "react";

type Tone = "neutral" | "negative" | "warning" | "positive";

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
  footer,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={clsx(
        "relative min-w-0 animate-rise overflow-hidden rounded-2xl border bg-surface p-4 shadow-card",
        tone === "negative" ? "border-negative/35" : tone === "warning" ? "border-warning/35" : "border-border",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-text-muted">{label}</p>
        {icon && (
          <span
            className={clsx(
              "grid size-7 place-items-center rounded-lg",
              tone === "negative" ? "bg-negative-soft text-negative" : tone === "warning" ? "bg-warning-soft text-warning" : "bg-brand-soft text-brand",
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <p
        className={clsx(
          "mt-2 truncate text-2xl font-semibold tracking-tight tabular",
          tone === "negative" && "text-negative",
          tone === "positive" && "text-positive",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}
