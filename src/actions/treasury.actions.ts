"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import {
  movementSchema,
  plannedFlowSchema,
  retainerInvoiceSchema,
  retainerSchema,
  reversalSchema,
} from "@/lib/validation/schemas";
import { parseInput, runAction } from "@/server/action";
import {
  createPlannedFlow,
  createRetainer,
  invoiceRetainerPeriod,
  togglePlannedFlow,
  toggleRetainer,
} from "@/server/services/planning.service";
import { addManualMovement, reverseMovement } from "@/server/services/treasury.service";

export async function addMovementAction(companyId: string, _prev: ActionState, formData: FormData) {
  return runAction(formData, async () => {
    await addManualMovement(companyId, parseInput(movementSchema, Object.fromEntries(formData)));
    revalidatePath(`/c/${companyId}`, "layout");
    return { ok: true, message: "Mouvement enregistré." };
  });
}

export async function reverseMovementAction(companyId: string, movementId: string, _prev: ActionState, formData: FormData) {
  return runAction(formData, async () => {
    const { reason } = parseInput(reversalSchema, Object.fromEntries(formData));
    await reverseMovement(companyId, movementId, reason);
    revalidatePath(`/c/${companyId}`, "layout");
    return { ok: true, message: "Mouvement contre-passé." };
  });
}

export async function createPlannedFlowAction(companyId: string, _prev: ActionState, formData: FormData) {
  return runAction(formData, async () => {
    await createPlannedFlow(companyId, parseInput(plannedFlowSchema, Object.fromEntries(formData)));
    revalidatePath(`/c/${companyId}`, "layout");
    return { ok: true, message: "Flux prévisionnel ajouté." };
  });
}

export async function togglePlannedFlowAction(companyId: string, flowId: string, _prev: ActionState, formData: FormData) {
  return runAction(formData, async () => {
    await togglePlannedFlow(companyId, flowId);
    revalidatePath(`/c/${companyId}`, "layout");
  });
}

export async function createRetainerAction(companyId: string, _prev: ActionState, formData: FormData) {
  return runAction(formData, async () => {
    await createRetainer(companyId, parseInput(retainerSchema, Object.fromEntries(formData)));
    revalidatePath(`/c/${companyId}`, "layout");
    return { ok: true, message: "Contrat récurrent ajouté." };
  });
}

export async function toggleRetainerAction(companyId: string, retainerId: string, _prev: ActionState, formData: FormData) {
  return runAction(formData, async () => {
    await toggleRetainer(companyId, retainerId);
    revalidatePath(`/c/${companyId}`, "layout");
  });
}

export async function invoiceRetainerAction(companyId: string, retainerId: string, _prev: ActionState, formData: FormData) {
  return runAction(formData, async () => {
    const { period } = parseInput(retainerInvoiceSchema, Object.fromEntries(formData));
    await invoiceRetainerPeriod(companyId, retainerId, period);
    revalidatePath(`/c/${companyId}`, "layout");
    return { ok: true, message: `Brouillon de facture créé pour ${period}.` };
  });
}
