"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { loginSchema, registerSchema } from "@/lib/validation/schemas";
import { parseInput, runAction } from "@/server/action";
import { createSession, deleteSession } from "@/server/auth/session";
import { authenticate, registerUser } from "@/server/services/auth.service";

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const result = await runAction(formData, async () => {
    const input = parseInput(loginSchema, Object.fromEntries(formData));
    const user = await authenticate(input);
    await createSession(user.id);
  });
  if (!result.ok) return result;
  const next = String(formData.get("next") ?? "");
  // Only allow local redirects (prevents open redirects).
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/companies");
}

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const result = await runAction(formData, async () => {
    const input = parseInput(registerSchema, Object.fromEntries(formData));
    const user = await registerUser(input);
    await createSession(user.id);
  });
  if (!result.ok) return result;
  redirect("/companies");
}

export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
