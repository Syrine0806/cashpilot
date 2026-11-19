import "server-only";
import { toISODate } from "@/domain/dates";
import { buildForecastFlows } from "@/domain/forecast";
import { compareScenario, type Adjustment } from "@/domain/simulation";
import { prisma } from "../db";
import { loadForecastSnapshot } from "./forecast.queries";

export async function listScenarios(companyId: string) {
  return prisma.scenario.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { adjustments: true } } },
  });
}

function toAdjustment(row: {
  id: string;
  kind: string;
  invoiceId: string | null;
  delayDays: number | null;
  label: string | null;
  amount: number | null;
  date: Date | null;
}): Adjustment | null {
  if (row.kind === "DELAY_INVOICE" && row.invoiceId && row.delayDays) {
    return { id: row.id, kind: "DELAY_INVOICE", invoiceId: row.invoiceId, delayDays: row.delayDays };
  }
  if ((row.kind === "NEW_EXPENSE" || row.kind === "NEW_INFLOW") && row.amount && row.date) {
    return { id: row.id, kind: row.kind, label: row.label ?? "", amount: row.amount, date: toISODate(row.date) };
  }
  return null;
}

/** Loads a scenario and compares it with the real forecast (read-only). */
export async function getScenarioComparison(companyId: string, scenarioId: string, options: { includePending?: boolean } = {}) {
  const scenario = await prisma.scenario.findFirst({
    where: { id: scenarioId, companyId },
    include: { adjustments: { orderBy: { createdAt: "asc" } } },
  });
  if (!scenario) return null;
  const snapshot = await loadForecastSnapshot(companyId);
  const flows = buildForecastFlows(snapshot, { horizonDays: 90, includePending: options.includePending });
  const adjustments = scenario.adjustments.map(toAdjustment).filter((a): a is Adjustment => a !== null);
  const comparison = compareScenario({
    referenceDate: snapshot.today,
    referenceBalance: snapshot.referenceBalance,
    flows,
    adjustments,
    horizonDays: 90,
  });
  const invoiceLabels = new Map(snapshot.invoices.map((i) => [i.id, `${i.number} · ${i.clientName}`]));
  return { scenario, adjustments, comparison, snapshot, invoiceLabels };
}
