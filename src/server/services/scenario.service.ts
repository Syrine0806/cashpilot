import "server-only";
import { z } from "zod";
import { fromISODate } from "@/domain/dates";
import { BusinessRuleError, NotFoundError } from "@/domain/errors";
import { adjustmentSchema, scenarioSchema } from "@/lib/validation/schemas";
import { authorize } from "../auth/dal";
import { audit } from "../audit";
import { prisma } from "../db";

/*
 * Scenarios only store hypotheses in their own tables (Scenario,
 * ScenarioAdjustment). Nothing here writes to invoices, expenses or movements.
 */

export async function createScenario(companyId: string, input: z.output<typeof scenarioSchema>) {
  const ctx = await authorize(companyId, "scenarios.manage");
  return prisma.$transaction(async (tx) => {
    const scenario = await tx.scenario.create({ data: { companyId, ...input, createdById: ctx.user.id } });
    await audit(tx, companyId, ctx.user.id, {
      action: "scenario.created",
      entityType: "Scenario",
      entityId: scenario.id,
      summary: `Scénario « ${input.name} » créé`,
    });
    return scenario;
  });
}

export async function deleteScenario(companyId: string, scenarioId: string) {
  const ctx = await authorize(companyId, "scenarios.manage");
  const scenario = await prisma.scenario.findFirst({ where: { id: scenarioId, companyId } });
  if (!scenario) throw new NotFoundError("Scénario introuvable.");
  await prisma.$transaction(async (tx) => {
    await tx.scenario.delete({ where: { id: scenarioId } });
    await audit(tx, companyId, ctx.user.id, {
      action: "scenario.deleted",
      entityType: "Scenario",
      entityId: scenarioId,
      summary: `Scénario « ${scenario.name} » supprimé`,
    });
  });
}

export async function addAdjustment(companyId: string, scenarioId: string, input: z.output<typeof adjustmentSchema>) {
  await authorize(companyId, "scenarios.manage");
  const scenario = await prisma.scenario.findFirst({ where: { id: scenarioId, companyId } });
  if (!scenario) throw new NotFoundError("Scénario introuvable.");

  if (input.kind === "DELAY_INVOICE") {
    const invoice = await prisma.invoice.findFirst({ where: { id: input.invoiceId, companyId, status: "ISSUED" } });
    if (!invoice) throw new BusinessRuleError("Choisissez une facture validée de cette entreprise.");
    const existing = await prisma.scenarioAdjustment.findFirst({
      where: { scenarioId, kind: "DELAY_INVOICE", invoiceId: input.invoiceId },
    });
    if (existing) throw new BusinessRuleError("Un retard est déjà simulé pour cette facture dans ce scénario.");
    await prisma.scenarioAdjustment.create({
      data: { scenarioId, kind: input.kind, invoiceId: input.invoiceId, delayDays: input.delayDays },
    });
    return;
  }
  await prisma.scenarioAdjustment.create({
    data: { scenarioId, kind: input.kind, label: input.label, amount: input.amount, date: fromISODate(input.date) },
  });
}

export async function removeAdjustment(companyId: string, adjustmentId: string) {
  await authorize(companyId, "scenarios.manage");
  const adjustment = await prisma.scenarioAdjustment.findFirst({
    where: { id: adjustmentId, scenario: { companyId } },
  });
  if (!adjustment) throw new NotFoundError("Hypothèse introuvable.");
  await prisma.scenarioAdjustment.delete({ where: { id: adjustmentId } });
}
