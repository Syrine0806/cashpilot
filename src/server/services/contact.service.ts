import "server-only";
import { z } from "zod";
import { CONTACT_KIND_LABELS, type ContactKind } from "@/domain/company";
import { NotFoundError } from "@/domain/errors";
import { contactSchema } from "@/lib/validation/schemas";
import { authorize } from "../auth/dal";
import { audit } from "../audit";
import { prisma } from "../db";

type ContactInput = z.output<typeof contactSchema>;

export async function createContact(companyId: string, input: ContactInput) {
  const ctx = await authorize(companyId, "contacts.manage");
  return prisma.$transaction(async (tx) => {
    const contact = await tx.contact.create({ data: { companyId, ...input } });
    await audit(tx, companyId, ctx.user.id, {
      action: "contact.created",
      entityType: "Contact",
      entityId: contact.id,
      summary: `${CONTACT_KIND_LABELS[input.kind as ContactKind]} « ${input.name} » créé`,
    });
    return contact;
  });
}

export async function updateContact(companyId: string, contactId: string, input: ContactInput) {
  const ctx = await authorize(companyId, "contacts.manage");
  const contact = await prisma.contact.findFirst({ where: { id: contactId, companyId } });
  if (!contact) throw new NotFoundError("Contact introuvable.");
  await prisma.$transaction(async (tx) => {
    await tx.contact.update({ where: { id: contactId }, data: input });
    await audit(tx, companyId, ctx.user.id, {
      action: "contact.updated",
      entityType: "Contact",
      entityId: contactId,
      summary: `Coordonnées de « ${input.name} » mises à jour`,
    });
  });
}

/** Contacts are archived, never deleted, so the invoice/payment history stays intact. */
export async function setContactArchived(companyId: string, contactId: string, archived: boolean) {
  const ctx = await authorize(companyId, "contacts.manage");
  const contact = await prisma.contact.findFirst({ where: { id: contactId, companyId } });
  if (!contact) throw new NotFoundError("Contact introuvable.");
  await prisma.$transaction(async (tx) => {
    await tx.contact.update({ where: { id: contactId }, data: { archivedAt: archived ? new Date() : null } });
    await audit(tx, companyId, ctx.user.id, {
      action: archived ? "contact.archived" : "contact.restored",
      entityType: "Contact",
      entityId: contactId,
      summary: `« ${contact.name} » ${archived ? "archivé" : "restauré"}`,
    });
  });
}
