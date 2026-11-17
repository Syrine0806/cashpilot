import "server-only";
import { z } from "zod";
import { fromISODate, toISODate } from "@/domain/dates";
import { BusinessRuleError, NotFoundError } from "@/domain/errors";
import {
  assertCanCancel,
  assertCanIssue,
  assertPaymentAllowed,
  computeInvoiceTotals,
  formatInvoiceNumber,
} from "@/domain/invoice";
import { formatMoney } from "@/domain/money";
import { invoiceSchema, paymentSchema } from "@/lib/validation/schemas";
import { authorize } from "../auth/dal";
import { audit } from "../audit";
import { prisma, type Tx } from "../db";
import { today } from "../env";

type InvoiceInput = z.output<typeof invoiceSchema>;

async function assertClient(tx: Tx, companyId: string, clientId: string) {
  const client = await tx.contact.findFirst({ where: { id: clientId, companyId, kind: "CLIENT" } });
  if (!client) throw new BusinessRuleError("Client introuvable.");
  return client;
}

function draftData(input: InvoiceInput) {
  const totals = computeInvoiceTotals(
    input.lines.map((l) => ({ description: l.description, quantityMilli: l.quantity, unitPrice: l.unitPrice })),
    input.taxRate,
  );
  return {
    totals,
    data: {
      clientId: input.clientId,
      issueDate: fromISODate(input.issueDate),
      dueDate: fromISODate(input.dueDate),
      taxRateBp: input.taxRate,
      notes: input.notes,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      total: totals.total,
    },
    lines: totals.lines.map((l, position) => ({
      position,
      description: l.description,
      quantityMilli: l.quantityMilli,
      unitPrice: l.unitPrice,
      amount: l.amount,
    })),
  };
}

export async function createDraftInvoice(companyId: string, input: InvoiceInput) {
  const ctx = await authorize(companyId, "invoices.manage");
  return prisma.$transaction(async (tx) => {
    await assertClient(tx, companyId, input.clientId);
    const { data, lines, totals } = draftData(input);
    const invoice = await tx.invoice.create({
      data: { ...data, companyId, status: "DRAFT", createdById: ctx.user.id, lines: { create: lines } },
    });
    await audit(tx, companyId, ctx.user.id, {
      action: "invoice.draftCreated",
      entityType: "Invoice",
      entityId: invoice.id,
      summary: `Brouillon de facture créé (${formatMoney(totals.total)} TTC)`,
    });
    return invoice;
  });
}

export async function updateDraftInvoice(companyId: string, invoiceId: string, input: InvoiceInput) {
  const ctx = await authorize(companyId, "invoices.manage");
  await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, companyId } });
    if (!invoice) throw new NotFoundError("Facture introuvable.");
    if (invoice.status !== "DRAFT") throw new BusinessRuleError("Une facture validée ne peut plus être modifiée.");
    await assertClient(tx, companyId, input.clientId);
    const { data, lines, totals } = draftData(input);
    await tx.invoiceLine.deleteMany({ where: { invoiceId } });
    await tx.invoice.update({ where: { id: invoiceId }, data: { ...data, lines: { create: lines } } });
    await audit(tx, companyId, ctx.user.id, {
      action: "invoice.draftUpdated",
      entityType: "Invoice",
      entityId: invoiceId,
      summary: `Brouillon modifié (${formatMoney(totals.total)} TTC)`,
    });
  });
}

/** Drafts have no financial effect yet, so they can be deleted. */
export async function deleteDraftInvoice(companyId: string, invoiceId: string) {
  const ctx = await authorize(companyId, "invoices.manage");
  await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, companyId } });
    if (!invoice) throw new NotFoundError("Facture introuvable.");
    if (invoice.status !== "DRAFT") {
      throw new BusinessRuleError("Une facture validée ne peut pas être supprimée : annulez-la.");
    }
    await tx.invoice.delete({ where: { id: invoiceId } });
    await audit(tx, companyId, ctx.user.id, {
      action: "invoice.draftDeleted",
      entityType: "Invoice",
      entityId: invoiceId,
      summary: "Brouillon de facture supprimé",
    });
  });
}

