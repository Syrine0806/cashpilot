import { BusinessRuleError } from "./errors";

/**
 * Expense approval workflow:
 *
 *   SUBMITTED ──approve──▶ APPROVED ──pay──▶ PAID
 *       │
 *       └──────reject────▶ REJECTED (terminal: can never be paid)
 */
export const EXPENSE_STATUSES = ["SUBMITTED", "APPROVED", "REJECTED", "PAID"] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  SUBMITTED: "À valider",
  APPROVED: "Approuvée",
  REJECTED: "Refusée",
  PAID: "Payée",
};

export const EXPENSE_CATEGORIES = [
  "SALARIES",
  "RENT",
  "SOFTWARE",
  "HARDWARE",
  "FREELANCE",
  "ADVERTISING",
  "TRAVEL",
  "TAXES",
  "OFFICE",
  "OTHER",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  SALARIES: "Salaires",
  RENT: "Loyer",
  SOFTWARE: "Logiciels & abonnements",
  HARDWARE: "Matériel",
  FREELANCE: "Sous-traitance / freelances",
  ADVERTISING: "Publicité",
  TRAVEL: "Déplacements",
  TAXES: "Impôts & charges",
  OFFICE: "Fournitures de bureau",
  OTHER: "Autre",
};

export type ExpenseAction = "approve" | "reject" | "pay" | "withdraw";

const TRANSITIONS: Record<ExpenseAction, { from: ExpenseStatus; to: ExpenseStatus | null }> = {
  approve: { from: "SUBMITTED", to: "APPROVED" },
  reject: { from: "SUBMITTED", to: "REJECTED" },
  pay: { from: "APPROVED", to: "PAID" },
  withdraw: { from: "SUBMITTED", to: null }, // the request is deleted by its author
};

const ERRORS: Record<ExpenseAction, string> = {
  approve: "Seule une dépense en attente de validation peut être approuvée.",
  reject: "Seule une dépense en attente de validation peut être refusée.",
  pay: "Seule une dépense approuvée peut être payée (une dépense refusée ou déjà payée ne peut pas l'être).",
  withdraw: "Seule une demande encore en attente peut être retirée.",
};

export function canTransition(status: string, action: ExpenseAction): boolean {
  return TRANSITIONS[action].from === status;
}

/** Returns the next status or throws if the transition is not allowed. */
export function nextExpenseStatus(status: string, action: ExpenseAction): ExpenseStatus | null {
  if (!canTransition(status, action)) throw new BusinessRuleError(ERRORS[action]);
  return TRANSITIONS[action].to;
}
