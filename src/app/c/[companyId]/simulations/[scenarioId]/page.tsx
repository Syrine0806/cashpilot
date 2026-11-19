import clsx from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addAdjustmentAction, deleteScenarioAction, removeAdjustmentAction } from "@/actions/scenario.actions";
import { CompareChart } from "@/components/charts/compare-chart";
import { ActionForm } from "@/components/forms/action-form";
import { AmountInput, Input, Select } from "@/components/forms/fields";
import { FlowsTable } from "@/components/forecast/flows-table";
import { ShortfallSummary } from "@/components/forecast/shortfalls";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Money } from "@/components/ui/money";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Td, Th } from "@/components/ui/table";
import { addDays, formatDate } from "@/domain/dates";
import { formatMoney } from "@/domain/money";
import { ADJUSTMENT_LABELS, describeAdjustment } from "@/domain/simulation";
import { param } from "@/lib/search-params";
import { requireCompanyPage } from "@/server/auth/dal";
import { getScenarioComparison } from "@/server/queries/scenario.queries";

export const metadata: Metadata = { title: "Simulation" };

export default async function ScenarioPage({ params, searchParams }: PageProps<"/c/[companyId]/simulations/[scenarioId]">) {
  const { companyId, scenarioId } = await params;
  const sp = await searchParams;
  await requireCompanyPage(companyId, "scenarios.manage");
  const includePending = param(sp.pending) === "1";
  const data = await getScenarioComparison(companyId, scenarioId, { includePending });
  if (!data) notFound();
  const { scenario, adjustments, comparison, snapshot, invoiceLabels } = data;
  const { base, simulated } = comparison;
  const openInvoices = snapshot.invoices.filter((i) => i.remaining > 0);
  const t = snapshot.today;

  return (
    <>
      <PageHeader
        title={scenario.name}
        description={scenario.description ?? "Comparaison de la projection initiale (données réelles) et de la projection simulée."}
        back={{ href: `/c/${companyId}/simulations`, label: "Simulations" }}
        actions={
          <ActionForm inline action={deleteScenarioAction.bind(null, companyId, scenarioId)} submitLabel="Supprimer le scénario" submitVariant="ghost" confirm="Supprimer ce scénario ? (les données réelles ne sont pas concernées)" />
        }
      />
      <div className="mb-6">
        <Alert tone="info">
          Simulation en mémoire : aucune facture, dépense ni mouvement n&apos;est modifié. Solde réel de référence au {formatDate(t)} :{" "}
          <strong>{formatMoney(snapshot.referenceBalance)}</strong>.{" "}
          <Link className="underline" href={`?${includePending ? "" : "pending=1"}`}>
            {includePending ? "Exclure" : "Inclure"} les dépenses en attente
          </Link>
        </Alert>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Comparaison sur 90 jours" description="Les zones rouges indiquent un manque de liquidités dans le scénario simulé." />
            <CardBody className="space-y-4">
              <CompareChart series={comparison.series} shortfalls={simulated.shortfalls} />
              <Table caption="Comparaison des soldes à 30, 60 et 90 jours">
                <thead>
                  <tr><Th>Échéance</Th><Th align="right">Projection initiale</Th><Th align="right">Projection simulée</Th><Th align="right">Écart</Th></tr>
                </thead>
                <tbody>
                  {comparison.milestones.map((m) => (
                    <tr key={m.days}>
                      <Td>J+{m.days} <span className="text-text-muted">({formatDate(m.date)})</span></Td>
                      <Td align="right" className={m.base < 0 ? "text-negative" : ""}>{formatMoney(m.base)}</Td>
                      <Td align="right" className={m.simulated < 0 ? "text-negative" : ""}>{formatMoney(m.simulated)}</Td>
                      <Td align="right"><Money value={m.difference} signed colored /></Td>
                    </tr>
                  ))}
                  <tr className="font-medium">
                    <Td>Point bas</Td>
                    <Td align="right" className={base.lowest.balance < 0 ? "text-negative" : ""}>{formatMoney(base.lowest.balance)} <span className="block text-xs font-normal text-text-muted">{formatDate(base.lowest.date)}</span></Td>
                    <Td align="right" className={simulated.lowest.balance < 0 ? "text-negative" : ""}>{formatMoney(simulated.lowest.balance)} <span className="block text-xs font-normal text-text-muted">{formatDate(simulated.lowest.date)}</span></Td>
                    <Td align="right"><Money value={comparison.lowestDifference} signed colored /></Td>
                  </tr>
                </tbody>
              </Table>
            </CardBody>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <div data-testid="shortfalls-base">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><span className="inline-block h-0.5 w-5 bg-[var(--series-1)]" />Projection initiale</h3>
              <ShortfallSummary shortfalls={base.shortfalls} horizonDays={90} />
            </div>
            <div data-testid="shortfalls-simulated">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-[var(--series-2)]" />Projection simulée</h3>
              <ShortfallSummary shortfalls={simulated.shortfalls} horizonDays={90} />
            </div>
          </div>

          <Card>
            <CardHeader title="Flux de la projection simulée" description="Montants et hypothèses utilisés, avec le solde après chaque flux." />
            <FlowsTable flows={simulated.flows} referenceBalance={simulated.referenceBalance} referenceDate={simulated.referenceDate} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Hypothèses du scénario" />
            {adjustments.length === 0 ? (
              <EmptyState title="Aucune hypothèse" description="Ajoutez une hypothèse ci-dessous : les deux projections sont alors comparées." />
            ) : (
              <ul className="divide-y divide-border">
                {adjustments.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-3 px-5 py-3">
                    <div>
                      <Badge tone={a.kind === "NEW_INFLOW" ? "positive" : a.kind === "NEW_EXPENSE" ? "negative" : "warning"}>{ADJUSTMENT_LABELS[a.kind]}</Badge>
                      <p className="mt-1 text-sm">{describeAdjustment(a, a.kind === "DELAY_INVOICE" ? invoiceLabels.get(a.invoiceId) : undefined)}</p>
                    </div>
                    <ActionForm inline action={removeAdjustmentAction.bind(null, companyId, scenarioId, a.id)} submitLabel="Retirer" submitVariant="ghost" />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Retard de paiement client" />
            <CardBody>
              {openInvoices.length === 0 ? (
                <p className="text-sm text-text-muted">Aucune facture validée avec un reste à payer.</p>
              ) : (
                <ActionForm action={addAdjustmentAction.bind(null, companyId, scenarioId)} submitLabel="Simuler le retard">
                  <input type="hidden" name="kind" value="DELAY_INVOICE" />
                  <Select
                    name="invoiceId"
                    label="Facture"
                    required
                    placeholder="Choisir…"
                    options={openInvoices.map((i) => ({ value: i.id, label: `${i.number} · ${i.clientName} · ${formatMoney(i.remaining)} (éch. ${formatDate(i.dueDate)})` }))}
                  />
                  <Input name="delayDays" type="number" label="Retard (jours)" defaultValue={20} min={1} max={365} required />
                </ActionForm>
              )}
            </CardBody>
          </Card>

          <AdjustmentCard title="Nouvelle dépense" kind="NEW_EXPENSE" companyId={companyId} scenarioId={scenarioId} defaultDate={addDays(t, 15)} />
          <AdjustmentCard title="Rentrée prévue" kind="NEW_INFLOW" companyId={companyId} scenarioId={scenarioId} defaultDate={addDays(t, 30)} />
        </div>
      </div>
    </>
  );
}

function AdjustmentCard({
  title,
  kind,
  companyId,
  scenarioId,
  defaultDate,
}: {
  title: string;
  kind: "NEW_EXPENSE" | "NEW_INFLOW";
  companyId: string;
  scenarioId: string;
  defaultDate: string;
}) {
  return (
    <Card>
      <CardHeader title={title} />
      <CardBody>
        <ActionForm action={addAdjustmentAction.bind(null, companyId, scenarioId)} submitLabel="Ajouter l'hypothèse" submitVariant="secondary">
          <input type="hidden" name="kind" value={kind} />
          <Input name="label" label="Libellé" required maxLength={120} placeholder={kind === "NEW_EXPENSE" ? "Achat de matériel" : "Acompte nouveau client"} />
          <div className={clsx("grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2")}>
            <AmountInput name="amount" label="Montant (DT)" required />
            <Input name="date" type="date" label="Date" defaultValue={defaultDate} required />
          </div>
        </ActionForm>
      </CardBody>
    </Card>
  );
}
