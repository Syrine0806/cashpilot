import "server-only";
import type { Prisma } from "@prisma/client";
import { toISODate } from "@/domain/dates";
import { displayStatus, paidAmount, type InvoiceDisplayStatus } from "@/domain/invoice";
import { prisma } from "../db";
import { today } from "../env";

export interface InvoiceListItem {
  id: string;
  number: string | null;
  clientId: string;
  clientName: string;
  issueDate: string;
  dueDate: string;
  total: number;
  paid: number;
  remaining: number;
  status: InvoiceDisplayStatus;
}

export interface InvoiceFilters {
  status?: string;
  q?: string;
  clientId?: string;
}

export async function listInvoices(companyId: string, filters: InvoiceFilters = {}): Promise<InvoiceListItem[]> {
  const where: Prisma.InvoiceWhereInput = { companyId };
  if (filters.clientId) where.clientId = filters.clientId;
  if (filters.q) {
    where.OR = [{ number: { contains: filters.q } }, { client: { name: { contains: filters.q } } }];
  }
  if (filters.status === "DRAFT" || filters.status === "CANCELLED") where.status = filters.status;
  else if (filters.status) where.status = "ISSUED";

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
    include: { client: { select: { name: true } }, payments: { select: { amount: true } } },
  });
  const todayISO = today();
  const items = invoices.map((inv) => {
    const paid = paidAmount(inv.payments);
    const dueDate = toISODate(inv.dueDate);
    return {
      id: inv.id,
      number: inv.number,
      clientId: inv.clientId,
      clientName: inv.client.name,
      issueDate: toISODate(inv.issueDate),
      dueDate,
      total: inv.total,
      paid,
      remaining: inv.status === "ISSUED" ? inv.total - paid : 0,
      status: displayStatus({ status: inv.status, total: inv.total, dueDate }, paid, todayISO),
    };
  });
  // Derived statuses (paid, overdue…) are filtered after computation.
  if (filters.status && !["DRAFT", "CANCELLED", "ALL"].includes(filters.status)) {
    return items.filter((i) => i.status === filters.status);
  }
  return items;
}

export async function getInvoice(companyId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
    include: {
      client: true,
      company: true,
      lines: { orderBy: { position: "asc" } },
      payments: { orderBy: [{ date: "asc" }, { createdAt: "asc" }], include: { reversedBy: { select: { id: true } } } },
      retainer: { select: { id: true, label: true } },
    },
  });
  if (!invoice) return null;
  const paid = paidAmount(invoice.payments);
  const dueDate = toISODate(invoice.dueDate);
  return {
    ...invoice,
    issueDateISO: toISODate(invoice.issueDate),
    dueDateISO: dueDate,
    paid,
    remaining: invoice.status === "ISSUED" ? invoice.total - paid : 0,
    displayStatus: displayStatus({ status: invoice.status, total: invoice.total, dueDate }, paid, today()),
  };
}

export async function listIssuedInvoicesWithRemaining(companyId: string) {
  const invoices = await listInvoices(companyId, {});
  return invoices.filter((i) => i.remaining > 0 && i.number);
}
