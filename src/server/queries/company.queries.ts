import "server-only";
import { prisma } from "../db";

export async function listUserCompanies(userId: string) {
  return prisma.membership.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { company: { select: { id: true, name: true, sector: true } } },
  });
}

export async function getCompanySettings(companyId: string) {
  return prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    include: { _count: { select: { movements: true } } },
  });
}

export async function listMembers(companyId: string) {
  return prisma.membership.findMany({
    where: { companyId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}

export async function listAuditLogs(companyId: string, take = 200) {
  return prisma.auditLog.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take,
    include: { actor: { select: { name: true } } },
  });
}
