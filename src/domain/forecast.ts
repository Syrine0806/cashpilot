/**
 * Cash forecast engine (pure, framework-free, unit-tested).
 *
 * Rule from the specification:
 *   forecast balance at date D = real reference balance
 *                              + expected receipts still due up to D
 *                              − planned disbursements still due up to D
 *
 * Only *remaining* amounts are used (an invoice contributes total − payments
 * already received), so money already collected is never counted twice:
 * it is already part of the real balance.
 */
import {
  addDays,
  diffDays,
  maxDate,
  monthKey,
  monthlyOccurrences,
  type ISODate,
} from "./dates";
import { sum, type Millimes } from "./money";

export const FORECAST_HORIZONS = [30, 60, 90] as const;
export type ForecastHorizon = (typeof FORECAST_HORIZONS)[number];

export type FlowSource = "INVOICE" | "EXPENSE" | "PENDING_EXPENSE" | "PLANNED" | "RETAINER" | "SIMULATION";

export const FLOW_SOURCE_LABELS: Record<FlowSource, string> = {
  INVOICE: "Facture client",
  EXPENSE: "Dépense approuvée",
  PENDING_EXPENSE: "Dépense en attente",
  PLANNED: "Flux planifié",
  RETAINER: "Contrat récurrent",
  SIMULATION: "Hypothèse simulée",
};

export interface ForecastFlow {
  /** Unique key of the flow (e.g. "invoice:abc", "planned:xyz:2026-12-05"). */
  key: string;
  /** Date at which the cash movement is expected. */
  date: ISODate;
  /** Signed amount: positive = receipt, negative = disbursement. */
  amount: Millimes;
  label: string;
  source: FlowSource;
  /** Id of the underlying record (invoice, expense…), if any. */
  refId?: string;
  /** Contractual date when the flow was moved (overdue or simulated delay). */
  originalDate?: ISODate;
  /** Human-readable explanation of the hypothesis applied to this flow. */
  note?: string;
}

export interface ForecastPoint {
  date: ISODate;
  balance: Millimes;
  inflow: Millimes;
  outflow: Millimes;
}

export interface Milestone {
  days: number;
  date: ISODate;
  balance: Millimes;
  inflows: Millimes;
  outflows: Millimes;
}

export interface Shortfall {
  start: ISODate;
  /** Last day with a negative balance within the horizon. */
  end: ISODate;
  lowestBalance: Millimes;
  lowestDate: ISODate;
  /** True when the balance is still negative at the end of the horizon. */
  openEnded: boolean;
}

export interface Forecast {
  referenceDate: ISODate;
  referenceBalance: Millimes;
  horizonDays: number;
  endDate: ISODate;
  points: ForecastPoint[];
  flows: (ForecastFlow & { balanceAfter: Millimes })[];
  milestones: Milestone[];
  lowest: { date: ISODate; balance: Millimes };
  shortfalls: Shortfall[];
  totals: { inflows: Millimes; outflows: Millimes };
}

export interface ForecastInput {
  referenceDate: ISODate;
  referenceBalance: Millimes;
  flows: readonly ForecastFlow[];
  horizonDays?: number;
}

