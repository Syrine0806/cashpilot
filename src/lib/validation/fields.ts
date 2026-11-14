import { z } from "zod";
import { isISODate } from "@/domain/dates";
import { MAX_AMOUNT, parseMoney } from "@/domain/money";

/** Positive amount typed by a user ("1 234,500") → millimes. */
export const amountField = z
  .string({ error: "Montant requis." })
  .trim()
  .min(1, "Montant requis.")
  .refine((v) => parseMoney(v) !== null, "Montant invalide (ex. 1250,500).")
  .transform((v) => parseMoney(v) as number)
  .refine((v) => v > 0, "Le montant doit être strictement positif.")
  .refine((v) => v <= MAX_AMOUNT, "Montant trop élevé.");

/** Amount that may be zero (e.g. an initial balance). Negative allowed for overdrafts. */
export const balanceField = z
  .string({ error: "Montant requis." })
  .trim()
  .min(1, "Montant requis.")
  .refine((v) => parseMoney(v) !== null, "Montant invalide (ex. 5000,000).")
  .transform((v) => parseMoney(v) as number)
  .refine((v) => Math.abs(v) <= MAX_AMOUNT, "Montant trop élevé.");

export const dateField = z
  .string({ error: "Date requise." })
  .trim()
  .refine(isISODate, "Date invalide.");

export const optionalDateField = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || isISODate(v), "Date invalide.");

export const requiredText = (max: number, label = "Ce champ") =>
  z
    .string({ error: `${label} est requis.` })
    .trim()
    .min(1, `${label} est requis.`)
    .max(max, `${label} ne doit pas dépasser ${max} caractères.`);

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum.`)
    .optional()
    .transform((v) => (v ? v : null));

export const idField = z.string().trim().min(1, "Sélection requise.").max(64);

/** Tax rate typed as a percentage ("19", "7", "13,5") → basis points. */
export const taxRateField = z
  .string()
  .trim()
  .refine((v) => /^\d{1,2}([.,]\d{1,2})?$/.test(v), "Taux invalide (ex. 19).")
  .transform((v) => Math.round(Number(v.replace(",", ".")) * 100));

/** Quantity with up to 3 decimals ("7,5") → quantity × 1000. */
export const quantityField = z
  .string()
  .trim()
  .refine((v) => /^\d{1,6}([.,]\d{1,3})?$/.test(v), "Quantité invalide.")
  .transform((v) => {
    const [units, decimals = ""] = v.replace(",", ".").split(".");
    return Number(units) * 1000 + Number(decimals.padEnd(3, "0"));
  })
  .refine((v) => v > 0, "La quantité doit être positive.");

export const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true");
