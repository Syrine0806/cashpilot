import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatShortDate } from "@/domain/dates";
import { FLOW_SOURCE_LABELS, type ForecastFlow } from "@/domain/forecast";
import { formatMoney } from "@/domain/money";

/** Next expected receipts or disbursements (from the forecast engine). */
export function UpcomingFlows({ flows, direction }: { flows: ForecastFlow[]; direction: "in" | "out" }) {
  if (flows.length === 0) {
    return <p className="px-5 py-6 text-sm text-text-muted">{direction === "in" ? "Aucun encaissement attendu sur 30 jours." : "Aucun décaissement prévu sur 30 jours."}</p>;
  }
  const Icon = direction === "in" ? ArrowDownLeft : ArrowUpRight;
  return (
    <ul className="divide-y divide-border">
      {flows.map((flow) => (
        <li key={flow.key} className="flex items-center gap-3 px-5 py-3">
          <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${direction === "in" ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative"}`}>
            <Icon className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{flow.label}</p>
            <p className="text-xs text-text-muted">
              {FLOW_SOURCE_LABELS[flow.source]} · {formatShortDate(flow.date)}
              {flow.originalDate && " · en retard"}
            </p>
          </div>
          <span className={`text-sm font-semibold tabular ${direction === "in" ? "text-positive" : "text-text"}`}>
            {formatMoney(flow.amount, { signed: true })}
          </span>
        </li>
      ))}
    </ul>
  );
}
