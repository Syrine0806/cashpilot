import "server-only";
import { z } from "zod";
import { fromISODate, toISODate } from "@/domain/dates";
import { BusinessRuleError, NotFoundError } from "@/domain/errors";
import { formatMoney } from "@/domain/money";
import { movementSchema } from "@/lib/validation/schemas";
import { authorize } from "../auth/dal";
import { audit } from "../audit";
import { prisma } from "../db";
import { today } from "../env";

/** Manual cash operation (bank fees, capital contribution, correction…). */
export async function addManualMovement(companyId: string, input: z.output<typeof movementSchema>) {
  const ctx = await authorize(companyId, "treasury.manage");
  if (input.date > today()) throw new BusinessRuleError("Un mouvement réalisé ne peut pas être daté dans le futur.");
  await prisma.$transaction(async (tx) => {
    const company = await tx.company.findUniqueOrThrow({ where: { id: companyId } });
    if (input.date < toISODate(company.initialBalanceDate)) {
      throw new BusinessRuleError("Le mouvement ne peut pas précéder la date du solde initial.");
    }
    const amount = input.kind === "MANUAL_IN" ? input.amount : -input.amount;
    const movement = await tx.movement.create({
      data: { companyId, date: fromISODate(input.date), amount, kind: input.kind, label: input.label, createdById: ctx.user.id },
    });
    await audit(tx, companyId, ctx.user.id, {
      action: "movement.created",
      entityType: "Movement",
      entityId: movement.id,
      summary: `Mouvement manuel « ${input.label} » ${formatMoney(amount, { signed: true })}`,
    });
  });
}

/** Manual movements are corrected by an opposite, linked movement. */
export async function reverseMovement(companyId: string, movementId: string, reason: string) {
  const ctx = await authorize(companyId, "treasury.manage");
  await prisma.$transaction(async (tx) => {
    const movement = await tx.movement.findFirst({ where: { id: movementId, companyId }, include: { reversedBy: true } });
    if (!movement) throw new NotFoundError("Mouvement introuvable.");
    if (movement.kind !== "MANUAL_IN" && movement.kind !== "MANUAL_OUT") {
      throw new BusinessRuleError(
        "Seuls les mouvements manuels se contre-passent ici. Les encaissements se corrigent depuis la facture.",
      );
    }
    if (movement.reversedBy) throw new BusinessRuleError("Ce mouvement a déjà été contre-passé.");
    const reversal = await tx.movement.create({
      data: {
        companyId,
        date: fromISODate(today()),
        amount: -movement.amount,
        kind: "MANUAL_REVERSAL",
        label: `Contre-passation « ${movement.label} » — ${reason}`,
        reversalOfId: movement.id,
        createdById: ctx.user.id,
      },
    });
    await audit(tx, companyId, ctx.user.id, {
      action: "movement.reversed",
      entityType: "Movement",
      entityId: reversal.id,
      summary: `Contre-passation de « ${movement.label} » (${formatMoney(-movement.amount, { signed: true })}) — ${reason}`,
    });
  });
}
