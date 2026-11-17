"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { expenseSchema, payExpenseSchema, reviewSchema } from "@/lib/validation/schemas";
import { parseInput, runAction } from "@/server/action";
import { payExpense, reviewExpense, submitExpense, withdrawExpense } from "@/server/services/expense.service";

export async function submitExpenseAction(companyId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  const result = await runAction(formData, async () => {
    const { receipt, ...fields } = Object.fromEntries(formData);
    const input = parseInput(expenseSchema, fields);
    const expense = await submitExpense(companyId, input, receipt instanceof File ? receipt : null);
    id = expense.id;
    revalidatePath(`/c/${companyId}`, "layout");
  });
  if (!result.ok) return result;
  redirect(`/c/${companyId}/expenses/${id}`);
}

export async function reviewExpenseAction(companyId: string, expenseId: string, _prev: ActionState, formData: FormData) {
  return runAction(formData, async () => {
    const { decision, comment } = parseInput(reviewSchema, Object.fromEntries(formData));
    await reviewExpense(companyId, expenseId, decision, comment);
    revalidatePath(`/c/${companyId}`, "layout");
    return { ok: true, message: decision === "approve" ? "Dépense approuvée." : "Dépense refusée." };
  });
}

export async function payExpenseAction(companyId: string, expenseId: string, _prev: ActionState, formData: FormData) {
  return runAction(formData, async () => {
    await payExpense(companyId, expenseId, parseInput(payExpenseSchema, Object.fromEntries(formData)));
    revalidatePath(`/c/${companyId}`, "layout");
    return { ok: true, message: "Paiement enregistré : le solde réel a été mis à jour." };
  });
}

export async function withdrawExpenseAction(companyId: string, expenseId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const result = await runAction(formData, async () => {
    await withdrawExpense(companyId, expenseId);
    revalidatePath(`/c/${companyId}`, "layout");
  });
  if (!result.ok) return result;
  redirect(`/c/${companyId}/expenses`);
}
