import "server-only";
/**
 * Data Access Layer for authentication & authorisation.
 *
 * Every page, Server Action and Route Handler goes through these helpers:
 * the proxy only performs an optimistic redirect, the real checks live here,
 * close to the data.
 */
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { can, isRole, type Permission, type Role } from "@/domain/permissions";
import { ForbiddenError, NotFoundError } from "@/domain/errors";
import { prisma } from "../db";
import { readSession } from "./session";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

export interface CompanyContext {
  user: CurrentUser;
  role: Role;
  company: {
    id: string;
    name: string;
    sector: string;
    currency: string;
  };
  can: (permission: Permission) => boolean;
}

/** Returns the signed-in user or null (deduplicated per request). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true },
  });
});

/** For pages: redirects to /login when signed out. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

const loadMembership = cache(async (userId: string, companyId: string) =>
  prisma.membership.findUnique({
    where: { userId_companyId: { userId, companyId } },
    include: { company: { select: { id: true, name: true, sector: true, currency: true } } },
  }),
);

/**
 * Resolves the current user's membership in a company. Users who are not
 * members get a 404 (the company's existence is not revealed).
 */
export async function getCompanyContext(companyId: string): Promise<CompanyContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const membership = await loadMembership(user.id, companyId);
  if (!membership || !isRole(membership.role)) return null;
  const role = membership.role;
  return {
    user,
    role,
    company: membership.company,
    can: (permission) => can(role, permission),
  };
}

/** For pages and route handlers: 404 when not a member, 403-like 404 when lacking the permission. */
export async function requireCompanyPage(companyId: string, permission?: Permission): Promise<CompanyContext> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const ctx = await getCompanyContext(companyId);
  if (!ctx) notFound();
  if (permission && !ctx.can(permission)) redirect(`/c/${companyId}/forbidden`);
  return ctx;
}

/** For Server Actions and services: throws typed errors rendered by the forms. */
export async function authorize(companyId: string, permission?: Permission): Promise<CompanyContext> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const ctx = await getCompanyContext(companyId);
  if (!ctx) throw new NotFoundError("Entreprise introuvable.");
  if (permission && !ctx.can(permission)) throw new ForbiddenError();
  return ctx;
}
