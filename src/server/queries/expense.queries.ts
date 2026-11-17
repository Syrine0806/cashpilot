import "server-only";
import type { Prisma } from "@prisma/client";
import type { CompanyContext } from "../auth/dal";
import { prisma } from "../db";

/** Employees only see their own requests; this filter is applied on every read. */
function visibility(ctx: CompanyContext): Prisma.ExpenseWhereInput {
  return ctx.can("expenses.viewAll")
    ? { companyId: ctx.company.id }
    : { companyId: ctx.company.id, submittedById: ctx.user.id };
}

export async function listExpenses(ctx: CompanyContext, filters: { status?: string; category?: string; mine?: boolean } = {}) {
  const where: Prisma.ExpenseWhereInput = { ...visibility(ctx) };
  if (filters.status) where.status = filters.status;
  if (filters.category) where.category = filters.category;
  if (filters.mine) where.submittedById = ctx.user.id;
  return prisma.expense.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    include: {
      submittedBy: { select: { name: true } },
      supplier: { select: { id: true, name: true } },
    },
  });
}

export async function getExpense(ctx: CompanyContext, expenseId: string) {
  return prisma.expense.findFirst({
    where: { id: expenseId, ...visibility(ctx) },
    include: {
      submittedBy: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true } },
      supplier: { select: { id: true, name: true } },
      movement: { select: { id: true, date: true } },
    },
  });
}
