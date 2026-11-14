import "server-only";
import { z } from "zod";
import { BusinessRuleError, ValidationError } from "@/domain/errors";
import { loginSchema, registerSchema } from "@/lib/validation/schemas";
import { hashPassword, verifyPassword } from "../auth/password";
import { prisma } from "../db";

export async function registerUser(input: z.output<typeof registerSchema>) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ValidationError("Compte existant.", { email: ["Un compte existe déjà avec cette adresse."] });
  return prisma.user.create({
    data: { email: input.email, name: input.name, passwordHash: await hashPassword(input.password) },
  });
}

export async function authenticate(input: z.output<typeof loginSchema>) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // Same message in both cases: do not reveal which accounts exist.
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new BusinessRuleError("E-mail ou mot de passe incorrect.");
  }
  return user;
}