/** Projects the balance day by day from the reference date. */
export function computeForecast({ referenceDate, referenceBalance, flows, horizonDays = 90 }: ForecastInput): Forecast {
  const endDate = addDays(referenceDate, horizonDays);

  // Flows dated before the reference date are expected "today" (defensive: builders already do this).
  const inHorizon = flows
    .map((flow) => (flow.date < referenceDate ? { ...flow, date: referenceDate, originalDate: flow.originalDate ?? flow.date } : flow))
    .filter((flow) => flow.date <= endDate && flow.amount !== 0)
    .sort((a, b) => (a.date === b.date ? b.amount - a.amount || a.key.localeCompare(b.key) : a.date < b.date ? -1 : 1));

  const byDate = new Map<ISODate, ForecastFlow[]>();
  for (const flow of inHorizon) {
    const list = byDate.get(flow.date) ?? [];
    list.push(flow);
    byDate.set(flow.date, list);
  }

  const points: ForecastPoint[] = [];
  const explained: (ForecastFlow & { balanceAfter: Millimes })[] = [];
  let balance = referenceBalance;

  for (let day = 0; day <= horizonDays; day += 1) {
    const date = addDays(referenceDate, day);
    const todays = byDate.get(date) ?? [];
    let inflow = 0;
    let outflow = 0;
    for (const flow of todays) {
      balance += flow.amount;
      if (flow.amount > 0) inflow += flow.amount;
      else outflow += -flow.amount;
      explained.push({ ...flow, balanceAfter: balance });
    }
    points.push({ date, balance, inflow, outflow });
  }

  const milestones = FORECAST_HORIZONS.filter((h) => h <= horizonDays).map((days) => {
    const date = addDays(referenceDate, days);
    const upTo = inHorizon.filter((f) => f.date <= date);
    return {
      days,
      date,
      balance: points[days].balance,
      inflows: sum(upTo.filter((f) => f.amount > 0).map((f) => f.amount)),
      outflows: sum(upTo.filter((f) => f.amount < 0).map((f) => -f.amount)),
    };
  });

  const lowestPoint = points.reduce((low, p) => (p.balance < low.balance ? p : low), points[0]);

  return {
    referenceDate,
    referenceBalance,
    horizonDays,
    endDate,
    points,
    flows: explained,
    milestones,
    lowest: { date: lowestPoint.date, balance: lowestPoint.balance },
    shortfalls: findShortfalls(points),
    totals: {
      inflows: sum(inHorizon.filter((f) => f.amount > 0).map((f) => f.amount)),
      outflows: sum(inHorizon.filter((f) => f.amount < 0).map((f) => -f.amount)),
    },
  };
}

/** Groups consecutive days with a negative balance into periods. */
export function findShortfalls(points: readonly ForecastPoint[]): Shortfall[] {
  const result: Shortfall[] = [];
  let current: Shortfall | null = null;
  for (const point of points) {
    if (point.balance < 0) {
      if (!current) {
        current = { start: point.date, end: point.date, lowestBalance: point.balance, lowestDate: point.date, openEnded: false };
      } else {
        current.end = point.date;
        if (point.balance < current.lowestBalance) {
          current.lowestBalance = point.balance;
          current.lowestDate = point.date;
        }
      }
    } else if (current) {
      result.push(current);
      current = null;
    }
  }
  if (current) result.push({ ...current, openEnded: true });
  return result;
}

/** Balance at a given date (inclusive), straight from the specification's formula. */
export function balanceAt(referenceBalance: Millimes, flows: readonly ForecastFlow[], date: ISODate): Millimes {
  return referenceBalance + sum(flows.filter((f) => f.date <= date).map((f) => f.amount));
}

// ---------------------------------------------------------------------------
// Building flows from the company's real data
// ---------------------------------------------------------------------------

export interface ForecastSnapshot {
  today: ISODate;
  /** Validated (ISSUED) invoices with a positive remaining amount. */
  invoices: { id: string; number: string; clientName: string; dueDate: ISODate; remaining: Millimes }[];
  /** Approved (and optionally submitted) expenses that are not paid yet. */
  expenses: { id: string; label: string; dueDate: ISODate; amount: Millimes; status: "APPROVED" | "SUBMITTED" }[];
  plannedFlows: {
    id: string;
    label: string;
    direction: "IN" | "OUT";
    amount: Millimes;
    startDate: ISODate;
    recurrence: "NONE" | "MONTHLY";
    endDate: ISODate | null;
  }[];
  retainers: {
    id: string;
    label: string;
    clientName: string;
    /** Amount including tax expected each month. */
    monthlyTotal: Millimes;
    dayOfMonth: number;
    startDate: ISODate;
    endDate: ISODate | null;
    /** "YYYY-MM" periods already invoiced (they are counted through the invoice). */
    invoicedPeriods: string[];
  }[];
}

export interface BuildOptions {
  horizonDays?: number;
  /** Include expenses still waiting for approval (prudent view). */
  includePending?: boolean;
}

