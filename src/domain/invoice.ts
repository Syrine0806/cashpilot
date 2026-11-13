import { type ISODate } from "./dates";
import { BusinessRuleError } from "./errors";
import { mulDivRound, sum, type Millimes } from "./money";

export const INVOICE_STATUSES = ["DRAFT", "ISSUED", "CANCELLED"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/** Status displayed to users, derived from the stored status and the payments. */
export type InvoiceDisplayStatus = "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED";

export const INVOICE_STATUS_LABELS: Record<InvoiceDisplayStatus, string> = {
  DRAFT: "Brouillon",
  ISSUED: "Émise",
  PARTIALLY_PAID: "Partiellement payée",
  PAID: "Payée",
  OVERDUE: "En retard",
  CANCELLED: "Annulée",
};

export const PAYMENT_METHODS = ["TRANSFER", "CHECK", "CASH", "CARD", "OTHER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  TRANSFER: "Virement",
  CHECK: "Chèque",
  CASH: "Espèces",
  CARD: "Carte",
  OTHER: "Autre",
};

export interface LineInput {
  description: string;
  quantityMilli: number; // quantity × 1000
  unitPrice: Millimes;
}

export interface InvoiceTotals {
  lines: (LineInput & { amount: Millimes })[];
  subtotal: Millimes;
  taxAmount: Millimes;
  total: Millimes;
}

/** Line amount = quantity × unit price, rounded to the millime. */
export function lineAmount(line: LineInput): Millimes {
  return mulDivRound(line.quantityMilli, line.unitPrice, 1000);
}

/** Tax is computed once on the subtotal to avoid accumulating rounding differences. */
export function computeInvoiceTotals(lines: LineInput[], taxRateBp: number): InvoiceTotals {
  const computed = lines.map((line) => ({ ...line, amount: lineAmount(line) }));
  const subtotal = sum(computed.map((l) => l.amount));
  const taxAmount = mulDivRound(subtotal, taxRateBp, 10_000);
  return { lines: computed, subtotal, taxAmount, total: subtotal + taxAmount };
}

/** Net amount received: receipts minus reversals. */
export function paidAmount(payments: readonly { amount: Millimes }[]): Millimes {
  return sum(payments.map((p) => p.amount));
}

export function remainingAmount(total: Millimes, payments: readonly { amount: Millimes }[]): Millimes {
  return total - paidAmount(payments);
}

export function displayStatus(
  invoice: { status: string; total: Millimes; dueDate: ISODate },
  paid: Millimes,
  today: ISODate,
): InvoiceDisplayStatus {
  if (invoice.status === "DRAFT") return "DRAFT";
  if (invoice.status === "CANCELLED") return "CANCELLED";
  const remaining = invoice.total - paid;
  if (remaining <= 0) return "PAID";
  if (invoice.dueDate < today) return "OVERDUE";
  return paid > 0 ? "PARTIALLY_PAID" : "ISSUED";
}

/** Guards the rule "an invoice cannot be paid beyond its remaining amount". */
export function assertPaymentAllowed(
  invoice: { status: string; total: Millimes },
  payments: readonly { amount: Millimes }[],
  amount: Millimes,
): void {
  if (invoice.status !== "ISSUED") {
    throw new BusinessRuleError("Seule une facture validée (non annulée) peut recevoir un paiement.");
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new BusinessRuleError("Le montant du paiement doit être strictement positif.");
  }
  const remaining = remainingAmount(invoice.total, payments);
  if (amount > remaining) {
    throw new BusinessRuleError(
      `Le paiement dépasse le reste à payer de la facture.`,
    );
  }
}

export function assertCanIssue(invoice: { status: string; issueDate: ISODate; dueDate: ISODate }, lineCount: number) {
  if (invoice.status !== "DRAFT") throw new BusinessRuleError("Seul un brouillon peut être validé.");
  if (lineCount === 0) throw new BusinessRuleError("Ajoutez au moins une ligne avant de valider la facture.");
  if (invoice.dueDate < invoice.issueDate) {
    throw new BusinessRuleError("L'échéance ne peut pas précéder la date d'émission.");
  }
}

/** A validated invoice can only be cancelled once every payment has been reversed. */
export function assertCanCancel(invoice: { status: string }, payments: readonly { amount: Millimes }[]) {
  if (invoice.status !== "ISSUED") throw new BusinessRuleError("Seule une facture validée peut être annulée.");
  if (paidAmount(payments) !== 0) {
    throw new BusinessRuleError(
      "Cette facture a reçu des paiements : annulez (contre-passez) d'abord les paiements avant d'annuler la facture.",
    );
  }
}

export function formatInvoiceNumber(prefix: string, year: number, sequence: number): string {
  return `${prefix}-${year}-${String(sequence).padStart(4, "0")}`;
}

export function formatTaxRate(bp: number): string {
  return `${(bp / 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;
}

export function formatQuantity(quantityMilli: number): string {
  return (quantityMilli / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 3 });
}
