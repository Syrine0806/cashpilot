import "server-only";
import { addDays, diffDays, formatDate, formatInstant } from "@/domain/dates";
import { computeRunway } from "@/domain/forecast";
import { formatMoney } from "@/domain/money";
import { prisma } from "../db";
import { today } from "../env";
import { getForecast } from "./forecast.queries";
import { getBalanceHistory } from "./treasury.queries";
import { listInvoices } from "./invoice.queries";

export type AlertLevel = "danger" | "warning" | "info";
export interface Alert {
  /** Stable key for lists. */
  id: string;
  level: AlertLevel;
  title: string;
  detail: string;
  href: string;
}

/** Company-wide indicators and alerts (computed on the fly, always in sync with the data). */
export async function getDashboard(companyId: string) {
  const todayISO = today();
  const [{ forecast, snapshot }, history, invoices, pendingExpenses, approvedUnpaid] = await Promise.all([
    getForecast(companyId, { horizonDays: 90 }),
    getBalanceHistory(companyId, todayISO, 30),
    listInvoices(companyId),
    prisma.expense.findMany({
      where: { companyId, status: "SUBMITTED" },
      include: { submittedBy: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.expense.aggregate({ where: { companyId, status: "APPROVED" }, _sum: { amount: true }, _count: true }),
  ]);

  const overdue = invoices.filter((i) => i.status === "OVERDUE");
  const receivables = invoices.reduce((s, i) => s + i.remaining, 0);

  const alerts: Alert[] = [];
  for (const shortfall of forecast.shortfalls) {
    alerts.push({
      id: `shortfall-${shortfall.start}`,
      level: "danger",
      title: "Solde prévisionnel négatif",
      detail: `À partir du ${formatDate(shortfall.start)}${shortfall.openEnded ? " (au-delà de l'horizon)" : ` jusqu'au ${formatDate(shortfall.end)}`} — point bas ${formatMoney(shortfall.lowestBalance)} le ${formatDate(shortfall.lowestDate)}`,
      href: `/c/${companyId}/forecast`,
    });
  }
  for (const invoice of overdue) {
    alerts.push({
      id: `invoice-${invoice.id}`,
      level: "warning",
      title: `Facture ${invoice.number} en retard`,
      detail: `${invoice.clientName} · échue depuis ${diffDays(invoice.dueDate, todayISO)} j · reste à payer ${formatMoney(invoice.remaining)}`,
      href: `/c/${companyId}/invoices/${invoice.id}`,
    });
  }
  for (const expense of pendingExpenses) {
    alerts.push({
      id: `expense-${expense.id}`,
      level: "info",
      title: "Dépense à valider",
      detail: `${expense.description} · ${expense.submittedBy.name} · ${formatMoney(expense.amount)} · soumise le ${formatInstant(expense.createdAt)}`,
      href: `/c/${companyId}/expenses/${expense.id}`,
    });
  }

  const in30 = addDays(todayISO, 30);
  const next30 = forecast.flows.filter((f) => f.date <= in30);

  return {
    today: todayISO,
    realBalance: snapshot.referenceBalance,
    history,
    /** Variation of the real balance over the history window. */
    trend: history.length > 1 ? snapshot.referenceBalance - history[0].balance : 0,
    trendDays: Math.max(history.length - 1, 0),
    runway: computeRunway(forecast),
    upcomingIn: next30.filter((f) => f.amount > 0).slice(0, 5),
    upcomingOut: next30.filter((f) => f.amount < 0).slice(0, 5),
    receivables,
    overdueCount: overdue.length,
    overdueAmount: overdue.reduce((s, i) => s + i.remaining, 0),
    pendingExpenses: pendingExpenses.map((e) => ({ id: e.id, description: e.description, amount: e.amount, submittedBy: e.submittedBy.name })),
    approvedToPay: { count: approvedUnpaid._count, amount: approvedUnpaid._sum.amount ?? 0 },
    forecast,
    alerts,
  };
}

/** Lightweight counter for the navigation badge. */
export async function countAlerts(companyId: string): Promise<number> {
  const todayDate = new Date(`${today()}T00:00:00.000Z`);
  const [pending, issued] = await Promise.all([
    prisma.expense.count({ where: { companyId, status: "SUBMITTED" } }),
    prisma.invoice.findMany({
      where: { companyId, status: "ISSUED", dueDate: { lt: todayDate } },
      select: { total: true, payments: { select: { amount: true } } },
    }),
  ]);
  return pending + issued.filter((i) => i.total - i.payments.reduce((s, p) => s + p.amount, 0) > 0).length;
}