export function buildForecastFlows(snapshot: ForecastSnapshot, options: BuildOptions = {}): ForecastFlow[] {
  const { today } = snapshot;
  const horizonEnd = addDays(today, options.horizonDays ?? 90);
  const flows: ForecastFlow[] = [];

  for (const invoice of snapshot.invoices) {
    if (invoice.remaining <= 0) continue;
    const overdue = invoice.dueDate < today;
    flows.push({
      key: `invoice:${invoice.id}`,
      refId: invoice.id,
      source: "INVOICE",
      label: `${invoice.number} · ${invoice.clientName}`,
      amount: invoice.remaining,
      date: overdue ? today : invoice.dueDate,
      originalDate: overdue ? invoice.dueDate : undefined,
      note: overdue
        ? `Échue depuis ${diffDays(invoice.dueDate, today)} j : supposée encaissée aujourd'hui (reste à payer uniquement).`
        : "Reste à payer attendu à l'échéance.",
    });
  }

  for (const expense of snapshot.expenses) {
    if (expense.status === "SUBMITTED" && !options.includePending) continue;
    const overdue = expense.dueDate < today;
    flows.push({
      key: `expense:${expense.id}`,
      refId: expense.id,
      source: expense.status === "APPROVED" ? "EXPENSE" : "PENDING_EXPENSE",
      label: expense.label,
      amount: -expense.amount,
      date: overdue ? today : expense.dueDate,
      originalDate: overdue ? expense.dueDate : undefined,
      note: overdue ? "Date de paiement dépassée : supposée payée aujourd'hui." : undefined,
    });
  }

  for (const planned of snapshot.plannedFlows) {
    const sign = planned.direction === "IN" ? 1 : -1;
    if (planned.recurrence === "NONE") {
      if (planned.startDate < today || planned.startDate > horizonEnd) continue;
      flows.push({
        key: `planned:${planned.id}`,
        refId: planned.id,
        source: "PLANNED",
        label: planned.label,
        amount: sign * planned.amount,
        date: planned.startDate,
      });
      continue;
    }
    const day = Number(planned.startDate.slice(8, 10));
    const to = planned.endDate && planned.endDate < horizonEnd ? planned.endDate : horizonEnd;
    for (const date of monthlyOccurrences(day, maxDate(planned.startDate, today), to)) {
      flows.push({
        key: `planned:${planned.id}:${date}`,
        refId: planned.id,
        source: "PLANNED",
        label: planned.label,
        amount: sign * planned.amount,
        date,
        note: "Occurrence mensuelle.",
      });
    }
  }

  for (const retainer of snapshot.retainers) {
    const to = retainer.endDate && retainer.endDate < horizonEnd ? retainer.endDate : horizonEnd;
    for (const date of monthlyOccurrences(retainer.dayOfMonth, maxDate(retainer.startDate, today), to)) {
      if (retainer.invoicedPeriods.includes(monthKey(date))) continue; // counted through its invoice
      flows.push({
        key: `retainer:${retainer.id}:${monthKey(date)}`,
        refId: retainer.id,
        source: "RETAINER",
        label: `${retainer.label} · ${retainer.clientName}`,
        amount: retainer.monthlyTotal,
        date,
        note: `Mensualité ${monthKey(date)} pas encore facturée.`,
      });
    }
  }

  return flows;
}

// ---------------------------------------------------------------------------
// Cash runway ("autonomie de trésorerie")
// ---------------------------------------------------------------------------

export type RunwayStatus = "safe" | "watch" | "critical";

export interface Runway {
  /** Days before the balance first becomes negative, or null if it never does within the horizon. */
  days: number | null;
  date: ISODate | null;
  status: RunwayStatus;
  horizonDays: number;
}

/** Critical: shortfall within 30 days (or already negative); watch: later within the horizon. */
export function computeRunway(forecast: Pick<Forecast, "referenceDate" | "shortfalls" | "horizonDays">): Runway {
  const first = forecast.shortfalls[0];
  if (!first) return { days: null, date: null, status: "safe", horizonDays: forecast.horizonDays };
  const days = diffDays(forecast.referenceDate, first.start);
  return { days, date: first.start, status: days <= 30 ? "critical" : "watch", horizonDays: forecast.horizonDays };
}
