"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { adjustmentSchema, scenarioSchema } from "@/lib/validation/schemas";
import { parseInput, runAction } from "@/server/action";
import { addAdjustment, createScenario, deleteScenario, removeAdjustment } from "@/server/services/scenario.service";

export async function createScenarioAction(companyId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  const result = await runAction(formData, async () => {
    id = (await createScenario(companyId, parseInput(scenarioSchema, Object.fromEntries(formData)))).id;
  });
  if (!result.ok) return result;
  redirect(`/c/${companyId}/simulations/${id}`);
}

export async function deleteScenarioAction(companyId: string, scenarioId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const result = await runAction(formData, async () => {
    await deleteScenario(companyId, scenarioId);
    revalidatePath(`/c/${companyId}/simulations`);
  });
  if (!result.ok) return result;
  redirect(`/c/${companyId}/simulations`);
}

export async function addAdjustmentAction(companyId: string, scenarioId: string, _prev: ActionState, formData: FormData) {
  return runAction(formData, async () => {
    await addAdjustment(companyId, scenarioId, parseInput(adjustmentSchema, Object.fromEntries(formData)));
    revalidatePath(`/c/${companyId}/simulations/${scenarioId}`);
    return { ok: true, message: "Hypothèse ajoutée." };
  });
}

export async function removeAdjustmentAction(companyId: string, scenarioId: string, adjustmentId: string, _prev: ActionState, formData: FormData) {
  return runAction(formData, async () => {
    await removeAdjustment(companyId, adjustmentId);
    revalidatePath(`/c/${companyId}/simulations/${scenarioId}`);
  });
}
