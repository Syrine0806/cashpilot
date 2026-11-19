import clsx from "clsx";
import { Plane } from "lucide-react";
import { formatDate } from "@/domain/dates";
import type { Runway } from "@/domain/forecast";

const STATUS = {
  safe: { label: "Cap stable", bar: "from-[var(--brand)] to-[var(--accent)]", text: "text-positive", chip: "bg-positive-soft text-positive" },
  watch: { label: "Turbulences à venir", bar: "from-[var(--warning)] to-[var(--warning)]", text: "text-warning", chip: "bg-warning-soft text-warning" },
  critical: { label: "Alerte trésorerie", bar: "from-[var(--negative)] to-[var(--negative)]", text: "text-negative", chip: "bg-negative-soft text-negative" },
} as const;

/**
 * Cash runway: how many days the company can operate before its projected
 * balance first goes below zero (within the forecast horizon).
 */
export function RunwayGauge({ runway }: { runway: Runway }) {
  const status = STATUS[runway.status];
  const ratio = runway.days === null ? 1 : Math.min(runway.days / runway.horizonDays, 1);
  const marks = [30, 60, 90].filter((m) => m <= runway.horizonDays);

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-text-muted">Autonomie de trésorerie</p>
          <p className={clsx("mt-1 text-3xl font-semibold tracking-tight tabular", runway.status !== "safe" && status.text)}>
            {runway.days === null ? `> ${runway.horizonDays} j` : `${runway.days} j`}
          </p>
        </div>
        <span className={clsx("rounded-full px-2.5 py-1 text-xs font-semibold", status.chip)}>{status.label}</span>
      </div>

      <div className="relative mt-5" role="img" aria-label={runway.days === null ? `Solde positif sur ${runway.horizonDays} jours` : `Premier solde négatif dans ${runway.days} jours`}>
        <div className="h-2.5 overflow-hidden rounded-full bg-surface-muted ring-1 ring-inset ring-border">
          <div className={clsx("h-full rounded-full bg-gradient-to-r", status.bar)} style={{ width: `${Math.max(ratio * 100, 3)}%` }} />
        </div>
        <span
          className={clsx("absolute -top-[9px] grid size-7 -translate-x-1/2 place-items-center rounded-full border-2 border-surface bg-surface shadow-card", status.text)}
          style={{ left: `${Math.min(Math.max(ratio * 100, 3), 97)}%` }}
        >
          <Plane className="size-3.5 rotate-45" aria-hidden />
        </span>
        <div className="relative mt-2 h-4 text-[11px] text-text-muted">
          <span className="absolute left-0">Auj.</span>
          {marks.map((m) => (
            <span key={m} className="absolute -translate-x-1/2" style={{ left: `${(m / runway.horizonDays) * 100}%` }}>
              {m === runway.horizonDays ? "" : `J+${m}`}
            </span>
          ))}
          <span className="absolute right-0">J+{runway.horizonDays}</span>
        </div>
      </div>

      <p className="mt-3 text-xs text-text-secondary">
        {runway.date
          ? `Premier découvert prévu le ${formatDate(runway.date)}.`
          : `Le solde prévisionnel reste positif sur les ${runway.horizonDays} prochains jours.`}
      </p>
    </div>
  );
}
