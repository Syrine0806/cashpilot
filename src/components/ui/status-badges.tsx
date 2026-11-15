import { EXPENSE_STATUS_LABELS, type ExpenseStatus } from "@/domain/expense";
import { INVOICE_STATUS_LABELS, type InvoiceDisplayStatus } from "@/domain/invoice";
import { Badge, type Tone } from "./badge";

const INVOICE_TONES: Record<InvoiceDisplayStatus, Tone> = {
  DRAFT: "neutral",
  ISSUED: "info",
  PARTIALLY_PAID: "brand",
  PAID: "positive",
  OVERDUE: "negative",
  CANCELLED: "neutral",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceDisplayStatus }) {
  return <Badge tone={INVOICE_TONES[status]}>{INVOICE_STATUS_LABELS[status]}</Badge>;
}

const EXPENSE_TONES: Record<ExpenseStatus, Tone> = {
  SUBMITTED: "warning",
  APPROVED: "info",
  REJECTED: "negative",
  PAID: "positive",
};

export function ExpenseStatusBadge({ status }: { status: string }) {
  const s = status as ExpenseStatus;
  return <Badge tone={EXPENSE_TONES[s] ?? "neutral"}>{EXPENSE_STATUS_LABELS[s] ?? status}</Badge>;
}
