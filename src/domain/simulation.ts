/**
 * "What if?" simulation. A scenario is a list of hypotheses applied in memory
 * to a copy of the real forecast flows. Real data is never touched: the
 * functions below are pure and never mutate their inputs.
 */
import { addDays, diffDays, formatDate, maxDate, type ISODate } from "./dates";
import { computeForecast, type Forecast, type ForecastFlow, type Shortfall } from "./forecast";
import { formatMoney, type Millimes } from "./money";

export const ADJUSTMENT_KINDS = ["DELAY_INVOICE", "NEW_EXPENSE", "NEW_INFLOW"] as const;
export type AdjustmentKind = (typeof ADJUSTMENT_KINDS)[number];

export const ADJUSTMENT_LABELS: Record<AdjustmentKind, string> = {
  DELAY_INVOICE: "Retard de paiement client",
  NEW_EXPENSE: "Nouvelle dépense",
  NEW_INFLOW: "Rentrée prévue",
};

export type Adjustment =
  | { id: string; kind: "DELAY_INVOICE"; invoiceId: string; delayDays: number }
  | { id: string; kind: "NEW_EXPENSE"; label: string; amount: Millimes; date: ISODate }
  | { id: string; kind: "NEW_INFLOW"; label: string; amount: Millimes; date: ISODate };

export function describeAdjustment(adjustment: Adjustment, invoiceLabel?: string): string {
  switch (adjustment.kind) {
    case "DELAY_INVOICE":
      return `${invoiceLabel ?? "Facture"} payée avec ${adjustment.delayDays} jour(s) de retard`;
    case "NEW_EXPENSE":
      return `${adjustment.label} : −${formatMoney(adjustment.amount)} le ${formatDate(adjustment.date)}`;
    case "NEW_INFLOW":
      return `${adjustment.label} : +${formatMoney(adjustment.amount)} le ${formatDate(adjustment.date)}`;
  }
}

export function applyScenario(flows: readonly ForecastFlow[], adjustments: readonly Adjustment[], today: ISODate): ForecastFlow[] {
  // Work on shallow copies: the real flows array and its objects stay untouched.
  let result = flows.map((flow) => ({ ...flow }));

  for (const adjustment of adjustments) {
    switch (adjustment.kind) {
      case "DELAY_INVOICE": {
        result = result.map((flow) => {
          if (flow.source !== "INVOICE" || flow.refId !== adjustment.invoiceId) return flow;
          const contractual = flow.originalDate ?? flow.date;
          const delayed = maxDate(addDays(contractual, adjustment.delayDays), today);
          return {
            ...flow,
            date: delayed,
            originalDate: contractual,
            note: `Retard simulé de ${adjustment.delayDays} j : échéance ${formatDate(contractual)} → encaissement ${formatDate(delayed)}.`,
          };
        });
        break;
      }
      case "NEW_EXPENSE":
      case "NEW_INFLOW": {
        const sign = adjustment.kind === "NEW_EXPENSE" ? -1 : 1;
        const date = maxDate(adjustment.date, today);
        result.push({
          key: `simulation:${adjustment.id}`,
          refId: adjustment.id,
          source: "SIMULATION",
          label: adjustment.label,
          amount: sign * adjustment.amount,
          date,
          note: adjustment.kind === "NEW_EXPENSE" ? "Dépense hypothétique." : "Rentrée hypothétique.",
        });
        break;
      }
    }
  }
  return result;
}

export interface MilestoneComparison {
  days: number;
  date: ISODate;
  base: Millimes;
  simulated: Millimes;
  difference: Millimes;
}

export interface ScenarioComparison {
  base: Forecast;
  simulated: Forecast;
  milestones: MilestoneComparison[];
  /** Daily series ready for a two-line chart. */
  series: { date: ISODate; base: Millimes; simulated: Millimes }[];
  newShortfalls: Shortfall[];
  lowestDifference: Millimes;
}

export function compareScenario(params: {
  referenceDate: ISODate;
  referenceBalance: Millimes;
  flows: readonly ForecastFlow[];
  adjustments: readonly Adjustment[];
  horizonDays?: number;
}): ScenarioComparison {
  const { referenceDate, referenceBalance, flows, adjustments, horizonDays = 90 } = params;
  const base = computeForecast({ referenceDate, referenceBalance, flows, horizonDays });
  const simulatedFlows = applyScenario(flows, adjustments, referenceDate);
  const simulated = computeForecast({ referenceDate, referenceBalance, flows: simulatedFlows, horizonDays });

  const milestones = base.milestones.map((m, i) => ({
    days: m.days,
    date: m.date,
    base: m.balance,
    simulated: simulated.milestones[i].balance,
    difference: simulated.milestones[i].balance - m.balance,
  }));

  const series = base.points.map((p, i) => ({ date: p.date, base: p.balance, simulated: simulated.points[i].balance }));

  // Shortfall periods that do not exist (or start on another day) in the base projection.
  const newShortfalls = simulated.shortfalls.filter(
    (s) => !base.shortfalls.some((b) => b.start === s.start && b.end === s.end),
  );

  return {
    base,
    simulated,
    milestones,
    series,
    newShortfalls,
    lowestDifference: simulated.lowest.balance - base.lowest.balance,
  };
}

export function shortfallLength(shortfall: Shortfall): number {
  return diffDays(shortfall.start, shortfall.end) + 1;
}
