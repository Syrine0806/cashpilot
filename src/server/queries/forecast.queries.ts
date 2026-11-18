import "server-only";
import { toISODate } from "@/domain/dates";
import { buildForecastFlows, computeForecast, type ForecastSnapshot } from "@/domain/forecast";
import { mulDivRound } from "@/domain/money";
import { prisma } from "../db";
import { today } from "../env";
import { getRealBalance } from "./treasury.queries";

/** Loads everything the forecast engine needs, as plain domain objects. */
export async function loadForecastSnapshot(companyId: string): Promise<ForecastSnapshot & { referenceBalance: number }> {
  const todayISO = today();
  const [real, invoices, expenses, plannedFlows, retainers] = await Promise.all([
    getRealBalance(companyId),
    prisma.invoice.findMany({
      where: { companyId, status: "ISSUED" },
      include: { client: { select: { name: true } }, payments: { select: { amount: true } } },
    }),
    prisma.expense.findMany({ where: { companyId, status: { in: ["APPROVED", "SUBMITTED"] } } }),
    prisma.plannedFlow.findMany({ where: { companyId, active: true } }),
    prisma.retainer.findMany({
      where: { companyId, active: true },
      include: {
        client: { select: { name: true } },
        invoices: { where: { status: { in: ["ISSUED", "CANCELLED"] } }, select: { retainerPeriod: true } },
      },
    }),
  ]);

  return {
    today: todayISO,
    referenceBalance: real.balance,
    invoices: invoices.map((inv) => ({
      id: inv.id,
      number: inv.number ?? "—",
      clientName: inv.client.name,
      dueDate: toISODate(inv.dueDate),
      remaining: inv.total - inv.payments.reduce((s, p) => s + p.amount, 0),
    })),
    expenses: expenses.map((e) => ({
      id: e.id,
      label: e.description,
      dueDate: toISODate(e.dueDate),
      amount: e.amount,
      status: e.status as "APPROVED" | "SUBMITTED",
    })),
    plannedFlows: plannedFlows.map((f) => ({
      id: f.id,
      label: f.label,
      direction: f.direction as "IN" | "OUT",
      amount: f.amount,
      startDate: toISODate(f.startDate),
      recurrence: f.recurrence as "NONE" | "MONTHLY",
      endDate: f.endDate ? toISODate(f.endDate) : null,
    })),
    retainers: retainers.map((r) => ({
      id: r.id,
      label: r.label,
      clientName: r.client.name,
      monthlyTotal: r.monthlyAmount + mulDivRound(r.monthlyAmount, r.taxRateBp, 10_000),
      dayOfMonth: r.dayOfMonth,
      startDate: toISODate(r.startDate),
      endDate: r.endDate ? toISODate(r.endDate) : null,
      invoicedPeriods: r.invoices.map((i) => i.retainerPeriod).filter((p): p is string => Boolean(p)),
    })),
  };
}

export async function getForecast(companyId: string, options: { horizonDays?: number; includePending?: boolean } = {}) {
  const snapshot = await loadForecastSnapshot(companyId);
  const horizonDays = options.horizonDays ?? 90;
  const flows = buildForecastFlows(snapshot, { horizonDays, includePending: options.includePending });
  return {
    snapshot,
    flows,
    forecast: computeForecast({ referenceDate: snapshot.today, referenceBalance: snapshot.referenceBalance, flows, horizonDays }),
  };
}