/** Validation: assigns a sequential number and freezes the invoice. */
export async function issueInvoice(companyId: string, invoiceId: string) {
  const ctx = await authorize(companyId, "invoices.manage");
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, companyId }, include: { lines: true } });
    if (!invoice) throw new NotFoundError("Facture introuvable.");
    assertCanIssue(
      { status: invoice.status, issueDate: toISODate(invoice.issueDate), dueDate: toISODate(invoice.dueDate) },
      invoice.lines.length,
    );
    const company = await tx.company.update({
      where: { id: companyId },
      data: { nextInvoiceNumber: { increment: 1 } },
      select: { invoicePrefix: true, nextInvoiceNumber: true },
    });
    const number = formatInvoiceNumber(company.invoicePrefix, invoice.issueDate.getUTCFullYear(), company.nextInvoiceNumber - 1);
    // Recompute totals from the stored lines: the frozen amounts are always consistent.
    const totals = computeInvoiceTotals(invoice.lines, invoice.taxRateBp);
    const updated = await tx.invoice.updateMany({
      where: { id: invoiceId, status: "DRAFT" },
      data: {
        status: "ISSUED",
        number,
        issuedAt: new Date(),
        issuedById: ctx.user.id,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        total: totals.total,
      },
    });
    if (updated.count !== 1) throw new BusinessRuleError("Cette facture a déjà été validée.");
    await audit(tx, companyId, ctx.user.id, {
      action: "invoice.issued",
      entityType: "Invoice",
      entityId: invoiceId,
      summary: `Facture ${number} validée (${formatMoney(totals.total)} TTC)`,
    });
    return number;
  });
}

export async function cancelInvoice(companyId: string, invoiceId: string, reason: string) {
  const ctx = await authorize(companyId, "invoices.manage");
  await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, companyId }, include: { payments: true } });
    if (!invoice) throw new NotFoundError("Facture introuvable.");
    assertCanCancel(invoice, invoice.payments);
    await tx.invoice.update({
      where: { id: invoiceId },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelledById: ctx.user.id, cancelReason: reason },
    });
    await audit(tx, companyId, ctx.user.id, {
      action: "invoice.cancelled",
      entityType: "Invoice",
      entityId: invoiceId,
      summary: `Facture ${invoice.number} annulée — motif : ${reason}`,
    });
  });
}

// ---------------------------------------------------------------------------
// Customer payments (encaissements)
// ---------------------------------------------------------------------------

export async function recordPayment(companyId: string, invoiceId: string, input: z.output<typeof paymentSchema>) {
  const ctx = await authorize(companyId, "payments.manage");
  if (input.date > today()) throw new BusinessRuleError("Un encaissement ne peut pas être daté dans le futur.");
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, companyId }, include: { payments: true } });
    if (!invoice) throw new NotFoundError("Facture introuvable.");
    if (input.date < toISODate(invoice.issueDate)) {
      throw new BusinessRuleError("Un encaissement ne peut pas précéder la date d'émission de la facture.");
    }
    // Checked inside the transaction: two concurrent payments cannot both pass.
    assertPaymentAllowed(invoice, invoice.payments, input.amount);
    const payment = await tx.payment.create({
      data: {
        companyId,
        invoiceId,
        amount: input.amount,
        date: fromISODate(input.date),
        method: input.method,
        reference: input.reference,
        createdById: ctx.user.id,
      },
    });
    // One payment ⇒ exactly one ledger movement (unique paymentId).
    await tx.movement.create({
      data: {
        companyId,
        date: payment.date,
        amount: input.amount,
        kind: "CUSTOMER_PAYMENT",
        label: `Encaissement ${invoice.number}`,
        paymentId: payment.id,
        createdById: ctx.user.id,
      },
    });
    const remaining = invoice.total - invoice.payments.reduce((s, p) => s + p.amount, 0) - input.amount;
    await audit(tx, companyId, ctx.user.id, {
      action: "payment.recorded",
      entityType: "Invoice",
      entityId: invoiceId,
      summary: `Encaissement de ${formatMoney(input.amount)} sur ${invoice.number} — reste à payer ${formatMoney(remaining)}`,
    });
    return payment;
  });
}

/** Correction of a payment: a traceable reversal, never a deletion. */
export async function reversePayment(companyId: string, paymentId: string, reason: string) {
  const ctx = await authorize(companyId, "payments.manage");
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: { id: paymentId, companyId },
      include: { reversedBy: true, invoice: true },
    });
    if (!payment) throw new NotFoundError("Paiement introuvable.");
    if (payment.amount <= 0 || payment.reversalOfId) throw new BusinessRuleError("Une contre-passation ne peut pas être annulée.");
    if (payment.reversedBy) throw new BusinessRuleError("Ce paiement a déjà été contre-passé.");
    const date = fromISODate(today());
    const reversal = await tx.payment.create({
      data: {
        companyId,
        invoiceId: payment.invoiceId,
        amount: -payment.amount,
        date,
        method: payment.method,
        reference: payment.reference,
        note: reason,
        reversalOfId: payment.id,
        createdById: ctx.user.id,
      },
    });
    await tx.movement.create({
      data: {
        companyId,
        date,
        amount: -payment.amount,
        kind: "PAYMENT_REVERSAL",
        label: `Contre-passation encaissement ${payment.invoice.number} — ${reason}`,
        paymentId: reversal.id,
        createdById: ctx.user.id,
      },
    });
    await audit(tx, companyId, ctx.user.id, {
      action: "payment.reversed",
      entityType: "Invoice",
      entityId: payment.invoiceId,
      summary: `Encaissement de ${formatMoney(payment.amount)} sur ${payment.invoice.number} contre-passé — motif : ${reason}`,
    });
  });
}
