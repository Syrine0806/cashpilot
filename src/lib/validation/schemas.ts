import { z } from "zod";
import { CONTACT_KINDS, MANUAL_MOVEMENT_KINDS, SECTORS } from "@/domain/company";
import { EXPENSE_CATEGORIES } from "@/domain/expense";
import { PAYMENT_METHODS } from "@/domain/invoice";
import { ROLES } from "@/domain/permissions";
import { ADJUSTMENT_KINDS } from "@/domain/simulation";
import {
  amountField,
  balanceField,
  dateField,
  idField,
  optionalDateField,
  optionalText,
  quantityField,
  requiredText,
  taxRateField,
} from "./fields";

const email = z.string().trim().toLowerCase().email("Adresse e-mail invalide.").max(160);
const password = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
  .max(100)
  .regex(/[A-Za-z]/, "Le mot de passe doit contenir une lettre.")
  .regex(/\d/, "Le mot de passe doit contenir un chiffre.");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Mot de passe requis."),
});

export const registerSchema = z.object({
  name: requiredText(80, "Le nom"),
  email,
  password,
});

export const companySchema = z.object({
  name: requiredText(80, "Le nom de l'entreprise"),
  sector: z.enum(SECTORS, { error: "Secteur invalide." }),
  initialBalance: balanceField,
  initialBalanceDate: dateField,
});

export const companySettingsSchema = z.object({
  name: requiredText(80, "Le nom de l'entreprise"),
  sector: z.enum(SECTORS, { error: "Secteur invalide." }),
  invoicePrefix: z
    .string()
    .trim()
    .regex(/^[A-Z0-9]{1,8}$/, "Préfixe : 1 à 8 lettres majuscules ou chiffres."),
  defaultTaxRate: taxRateField,
});

export const initialBalanceSchema = z.object({
  initialBalance: balanceField,
  initialBalanceDate: dateField,
});

export const memberSchema = z.object({
  email,
  name: optionalText(80),
  role: z.enum(ROLES, { error: "Rôle invalide." }),
  password: z.string().optional().transform((v) => (v ? v : null)),
});

export const roleSchema = z.object({ role: z.enum(ROLES, { error: "Rôle invalide." }) });

export const contactSchema = z.object({
  kind: z.enum(CONTACT_KINDS, { error: "Type invalide." }),
  name: requiredText(120, "Le nom"),
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.toLowerCase() : null))
    .refine((v) => v === null || z.email().safeParse(v).success, "Adresse e-mail invalide."),
  phone: optionalText(30),
  address: optionalText(200),
  taxId: optionalText(40),
  notes: optionalText(500),
});

export const invoiceLineSchema = z.object({
  description: requiredText(200, "La description"),
  quantity: quantityField,
  unitPrice: amountField,
});

export const invoiceSchema = z
  .object({
    clientId: idField,
    issueDate: dateField,
    dueDate: dateField,
    taxRate: taxRateField,
    notes: optionalText(500),
    lines: z.array(invoiceLineSchema).min(1, "Ajoutez au moins une ligne.").max(50),
  })
  .refine((v) => v.dueDate >= v.issueDate, {
    path: ["dueDate"],
    message: "L'échéance ne peut pas précéder la date d'émission.",
  });

export const cancelInvoiceSchema = z.object({ reason: requiredText(300, "Le motif") });

export const paymentSchema = z.object({
  amount: amountField,
  date: dateField,
  method: z.enum(PAYMENT_METHODS, { error: "Mode de paiement invalide." }),
  reference: optionalText(80),
});

export const reversalSchema = z.object({ reason: requiredText(300, "Le motif") });

export const expenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES, { error: "Catégorie invalide." }),
  description: requiredText(200, "La description"),
  amount: amountField,
  expenseDate: dateField,
  dueDate: dateField,
  supplierId: z
    .string()
    .optional()
    .transform((v) => (v ? v : null)),
});

export const reviewSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  comment: optionalText(300),
});

export const payExpenseSchema = z.object({
  date: dateField,
  method: z.enum(PAYMENT_METHODS, { error: "Mode de paiement invalide." }),
});

export const movementSchema = z.object({
  kind: z.enum(MANUAL_MOVEMENT_KINDS, { error: "Type invalide." }),
  label: requiredText(120, "Le libellé"),
  amount: amountField,
  date: dateField,
});

export const plannedFlowSchema = z.object({
  direction: z.enum(["IN", "OUT"]),
  label: requiredText(120, "Le libellé"),
  amount: amountField,
  startDate: dateField,
  recurrence: z.enum(["NONE", "MONTHLY"]),
  endDate: optionalDateField,
});

export const retainerSchema = z
  .object({
    clientId: idField,
    label: requiredText(120, "Le libellé"),
    monthlyAmount: amountField,
    taxRate: taxRateField,
    dayOfMonth: z.coerce.number().int().min(1, "Jour entre 1 et 28.").max(28, "Jour entre 1 et 28."),
    startDate: dateField,
    endDate: optionalDateField,
  })
  .refine((v) => v.endDate === null || v.endDate >= v.startDate, {
    path: ["endDate"],
    message: "La date de fin doit suivre la date de début.",
  });

export const retainerInvoiceSchema = z.object({
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Période invalide."),
});

export const scenarioSchema = z.object({
  name: requiredText(80, "Le nom"),
  description: optionalText(300),
});

export const adjustmentSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("DELAY_INVOICE"),
    invoiceId: idField,
    delayDays: z.coerce.number().int().min(1, "Retard d'au moins 1 jour.").max(365, "Retard de 365 jours maximum."),
  }),
  z.object({ kind: z.literal("NEW_EXPENSE"), label: requiredText(120, "Le libellé"), amount: amountField, date: dateField }),
  z.object({ kind: z.literal("NEW_INFLOW"), label: requiredText(120, "Le libellé"), amount: amountField, date: dateField }),
]);

export const adjustmentKindSchema = z.enum(ADJUSTMENT_KINDS);
