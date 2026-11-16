import "server-only";
import { z } from "zod";
import { fromISODate } from "@/domain/dates";
import { BusinessRuleError, ValidationError } from "@/domain/errors";
import { formatMoney } from "@/domain/money";
import { ROLE_LABELS, type Role } from "@/domain/permissions";
import {
  companySchema,
  companySettingsSchema,
  initialBalanceSchema,
  memberSchema,
} from "@/lib/validation/schemas";
import { authorize, type CurrentUser } from "../auth/dal";
import { hashPassword } from "../auth/password";
import { audit } from "../audit";
import { prisma } from "../db";
import { today } from "../env";

export async function createCompany(user: CurrentUser, input: z.output<typeof companySchema>) {
  if (input.initialBalanceDate > today()) {
    throw new ValidationError("Date invalide.", { initialBalanceDate: ["La date du solde initial ne peut pas être future."] });
  }
  return prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: input.name,
        sector: input.sector,
        initialBalance: input.initialBalance,
        initialBalanceDate: fromISODate(input.initialBalanceDate),
        memberships: { create: { userId: user.id, role: "DIRECTOR" } },
      },
    });
    await audit(tx, company.id, user.id, {
      action: "company.created",
      entityType: "Company",
      entityId: company.id,
      summary: `Création de l'entreprise avec un solde initial de ${formatMoney(input.initialBalance)}`,
    });
    return company;
  });
}

export async function updateCompanySettings(companyId: string, input: z.output<typeof companySettingsSchema>) {
  const ctx = await authorize(companyId, "company.manage");
  await prisma.$transaction(async (tx) => {
    await tx.company.update({
      where: { id: companyId },
      data: {
        name: input.name,
        sector: input.sector,
        invoicePrefix: input.invoicePrefix,
        defaultTaxRateBp: input.defaultTaxRate,
      },
    });
    await audit(tx, companyId, ctx.user.id, {
      action: "company.updated",
      entityType: "Company",
      entityId: companyId,
      summary: "Mise à jour des paramètres de l'entreprise",
    });
  });
}

/**
 * The initial balance can only be changed while no real operation exists:
 * afterwards, corrections must go through a traceable treasury movement.
 */
export async function updateInitialBalance(companyId: string, input: z.output<typeof initialBalanceSchema>) {
  const ctx = await authorize(companyId, "company.manage");
  await prisma.$transaction(async (tx) => {
    const movements = await tx.movement.count({ where: { companyId } });
    if (movements > 0) {
      throw new BusinessRuleError(
        "Des opérations ont déjà été enregistrées : corrigez le solde via un mouvement de trésorerie traçable.",
      );
    }
    await tx.company.update({
      where: { id: companyId },
      data: { initialBalance: input.initialBalance, initialBalanceDate: fromISODate(input.initialBalanceDate) },
    });
    await audit(tx, companyId, ctx.user.id, {
      action: "company.initialBalance",
      entityType: "Company",
      entityId: companyId,
      summary: `Solde initial fixé à ${formatMoney(input.initialBalance)}`,
    });
  });
}

export async function addMember(companyId: string, input: z.output<typeof memberSchema>) {
  const ctx = await authorize(companyId, "members.manage");
  await prisma.$transaction(async (tx) => {
    let user = await tx.user.findUnique({ where: { email: input.email } });
    if (!user) {
      if (!input.name) throw new ValidationError("Nom requis.", { name: ["Nom requis pour un nouveau compte."] });
      if (!input.password || input.password.length < 8) {
        throw new ValidationError("Mot de passe requis.", {
          password: ["Mot de passe provisoire de 8 caractères minimum requis pour un nouveau compte."],
        });
      }
      user = await tx.user.create({
        data: { email: input.email, name: input.name, passwordHash: await hashPassword(input.password) },
      });
    }
    const existing = await tx.membership.findUnique({ where: { userId_companyId: { userId: user.id, companyId } } });
    if (existing) throw new BusinessRuleError("Cette personne est déjà membre de l'entreprise.");
    await tx.membership.create({ data: { userId: user.id, companyId, role: input.role } });
    await audit(tx, companyId, ctx.user.id, {
      action: "member.added",
      entityType: "Membership",
      entityId: user.id,
      summary: `${user.name} ajouté(e) en tant que ${ROLE_LABELS[input.role]}`,
    });
  });
}

async function assertNotLastDirector(companyId: string, membershipId: string) {
  const membership = await prisma.membership.findFirst({ where: { id: membershipId, companyId } });
  if (!membership) throw new BusinessRuleError("Membre introuvable.");
  if (membership.role === "DIRECTOR") {
    const directors = await prisma.membership.count({ where: { companyId, role: "DIRECTOR" } });
    if (directors <= 1) throw new BusinessRuleError("L'entreprise doit conserver au moins un dirigeant.");
  }
  return membership;
}

export async function changeMemberRole(companyId: string, membershipId: string, role: Role) {
  const ctx = await authorize(companyId, "members.manage");
  const membership = await prisma.membership.findFirst({ where: { id: membershipId, companyId }, include: { user: true } });
  if (!membership) throw new BusinessRuleError("Membre introuvable.");
  if (membership.role === role) return;
  if (membership.role === "DIRECTOR") await assertNotLastDirector(companyId, membershipId);
  await prisma.$transaction(async (tx) => {
    await tx.membership.update({ where: { id: membershipId }, data: { role } });
    await audit(tx, companyId, ctx.user.id, {
      action: "member.roleChanged",
      entityType: "Membership",
      entityId: membership.userId,
      summary: `${membership.user.name} : ${ROLE_LABELS[membership.role as Role] ?? membership.role} → ${ROLE_LABELS[role]}`,
    });
  });
}

export async function removeMember(companyId: string, membershipId: string) {
  const ctx = await authorize(companyId, "members.manage");
  const membership = await assertNotLastDirector(companyId, membershipId);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: membership.userId } });
  await prisma.$transaction(async (tx) => {
    await tx.membership.delete({ where: { id: membershipId } });
    await audit(tx, companyId, ctx.user.id, {
      action: "member.removed",
      entityType: "Membership",
      entityId: membership.userId,
      summary: `${user.name} retiré(e) de l'entreprise`,
    });
  });
}
