import type { Metadata } from "next";
import Link from "next/link";
import { createRetainerAction, invoiceRetainerAction, toggleRetainerAction } from "@/actions/treasury.actions";
import { ActionForm } from "@/components/forms/action-form";
import { AmountInput, Input, Select } from "@/components/forms/fields";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate } from "@/domain/dates";
import { INVOICE_STATUS_LABELS, type InvoiceDisplayStatus } from "@/domain/invoice";
import { formatMoney, mulDivRound } from "@/domain/money";
import { requireCompanyPage } from "@/server/auth/dal";
import { prisma } from "@/server/db";
import { today } from "@/server/env";
import { listContactOptions } from "@/server/queries/contact.queries";
import { listRetainers } from "@/server/queries/planning.queries";

export const metadata: Metadata = { title: "Contrats récurrents" };

export default async function RetainersPage({ params }: PageProps<"/c/[companyId]/retainers">) {
  const { companyId } = await params;
  const ctx = await requireCompanyPage(companyId, "forecast.view");
  const [retainers, clients, company] = await Promise.all([
    listRetainers(companyId),
    listContactOptions(companyId, "CLIENT"),
    prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { defaultTaxRateBp: true } }),
  ]);
  const monthly = retainers.filter((r) => r.active).reduce((s, r) => s + r.monthlyAmount + mulDivRound(r.monthlyAmount, r.taxRateBp, 10_000), 0);

  return (
    <>
      <PageHeader
        title="Contrats récurrents"
        description="Fonctionnalité « agence digitale » : contrats de maintenance, hébergement ou community management facturés chaque mois."
      />
      <div className="mb-6">
        <Alert tone="info">
          Chaque mensualité non encore facturée alimente automatiquement les prévisions. Dès qu&apos;une facture est validée pour un mois, c&apos;est son
          reste à payer qui est pris en compte : le même mois n&apos;est jamais compté deux fois. Revenu récurrent actif :{" "}
          <strong>{formatMoney(monthly)} TTC / mois</strong>.
        </Alert>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {retainers.length === 0 ? (
            <Card><EmptyState title="Aucun contrat récurrent" description="Ajoutez un contrat pour projeter vos revenus mensuels." /></Card>
          ) : (
            retainers.map((r) => {
              const invoiced = new Map(r.invoices.map((i) => [i.retainerPeriod, i]));
              return (
                <Card key={r.id}>
                  <CardHeader
                    title={<span className="flex items-center gap-2">{r.label} <Badge tone={r.active ? "positive" : "neutral"}>{r.active ? "Actif" : "Suspendu"}</Badge></span>}
                    description={
                      <>
                        <Link href={`/c/${companyId}/contacts/${r.client.id}`} className="text-brand hover:underline">{r.client.name}</Link> ·{" "}
                        {formatMoney(r.monthlyAmount)} HT / mois · encaissement le {r.dayOfMonth} du mois · depuis le {formatDate(r.startDate)}
                        {r.endDate ? ` jusqu'au ${formatDate(r.endDate)}` : ""}
                      </>
                    }
                    actions={
                      ctx.can("forecast.manage") && (
                        <ActionForm inline action={toggleRetainerAction.bind(null, companyId, r.id)} submitLabel={r.active ? "Suspendre" : "Réactiver"} submitVariant="ghost" />
                      )
                    }
                  />
                  <CardBody className="flex flex-wrap items-center gap-3">
                    {[r.currentPeriod, r.nextPeriod].map((period) => {
                      const invoice = invoiced.get(period);
                      return invoice ? (
                        <LinkButton key={period} href={`/c/${companyId}/invoices/${invoice.id}`} variant="secondary" size="sm">
                          {period} : {invoice.number ?? INVOICE_STATUS_LABELS[invoice.status as InvoiceDisplayStatus]}
                        </LinkButton>
                      ) : (
                        ctx.can("invoices.manage") &&
                        r.active && (
                          <ActionForm key={period} inline action={invoiceRetainerAction.bind(null, companyId, r.id)} submitLabel={`Facturer ${period}`} submitVariant="secondary">
                            <input type="hidden" name="period" value={period} />
                          </ActionForm>
                        )
                      );
                    })}
                    <span className="text-xs text-text-muted">{r.invoices.length} facture(s) émise(s) pour ce contrat</span>
                  </CardBody>
                </Card>
              );
            })
          )}
        </div>
        {ctx.can("forecast.manage") && (
          <Card>
            <CardHeader title="Nouveau contrat" />
            <CardBody>
              {clients.length === 0 ? (
                <p className="text-sm text-text-muted">Créez d&apos;abord un client.</p>
              ) : (
                <ActionForm action={createRetainerAction.bind(null, companyId)} submitLabel="Ajouter le contrat">
                  <Select name="clientId" label="Client" required placeholder="Choisir…" options={clients.map((c) => ({ value: c.id, label: c.name }))} />
                  <Input name="label" label="Libellé" required maxLength={120} placeholder="Maintenance site e-commerce" />
                  <AmountInput name="monthlyAmount" label="Montant mensuel HT (DT)" required />
                  <div className="grid grid-cols-2 gap-3">
                    <Input name="taxRate" label="TVA (%)" defaultValue={String(company.defaultTaxRateBp / 100)} required />
                    <Input name="dayOfMonth" type="number" label="Jour d'encaissement" defaultValue={10} min={1} max={28} required />
                  </div>
                  <Input name="startDate" type="date" label="Début" defaultValue={today()} required />
                  <Input name="endDate" type="date" label="Fin (facultatif)" />
                </ActionForm>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
