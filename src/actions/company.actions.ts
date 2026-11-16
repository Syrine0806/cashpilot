"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import {
  companySchema,
  companySettingsSchema,
  initialBalanceSchema,
  memberSchema,
  roleSchema,
} from "@/lib/validation/schemas";
import { parseInput, runAction } from "@/server/action";
import { requireUser } from "@/server/auth/dal";
import {
  addMember,
  changeMemberRole,
  createCompany,
  removeMember,
  updateCompanySettings,
  updateInitialBalance,
} from "@/server/services/company.service";

export async function createCompanyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let companyId = "";
  const result = await runAction(formData, async () => {
    const user = await requireUser();
    const company = await createCompany(user, parseInput(companySchema, Object.fromEntries(formData)));
    companyId = company.id;
  });
  if (!result.ok) return result;
  redirect(`/c/${companyId}/dashboard`);
}

export async function updateSettingsAction(companyId: string, _prev: ActionState, formData: FormData) {
  return runAction(formData, async () => {
    await updateCompanySettings(companyId, parseInput(companySettingsSchema, Object.fromEntries(formData)));
    revalidatePath(`/c/${companyId}`, "layout");
    return { ok: true, message: "Paramètres enregistrés." };
  });
}

export async function updateInitialBalanceAction(companyId: string, _prev: ActionState, formData: FormData) {
  return runAction(formData, async () => {
    await updateInitialBalance(companyId, parseInput(initialBalanceSchema, Object.fromEntries(formData)));
    revalidatePath(`/c/${companyId}`, "layout");
    return { ok: true, message: "Solde initial mis à jour." };
  });
}

export async function addMemberAction(companyId: string, _prev: ActionState, formData: FormData) {
  return runAction(formData, async () => {
    await addMember(companyId, parseInput(memberSchema, Object.fromEntries(formData)));
    revalidatePath(`/c/${companyId}/settings`);
    return { ok: true, message: "Membre ajouté." };
  });
}

export async function changeRoleAction(companyId: string, membershipId: string, _prev: ActionState, formData: FormData) {
  return runAction(formData, async () => {
    const { role } = parseInput(roleSchema, Object.fromEntries(formData));
    await changeMemberRole(companyId, membershipId, role);
    revalidatePath(`/c/${companyId}/settings`);
    return { ok: true, message: "Rôle mis à jour." };
  });
}

export async function removeMemberAction(companyId: string, membershipId: string, _prev: ActionState, formData: FormData) {
  return runAction(formData, async () => {
    await removeMember(companyId, membershipId);
    revalidatePath(`/c/${companyId}/settings`);
    return { ok: true, message: "Membre retiré." };
  });
}
