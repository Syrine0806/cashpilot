import "server-only";
import { addDays, monthKey } from "@/domain/dates";
import { prisma } from "../db";
import { today } from "../env";

export async function listPlannedFlows(companyId: string) {
  return prisma.plannedFlow.findMany({ where: { companyId }, orderBy: [{ active: "desc" }, { startDate: "asc" }] });
}

export async function listRetainers(companyId: string) {
  const retainers = await prisma.retainer.findMany({
    where: { companyId },
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
    include: {
      client: { select: { id: true, name: true } },
      invoices: { select: { id: true, retainerPeriod: true, status: true, number: true }, orderBy: { retainerPeriod: "desc" } },
    },
  });
  const current = monthKey(today());
  const next = monthKey(addDays(`${current}-01`, 32));
  return retainers.map((r) => ({ ...r, currentPeriod: current, nextPeriod: next }));
}
