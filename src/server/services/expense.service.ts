import "server-only";
import { z } from "zod";
import { fromISODate } from "@/domain/dates";
import { BusinessRuleError, ForbiddenError, NotFoundError } from "@/domain/errors";
import { nextExpenseStatus } from "@/domain/expense";
import { formatMoney } from "@/domain/money";
import { expenseSchema, payExpenseSchema } from "@/lib/validation/schemas";
import { authorize } from "../auth/dal";
import { audit } from "../audit";
import { prisma } from "../db";
import { today } from "../env";
import { deleteReceipt, saveReceipt } from "../files";

export async function submitExpense(companyId: string, input: z.output<typeof expenseSchema>, receipt: File | null) {
  const ctx = await authorize(companyId, "expenses.submit");
  if (input.supplierId) {
    const supplier = await prisma.contact.findFirst({ where: { id: input.supplierId, companyId, kind: "SUPPLIER" } });
    if (!supplier) throw new BusinessRuleError("Fournisseur introuvable.");
  }
  const stored = await saveReceipt(receipt);
  try {
    return await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          companyId,
          submittedById: ctx.user.id,
          supplierId: input.supplierId,
          category: input.category,
          description: input.description,
          amount: input.amount,
          expenseDate: fromISODate(input.expenseDate),
          dueDate: fromISODate(input.dueDate),
          status: "SUBMITTED",
          receiptPath: stored?.path,
          receiptName: stored?.name,
          receiptMime: stored?.mime,
        },
      });
      await audit(tx, companyId, ctx.user.id, {
        action: "expense.submitted",
        entityType: "Expense",
        entityId: expense.id,
        summary: `Dépense « ${input.description} » soumise (${formatMoney(input.amount)})`,
      });
      return expense;
    });
  } catch (error) {
    await deleteReceipt(stored?.path ?? null); // no orphan files
    throw error;
  }
}

export async function reviewExpense(
  companyId: string,
  expenseId: string,
  decision: "approve" | "reject",
  comment: string | null,
) {
  const ctx = await authorize(companyId, "expenses.approve");
  if (decision === "reject" && !comment) {
    throw new BusinessRuleError("Indiquez le motif du refus.");
  }
  await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.findFirst({ where: { id: expenseId, companyId } });
    if (!expense) throw new NotFoundError("Dépense introuvable.");
    const status = nextExpenseStatus(expense.status, decision);
    // Conditional update = optimistic lock: a concurrent decision cannot be overwritten.
    const updated = await tx.expense.updateMany({
      where: { id: expenseId, status: "SUBMITTED" },
      data: { status: status!, reviewedById: ctx.user.id, reviewedAt: new Date(), reviewComment: comment },
    });
    if (updated.count !== 1) throw new BusinessRuleError("Cette dépense a déjà été traitée.");
    await audit(tx, companyId, ctx.user.id, {
      action: decision === "approve" ? "expense.approved" : "expense.rejected",
      entityType: "Expense",
      entityId: expenseId,
      summary: `Dépense « ${expense.description} » ${decision === "approve" ? "approuvée" : "refusée"}${comment ? ` — ${comment}` : ""}`,
    });
  });
}

/** Payment of an approved expense: affects the real balance exactly once. */
export async function payExpense(companyId: string, expenseId: string, input: z.output<typeof payExpenseSchema>) {
  const ctx = await authorize(companyId, "expenses.pay");
  if (input.date > today()) throw new BusinessRuleError("Un paiement ne peut pas être daté dans le futur.");
  await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.findFirst({ where: { id: expenseId, companyId } });
    if (!expense) throw new NotFoundError("Dépense introuvable.");
    nextExpenseStatus(expense.status, "pay"); // throws for REJECTED / SUBMITTED / PAID
    const updated = await tx.expense.updateMany({
      where: { id: expenseId, status: "APPROVED" },
      data: { status: "PAID", paidAt: fromISODate(input.date), paidById: ctx.user.id, paymentMethod: input.method },
    });
    if (updated.count !== 1) throw new BusinessRuleError("Cette dépense a déjà été payée.");
    await tx.movement.create({
      data: {
        companyId,
        date: fromISODate(input.date),
        amount: -expense.amount,
        kind: "EXPENSE_PAYMENT",
        label: `Dépense — ${expense.description}`,
        expenseId,
        createdById: ctx.user.id,
      },
    });
    await audit(tx, companyId, ctx.user.id, {
      action: "expense.paid",
      entityType: "Expense",
      entityId: expenseId,
      summary: `Dépense « ${expense.description} » payée (${formatMoney(expense.amount)})`,
    });
  });
}

/** The author can withdraw a request while it has not been reviewed. */
export async function withdrawExpense(companyId: string, expenseId: string) {
  const ctx = await authorize(companyId, "expenses.submit");
  const expense = await prisma.expense.findFirst({ where: { id: expenseId, companyId } });
  if (!expense) throw new NotFoundError("Dépense introuvable.");
  if (expense.submittedById !== ctx.user.id) throw new ForbiddenError("Seul l'auteur peut retirer sa demande.");
  nextExpenseStatus(expense.status, "withdraw");
  await prisma.$transaction(async (tx) => {
    const deleted = await tx.expense.deleteMany({ where: { id: expenseId, status: "SUBMITTED" } });
    if (deleted.count !== 1) throw new BusinessRuleError("Cette demande a déjà été traitée.");
    await audit(tx, companyId, ctx.user.id, {
      action: "expense.withdrawn",
      entityType: "Expense",
      entityId: expenseId,
      summary: `Demande « ${expense.description} » retirée par son auteur`,
    });
  });
  await deleteReceipt(expense.receiptPath);
}
