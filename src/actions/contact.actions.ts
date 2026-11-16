"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { contactSchema } from "@/lib/validation/schemas";
import { parseInput, runAction } from "@/server/action";
import { createContact, setContactArchived, updateContact } from "@/server/services/contact.service";

export async function saveContactAction(
  companyId: string,
  contactId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let id = contactId;
  const result = await runAction(formData, async () => {
    const input = parseInput(contactSchema, Object.fromEntries(formData));
    if (contactId) await updateContact(companyId, contactId, input);
    else id = (await createContact(companyId, input)).id;
    revalidatePath(`/c/${companyId}/contacts`);
  });
  if (!result.ok) return result;
  redirect(`/c/${companyId}/contacts/${id}`);
}

export async function archiveContactAction(companyId: string, contactId: string, archived: boolean, _prev: ActionState, formData: FormData) {
  return runAction(formData, async () => {
    await setContactArchived(companyId, contactId, archived);
    revalidatePath(`/c/${companyId}/contacts`, "layout");
    return { ok: true, message: archived ? "Contact archivé." : "Contact restauré." };
  });
}
