import { ArrowRight, Building2, LogOut } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { logoutAction } from "@/actions/auth.actions";
import { createCompanyAction } from "@/actions/company.actions";
import { ActionForm } from "@/components/forms/action-form";
import { AmountInput, Input, Select } from "@/components/forms/fields";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SECTORS, SECTOR_LABELS, type Sector } from "@/domain/company";
import { ROLE_LABELS, type Role } from "@/domain/permissions";
import { requireUser } from "@/server/auth/dal";
import { today } from "@/server/env";
import { listUserCompanies } from "@/server/queries/company.queries";

export const metadata: Metadata = { title: "Mes entreprises" };

export default async function CompaniesPage() {
  const user = await requireUser();
  const memberships = await listUserCompanies(user.id);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface/70 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-3">
            <ThemeToggle tone="surface" />
            <form action={logoutAction}>
              <button type="submit" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text">
                <LogOut className="size-4" aria-hidden /> Se déconnecter
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Espaces entreprise</p>
        <h1 className="mt-1.5 text-[28px] font-semibold tracking-tight">Bonjour {user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-text-secondary">Choisissez l&apos;entreprise à piloter ou créez un nouvel espace.</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div>
            {memberships.length === 0 ? (
              <Card>
                <EmptyState title="Aucune entreprise" description="Créez votre premier espace entreprise ou demandez à un dirigeant de vous ajouter." />
              </Card>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {memberships.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/c/${m.company.id}/dashboard`}
                      className="group flex h-full animate-rise flex-col justify-between gap-6 rounded-2xl border border-border bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-pop"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar name={m.company.name} size="lg" square />
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{m.company.name}</p>
                          <p className="text-sm text-text-muted">{SECTOR_LABELS[m.company.sector as Sector] ?? m.company.sector}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge tone="brand">{ROLE_LABELS[m.role as Role] ?? m.role}</Badge>
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-brand">
                          Ouvrir <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Card>
            <CardHeader title="Nouvelle entreprise" description="Vous en serez le dirigeant." icon={<Building2 className="size-4" aria-hidden />} />
            <CardBody>
              <ActionForm action={createCompanyAction} submitLabel="Créer l'entreprise">
                <Input name="name" label="Nom de l'entreprise" required maxLength={80} />
                <Select name="sector" label="Secteur" defaultValue="DIGITAL_AGENCY" options={SECTORS.map((s) => ({ value: s, label: SECTOR_LABELS[s] }))} />
                <AmountInput name="initialBalance" label="Solde initial (DT)" required hint="Solde bancaire de départ." />
                <Input name="initialBalanceDate" type="date" label="Date du solde initial" defaultValue={today()} max={today()} required />
              </ActionForm>
            </CardBody>
          </Card>
        </div>
      </main>
    </div>
  );
}
