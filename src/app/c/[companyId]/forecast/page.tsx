import clsx from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { createPlannedFlowAction, togglePlannedFlowAction } from "@/actions/treasury.actions";
import { ForecastChart } from "@/components/charts/forecast-chart";
import { ActionForm } from "@/components/forms/action-form";
import { AmountInput, Input, Select } from "@/components/forms/fields";
import { FlowsTable } from "@/components/forecast/flows-table";
import { MilestoneCards } from "@/components/forecast/milestones";
import { ShortfallSummary } from "@/components/forecast/shortfalls";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Money } from "@/components/ui/money";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Td, Th } from "@/components/ui/table";
import { formatDate, toISODate } from "@/domain/dates";
import { FORECAST_HORIZONS } from "@/domain/forecast";
import { formatMoney } from "@/domain/money";
import { param } from "@/lib/search-params";
import { requireCompanyPage } from "@/server/auth/dal";
import { getForecast } from "@/server/queries/forecast.queries";
import { listPlannedFlows } from "@/server/queries/planning.queries";

export const metadata: Metadata = { title: "Prévisions" };

export default async function ForecastPage({ params, searchParams }: PageProps<"/c/[companyId]/forecast">) {
  const { companyId } = await params;
  const sp = await searchParams;
  const ctx = await requireCompanyPage(companyId, "forecast.view");
  const horizon = FORECAST_HORIZONS.find((h) => String(h) === param(sp.horizon)) ?? 90;
  const includePending = param(sp.pending) === "1";
  const [{ forecast }, plannedFlows] = await Promise.all([
    getForecast(companyId, { horizonDays: horizon, includePending }),
    listPlannedFlows(companyId),
  ]);
  const base = `/c/${companyId}/forecast`;
  const query = (h: number, p: boolean) => `${base}?horizon=${h}${p ? "&pending=1" : ""}`;

  return (
    <>
      <PageHeader
        title="Prévisions de trésorerie"
        description="Solde prévisionnel à une date = solde réel de référence + encaissements restant attendus − décaissements restant prévus jusqu'à cette date."
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <nav aria-label="Horizon" className="inline-flex rounded-lg border border-border bg-surface p-1">
          {FORECAST_HORIZONS.map((h) => (
            <Link
              key={h}
              href={query(h, includePending)}
              aria-current={h === horizon ? "page" : undefined}
              className={clsx("rounded-md px-3 py-1.5 text-sm font-medium", h === horizon ? "bg-brand text-brand-contrast" : "text-text-secondary hover:bg-surface-muted")}
            >
              {h} jours
            </Link>
          ))}
        </nav>
        <Link href={query(horizon, !includePending)} className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm" role="switch" aria-checked={includePending}>
          <span className={clsx("inline-block size-3 rounded-full", includePending ? "bg-brand" : "bg-border")} />
          Inclure les dépenses en attente de validation (vue prudente)
        </Link>
      </div>

      <MilestoneCards milestones={forecast.milestones} referenceBalance={forecast.referenceBalance} />

      <Card className="mt-6">
        <CardHeader title={`Projection sur ${horizon} jours`} description={`Du ${formatDate(forecast.referenceDate)} au ${formatDate(forecast.endDate)}`} />
        <CardBody className="space-y-4">
          <ForecastChart points={forecast.points} shortfalls={forecast.shortfalls} milestones={forecast.milestones} />
          <ShortfallSummary shortfalls={forecast.shortfalls} horizonDays={horizon} />
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Hypothèses utilisées" />
        <CardBody>
          <ul className="list-disc space-y-1 pl-5 text-sm text-text-secondary">
            <li>Solde de référence : solde réel au {formatDate(forecast.referenceDate)}, soit <strong className="text-text">{formatMoney(forecast.referenceBalance)}</strong>.</li>
            <li>Factures validées : seul le <strong>reste à payer</strong> est attendu, à la date d&apos;échéance (les paiements déjà reçus sont dans le solde réel et ne sont pas recomptés).</li>
            <li>Factures échues non réglées : supposées encaissées aujourd&apos;hui. Brouillons et factures annulées : exclus.</li>
            <li>Dépenses approuvées non payées : décaissées à la date de paiement prévue. Dépenses en attente : {includePending ? "incluses (vue prudente)" : "exclues"}. Dépenses refusées : exclues.</li>
            <li>Flux planifiés actifs et mensualités des contrats récurrents non encore facturées.</li>
            <li>Total attendu sur l&apos;horizon : +{formatMoney(forecast.totals.inflows)} / −{formatMoney(forecast.totals.outflows)}.</li>
          </ul>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Détail des flux" description="Chaque montant pris en compte, dans l'ordre chronologique." />
        <FlowsTable flows={forecast.flows} referenceBalance={forecast.referenceBalance} referenceDate={forecast.referenceDate} />
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader title="Flux planifiés" description="Charges et rentrées prévues hors factures et dépenses (loyer, salaires, emprunt…)." />
          {plannedFlows.length === 0 ? (
            <EmptyState title="Aucun flux planifié" />
          ) : (
            <Table caption="Flux planifiés">
              <thead>
                <tr><Th>Libellé</Th><Th>Récurrence</Th><Th>Début</Th><Th>Fin</Th><Th align="right">Montant</Th><Th>Statut</Th><Th><span className="sr-only">Actions</span></Th></tr>
              </thead>
              <tbody>
                {plannedFlows.map((f) => (
                  <tr key={f.id} className={f.active ? "" : "text-text-muted"}>
                    <Td>{f.label}</Td>
                    <Td>{f.recurrence === "MONTHLY" ? "Mensuel" : "Ponctuel"}</Td>
                    <Td>{formatDate(toISODate(f.startDate))}</Td>
                    <Td>{f.endDate ? formatDate(toISODate(f.endDate)) : "—"}</Td>
                    <Td align="right"><Money value={f.direction === "IN" ? f.amount : -f.amount} signed colored={f.active} /></Td>
                    <Td><Badge tone={f.active ? "positive" : "neutral"}>{f.active ? "Actif" : "Inactif"}</Badge></Td>
                    <Td>
                      {ctx.can("forecast.manage") && (
                        <ActionForm inline action={togglePlannedFlowAction.bind(null, companyId, f.id)} submitLabel={f.active ? "Désactiver" : "Activer"} submitVariant="ghost" />
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        {ctx.can("forecast.manage") && (
          <Card>
            <CardHeader title="Nouveau flux planifié" />
            <CardBody>
              <ActionForm action={createPlannedFlowAction.bind(null, companyId)} submitLabel="Ajouter">
                <Select name="direction" label="Sens" defaultValue="OUT" options={[{ value: "OUT", label: "Décaissement" }, { value: "IN", label: "Encaissement" }]} />
                <Input name="label" label="Libellé" required maxLength={120} placeholder="Loyer des bureaux" />
                <AmountInput name="amount" label="Montant (DT)" required />
                <Select name="recurrence" label="Récurrence" defaultValue="MONTHLY" options={[{ value: "MONTHLY", label: "Mensuelle" }, { value: "NONE", label: "Ponctuelle" }]} />
                <Input name="startDate" type="date" label="Date (1re occurrence)" required />
                <Input name="endDate" type="date" label="Fin (facultatif, mensuel)" />
              </ActionForm>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
