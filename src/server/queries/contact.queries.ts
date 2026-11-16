import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { listInvoices } from "./invoice.queries";

export async function listContacts(companyId: string, filters: { kind?: string; q?: string; archived?: boolean } = {}) {
  const where: Prisma.ContactWhereInput = { companyId, archivedAt: filters.archived ? { not: null } : null };
  if (filters.kind === "CLIENT" || filters.kind === "SUPPLIER") where.kind = filters.kind;
  if (filters.q) where.OR = [{ name: { contains: filters.q } }, { email: { contains: filters.q } }];
  return prisma.contact.findMany({
    where,
    orderBy: { name: "asc" },
    include: { _count: { select: { invoices: true, expenses: true } } },
  });
}

export async function listContactOptions(companyId: string, kind: "CLIENT" | "SUPPLIER") {
  return prisma.contact.findMany({
    where: { companyId, kind, archivedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

/** Contact with its invoice & payment history (clients) or expense history (suppliers). */
export async function getContact(companyId: string, contactId: string) {
  const contact = await prisma.contact.findFirst({ where: { id: contactId, companyId } });
  if (!contact) return null;
  const [invoices, payments, expenses] = await Promise.all([
    listInvoices(companyId, { clientId: contactId }),
    prisma.payment.findMany({
      where: { companyId, invoice: { clientId: contactId } },
      orderBy: { date: "desc" },
      include: { invoice: { select: { id: true, number: true } } },
    }),
    prisma.expense.findMany({ where: { companyId, supplierId: contactId }, orderBy: { expenseDate: "desc" } }),
  ]);
  return { contact, invoices, payments, expenses };
}
