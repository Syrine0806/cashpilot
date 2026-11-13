/**
 * Role-based access control. This matrix is the single source of truth used
 * both to hide UI elements and — more importantly — to authorise every
 * server-side read and mutation.
 */

export const ROLES = ["DIRECTOR", "FINANCE_MANAGER", "EMPLOYEE"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  DIRECTOR: "Dirigeant",
  FINANCE_MANAGER: "Gestionnaire financier",
  EMPLOYEE: "Collaborateur",
};

export const PERMISSIONS = [
  "company.manage", // settings and initial balance
  "members.manage", // invite, change roles, remove
  "dashboard.view", // company-wide indicators
  "contacts.view",
  "contacts.manage",
  "invoices.view",
  "invoices.manage", // drafts, validation, cancellation
  "payments.manage", // record & reverse customer payments
  "expenses.submit",
  "expenses.viewAll", // otherwise: only one's own requests
  "expenses.approve",
  "expenses.pay",
  "treasury.view",
  "treasury.manage", // manual movements and reversals
  "forecast.view",
  "forecast.manage", // planned flows and retainers
  "scenarios.manage",
  "audit.view",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const FINANCE: Permission[] = [
  "dashboard.view",
  "contacts.view",
  "contacts.manage",
  "invoices.view",
  "invoices.manage",
  "payments.manage",
  "expenses.submit",
  "expenses.viewAll",
  "expenses.pay",
  "treasury.view",
  "treasury.manage",
  "forecast.view",
  "forecast.manage",
  "scenarios.manage",
  "audit.view",
];

export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  // The director sees everything, approves expenses and manages the company.
  DIRECTOR: new Set<Permission>([...FINANCE, "company.manage", "members.manage", "expenses.approve"]),
  // The finance manager runs invoices, payments and forecasts, but does not approve expenses.
  FINANCE_MANAGER: new Set<Permission>(FINANCE),
  // Employees submit expenses and follow their own requests.
  EMPLOYEE: new Set<Permission>(["expenses.submit"]),
};

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}
