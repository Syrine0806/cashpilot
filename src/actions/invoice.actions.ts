"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { cancelInvoiceSchema, invoiceSchema, paymentSchema, reversalSchema } from "@/lib/validation/schemas";
import { parseInput, runAction } from "@/server/action";
import {
  cancelInvoice,
  createDraftInvoice,
  deleteDraftInvoice,
  issueInvoice,
  recordPayment,
  reversePayment,
  updateDraftInvoice,
} from "@/server/services/invoice.service";

/** Reads the repeated line fields ("lineDescription", "lineQuantity", "lineUnitPrice"). */
function readInvoiceForm(formData: FormData) {
  const descriptions = formData.getAll("lineDescription").map(String);
  const quantities = formData.getAll("lineQuantity").map(String);
  const prices = formData.getAll("lineUnitPrice").map(String);
  const lines = descriptions
    .map((description, i) => ({ description, quantity: quantities[i] ?? "", unitPrice: prices[i] ?? "" }))
    .filter((l) => l.description.trim() || l.unitPrice.trim());
  return {
    clientId: formData.get("clientId"),
    issueDate: formData.get("issueDate"),
    dueDate: formData.get("dueDate"),
    taxRate: formData.get("taxRate"),
    notes: formData.get("notes") ?? undefined,
    lines,
  };
}

export async function saveInvoiceAction(
  companyId: string,
  invoiceId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let id = invoiceId;
  const result = await runAction(formData, async () => {
    const input = parseInput(invoiceSchema, readInvoiceForm(formData));
    if (invoiceId) await updateDraftInvoice(companyId, invoiceId, input);
    else id = (await createDraftInvoice(companyId, input)).id;
    revalidatePath(`/c/${companyId}`, "layout");
  });
  if (!result.ok) return result;
  redirect(`/c/${companyId}/invoices/${id}`);
}

export async function issueInvoiceAction(companyId: string, invoiceId: string, _prev: ActionState, formData: FormData) {
  return runAction(formData, async () => {
    const number = await issueInvoice(companyId, invoiceId);
    revalidatePath(`/c/${companyId}`, "layout");
    return { ok: true, message: `Facture ${number} validée.` };
  });
}

export async function deleteDraftAction(companyId: string, invoiceId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const result = await runAction(formData, async () => {
    await deleteDraftInvoice(companyId, invoiceId);
    revalidatePath(`/c/${companyId}`, "layout");
  });
  if (!result.ok) return result;
  redirect(`/c/${companyId}/invoices`);
}

export async function cancelInvoiceAction(companyId: string, invoiceId: string, _prev: ActionState, formData: FormData) {
  return runAction(formData, async () => {
    const { reason } = parseInput(cancelInvoiceSchema, Object.fromEntries(formData));
    await cancelInvoice(companyId, invoiceId, reason);
    revalidatePath(`/c/${companyId}`, "layout");
    return { ok: true, message: "Facture annulée." };
  });
}

export async function recordPaymentAction(companyId: string, invoiceId: string, _prev: ActionState, formData: FormData) {
  return runAction(formData, async () => {
    await recordPayment(companyId, invoiceId, parseInput(paymentSchema, Object.fromEntries(formData)));
    revalidatePath(`/c/${companyId}`, "layout");
    return { ok: true, message: "Encaissement enregistré." };
  });
}

export async function reversePaymentAction(companyId: string, paymentId: string, _prev: ActionState, formData: FormData) {
  return runAction(formData, async () => {
    const { reason } = parseInput(reversalSchema, Object.fromEntries(formData));
    await reversePayment(companyId, paymentId, reason);
    revalidatePath(`/c/${companyId}`, "layout");
    return { ok: true, message: "Encaissement contre-passé." };
  });
}
