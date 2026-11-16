import type { CompanyContext } from "@/server/auth/dal";

export interface NavItem {
  key: string;
  href: string;
  label: string;
  badge?: number;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export interface CommandItem {
  id: string;
  label: string;
  href: string;
  section: "Navigation" | "Actions";
  hint?: string;
}

/** Navigation filtered by the user's permissions (UI only: the server re-checks every access). */
export function buildNavigation(ctx: CompanyContext, alerts: number): NavGroup[] {
  const base = `/c/${ctx.company.id}`;
  const groups: { label: string; items: (NavItem & { visible: boolean })[] }[] = [
    {
      label: "Pilotage",
      items: [
        { key: "dashboard", href: `${base}/dashboard`, label: "Tableau de bord", badge: alerts, visible: true },
        { key: "forecast", href: `${base}/forecast`, label: "Prévisions", visible: ctx.can("forecast.view") },
        { key: "simulations", href: `${base}/simulations`, label: "Simulations", visible: ctx.can("scenarios.manage") },
      ],
    },
    {
      label: "Opérations",
      items: [
        { key: "invoices", href: `${base}/invoices`, label: "Factures", visible: ctx.can("invoices.view") },
        { key: "expenses", href: `${base}/expenses`, label: ctx.can("expenses.viewAll") ? "Dépenses" : "Mes dépenses", visible: true },
        { key: "treasury", href: `${base}/treasury`, label: "Trésorerie", visible: ctx.can("treasury.view") },
        { key: "contacts", href: `${base}/contacts`, label: "Clients & fournisseurs", visible: ctx.can("contacts.view") },
        { key: "retainers", href: `${base}/retainers`, label: "Contrats récurrents", visible: ctx.can("forecast.view") },
      ],
    },
    {
      label: "Administration",
      items: [
        { key: "audit", href: `${base}/audit`, label: "Journal d'audit", visible: ctx.can("audit.view") },
        { key: "settings", href: `${base}/settings`, label: "Entreprise & membres", visible: ctx.can("members.manage") },
      ],
    },
  ];
  return groups
    .map((g) => ({
      label: g.label,
      items: g.items.filter((i) => i.visible).map((i) => ({ key: i.key, href: i.href, label: i.label, badge: i.badge })),
    }))
    .filter((g) => g.items.length > 0);
}

/** Entries of the ⌘K command palette. */
export function buildCommands(ctx: CompanyContext, groups: NavGroup[]): CommandItem[] {
  const base = `/c/${ctx.company.id}`;
  const actions: (CommandItem & { visible: boolean })[] = [
    { id: "new-invoice", label: "Créer une facture", href: `${base}/invoices/new`, section: "Actions", visible: ctx.can("invoices.manage") },
    { id: "new-expense", label: "Soumettre une dépense", href: `${base}/expenses/new`, section: "Actions", visible: ctx.can("expenses.submit") },
    { id: "new-contact", label: "Ajouter un client ou fournisseur", href: `${base}/contacts/new`, section: "Actions", visible: ctx.can("contacts.manage") },
    { id: "new-scenario", label: "Lancer une simulation « What if? »", href: `${base}/simulations`, section: "Actions", visible: ctx.can("scenarios.manage") },
    { id: "switch", label: "Changer d'entreprise", href: "/companies", section: "Actions", visible: true },
  ];
  return [
    ...groups.flatMap((g) => g.items.map((i) => ({ id: i.key, label: i.label, href: i.href, section: "Navigation" as const, hint: g.label }))),
    ...actions.filter((a) => a.visible).map((a) => ({ id: a.id, label: a.label, href: a.href, section: a.section })),
  ];
}
