import "server-only";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { dateInMonth, fromISODate, toISODate } from "@/domain/dates";
import { BusinessRuleError, NotFoundError } from "@/domain/errors";
import { computeInvoiceTotals } from "@/domain/invoice";
import { formatMoney } from "@/domain/money";
import { plannedFlowSchema, retainerSchema } from "@/lib/validation/schemas";
import { authorize } from "../auth/dal";
import { audit } from "../audit";
import { prisma } from "../db";
import { today } from "../env";

// ---------------------------------------------------------------------------
// Planned flows (hypotheses for the forecast: rent, salaries, loans…)
// ---------------------------------------------------------------------------

export async function createPlannedFlow(companyId: string, input: z.output<typeof plannedFlowSchema>) {
  const ctx = await authorize(companyId, "forecast.manage");
  if (input.endDate && input.endDate < input.startDate) {
    throw new BusinessRuleError("La date de fin doit suivre la date de début.");
  }
  await prisma.$transaction(async (tx) => {
    const flow = await tx.plannedFlow.create({
      data: {
        companyId,
        direction: input.direction,
        label: input.label,
        amount: input.amount,
        startDate: fromISODate(input.startDate),
        recurrence: input.recurrence,
        endDate: input.recurrence === "MONTHLY" && input.endDate ? fromISODate(input.endDate) : null,
        createdById: ctx.user.id,
      },
    });
    await audit(tx, companyId, ctx.user.id, {
      action: "plannedFlow.created",
      entityType: "PlannedFlow",
      entityId: flow.id,
      summary: `Flux prévisionnel « ${input.label} » (${input.direction === "IN" ? "+" : "−"}${formatMoney(input.amount)}) ajouté`,
    });
  });
}

export async function togglePlannedFlow(companyId: string, flowId: string) {
  const ctx = await authorize(companyId, "forecast.manage");
  const flow = await prisma.plannedFlow.findFirst({ where: { id: flowId, companyId } });
  if (!flow) throw new NotFoundError("Flux introuvable.");
  await prisma.$transaction(async (tx) => {
    await tx.plannedFlow.update({ where: { id: flowId }, data: { active: !flow.active } });
    await audit(tx, companyId, ctx.user.id, {
      action: "plannedFlow.toggled",
      entityType: "PlannedFlow",
      entityId: flowId,
      summary: `Flux « ${flow.label} » ${flow.active ? "désactivé" : "réactivé"}`,
    });
  });
}

// ---------------------------------------------------------------------------
// Retainers (sector feature: digital agency monthly contracts)
// ---------------------------------------------------------------------------

export async function createRetainer(companyId: string, input: z.output<typeof retainerSchema>) {
  const ctx = await authorize(companyId, "forecast.manage");
  const client = await prisma.contact.findFirst({ where: { id: input.clientId, companyId, kind: "CLIENT" } });
  if (!client) throw new BusinessRuleError("Client introuvable.");
  await prisma.$transaction(async (tx) => {
    const retainer = await tx.retainer.create({
      data: {
        companyId,
        clientId: input.clientId,
        label: input.label,
        monthlyAmount: input.monthlyAmount,
        taxRateBp: input.taxRate,
        dayOfMonth: input.dayOfMonth,
        startDate: fromISODate(input.startDate),
        endDate: input.endDate ? fromISODate(input.endDate) : null,
      },
    });
    await audit(tx, companyId, ctx.user.id, {
      action: "retainer.created",
      entityType: "Retainer",
      entityId: retainer.id,
      summary: `Contrat récurrent « ${input.label} » (${formatMoney(input.monthlyAmount)} HT/mois) pour ${client.name}`,
    });
  });
}

export async function toggleRetainer(companyId: string, retainerId: string) {
  const ctx = await authorize(companyId, "forecast.manage");
  const retainer = await prisma.retainer.findFirst({ where: { id: retainerId, companyId } });
  if (!retainer) throw new NotFoundError("Contrat introuvable.");
  await prisma.$transaction(async (tx) => {
    await tx.retainer.update({ where: { id: retainerId }, data: { active: !retainer.active } });
    await audit(tx, companyId, ctx.user.id, {
      action: "retainer.toggled",
      entityType: "Retainer",
      entityId: retainerId,
      summary: `Contrat « ${retainer.label} » ${retainer.active ? "suspendu" : "réactivé"}`,
    });
  });
}

/** Creates the draft invoice of a month. A month can only be invoiced once. */
export async function invoiceRetainerPeriod(companyId: string, retainerId: string, period: string) {
  const ctx = await authorize(companyId, "invoices.manage");
  const retainer = await prisma.retainer.findFirst({ where: { id: retainerId, companyId } });
  if (!retainer) throw new NotFoundError("Contrat introuvable.");
  const [year, month] = period.split("-").map(Number);
  const dueDate = dateInMonth(year, month - 1, retainer.dayOfMonth);
  if (period < toISODate(retainer.startDate).slice(0, 7) || (retainer.endDate && period > toISODate(retainer.endDate).slice(0, 7))) {
    throw new BusinessRuleError("Cette période est hors de la durée du contrat.");
  }
  const issueDate = today() < dueDate ? today() : dueDate;
  const totals = computeInvoiceTotals(
    [{ description: `${retainer.label} — ${period}`, quantityMilli: 1000, unitPrice: retainer.monthlyAmount }],
    retainer.taxRateBp,
  );
  try {
    return await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          companyId,
          clientId: retainer.clientId,
          status: "DRAFT",
          issueDate: fromISODate(issueDate),
          dueDate: fromISODate(dueDate),
          taxRateBp: retainer.taxRateBp,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          total: totals.total,
          createdById: ctx.user.id,
          retainerId,
          retainerPeriod: period,
          lines: { create: totals.lines.map((l, position) => ({ ...l, position })) },
        },
      });
      await audit(tx, companyId, ctx.user.id, {
        action: "retainer.invoiced",
        entityType: "Invoice",
        entityId: invoice.id,
        summary: `Brouillon généré pour « ${retainer.label} » (${period})`,
      });
      return invoice;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new BusinessRuleError(`La période ${period} a déjà été facturée pour ce contrat.`);
    }
    throw error;
  }
}
