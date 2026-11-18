import "server-only";
import { addDays, fromISODate, maxDate, toISODate } from "@/domain/dates";
import { prisma } from "../db";

/** Real balance = initial balance + Σ realised movements (single source of truth). */
export async function getRealBalance(companyId: string) {
  const [company, aggregate] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { initialBalance: true, initialBalanceDate: true } }),
    prisma.movement.aggregate({ where: { companyId }, _sum: { amount: true } }),
  ]);
  return {
    initialBalance: company.initialBalance,
    initialBalanceDate: toISODate(company.initialBalanceDate),
    movementsTotal: aggregate._sum.amount ?? 0,
    balance: company.initialBalance + (aggregate._sum.amount ?? 0),
  };
}

export interface MovementRow {
  id: string;
  date: string;
  amount: number;
  kind: string;
  label: string;
  balanceAfter: number;
  author: string;
  reversible: boolean;
  reversed: boolean;
  invoiceId: string | null;
  expenseId: string | null;
}

/** Full history with running balance, newest first. */
export async function listMovements(companyId: string): Promise<MovementRow[]> {
  const [company, movements, users] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { initialBalance: true } }),
    prisma.movement.findMany({
      where: { companyId },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      include: { reversedBy: { select: { id: true } }, payment: { select: { invoiceId: true } } },
    }),
    prisma.user.findMany({ where: { memberships: { some: { companyId } } }, select: { id: true, name: true } }),
  ]);
  const names = new Map(users.map((u) => [u.id, u.name]));
  let balance = company.initialBalance;
  const rows = movements.map((m) => {
    balance += m.amount;
    return {
      id: m.id,
      date: toISODate(m.date),
      amount: m.amount,
      kind: m.kind,
      label: m.label,
      balanceAfter: balance,
      author: names.get(m.createdById) ?? "—",
      reversible: (m.kind === "MANUAL_IN" || m.kind === "MANUAL_OUT") && !m.reversedBy,
      reversed: Boolean(m.reversedBy),
      invoiceId: m.payment?.invoiceId ?? null,
      expenseId: m.expenseId,
    };
  });
  return rows.reverse();
}

/** Daily real balance over the last `days` days (for the "flight path" chart). */
export async function getBalanceHistory(companyId: string, todayISO: string, days = 30): Promise<{ date: string; balance: number }[]> {
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { initialBalance: true, initialBalanceDate: true },
  });
  const initialDate = toISODate(company.initialBalanceDate);
  const from = maxDate(addDays(todayISO, -days), initialDate);
  const [before, inRange] = await Promise.all([
    prisma.movement.aggregate({ where: { companyId, date: { lt: fromISODate(from) } }, _sum: { amount: true } }),
    prisma.movement.findMany({ where: { companyId, date: { gte: fromISODate(from) } }, select: { date: true, amount: true } }),
  ]);
  const byDate = new Map<string, number>();
  for (const m of inRange) byDate.set(toISODate(m.date), (byDate.get(toISODate(m.date)) ?? 0) + m.amount);

  const points: { date: string; balance: number }[] = [];
  let balance = company.initialBalance + (before._sum.amount ?? 0);
  for (let date = from; date <= todayISO; date = addDays(date, 1)) {
    balance += byDate.get(date) ?? 0;
    points.push({ date, balance });
  }
  return points;
}
