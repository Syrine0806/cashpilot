import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession } from "./jwt";

export async function createSession(userId: string): Promise<void> {
  const token = await signSession({ userId });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function readSession() {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function deleteSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
