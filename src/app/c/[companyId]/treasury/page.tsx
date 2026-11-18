import type { Metadata } from "next";
import Link from "next/link";
import { addMovementAction, reverseMovementAction } from "@/actions/treasury.actions";
import { ActionForm } from "@/components/forms/action-form";
import { AmountInput, Input, Select } from "@/components/forms/fields";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Money } from "@/components/ui/money";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Table, Td, Th } from "@/components/ui/table";
import { MOVEMENT_KIND_LABELS } from "@/domain/company";
import { formatDate } from "@/domain/dates";
import { formatMoney } from "@/domain/money";
import { requireCompanyPage } from "@/server/auth/dal";
import { today } from "@/server/env";
import { getRealBalance, listMovements } from "@/server/queries/treasury.queries";

export const metadata: Metadata = { title: "Trésorerie" };

export default async function TreasuryPage({ params }: PageProps<"/c/[companyId]/treasury">) {
  const { companyId } = await params;
  const ctx = await requireCompanyPage(companyId, "treasury.view");
  const [real, movements] = await Promise.all([getRealBalance(companyId), listMovements(companyId)]);
  const inflows = movements.filter((m) => m.amount > 0).reduce((s, m) => s + m.amount, 0);
  const outflows = movements.filter((m) => m.amount < 0).reduce((s, m) => s - m.amount, 0);
  const base = `/c/${companyId}`;

  return (
    <>
      <PageHeader title="Trésorerie réelle" description="Solde initial + opérations réalisées. Chaque opération est enregistrée une seule fois et n'est jamais supprimée." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Solde réel actuel" value={formatMoney(real.balance)} tone={real.balance < 0 ? "negative" : "neutral"} />
        <StatCard label="Solde initial" value={formatMoney(real.initialBalance)} hint={`au ${formatDate(real.initialBalanceDate)}`} />
        <StatCard label="Entrées réalisées" value={formatMoney(inflows)} />
        <StatCard label="Sorties réalisées" value={formatMoney(outflows)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader title="Historique des mouvements" description={`${movements.length} opération(s)`} />
          {movements.length === 0 ? (
            <EmptyState title="Aucun mouvement" description="Les encaissements clients, paiements de dépenses et mouvements manuels apparaîtront ici." />
          ) : (
            <Table caption="Mouvements de trésorerie">
              <thead>
                <tr><Th>Date</Th><Th>Type</Th><Th>Libellé</Th><Th>Auteur</Th><Th align="right">Montant</Th><Th align="right">Solde</Th><Th><span className="sr-only">Actions</span></Th></tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <Td className="whitespace-nowrap">{formatDate(m.date)}</Td>
                    <Td><Badge tone={m.amount >= 0 ? "positive" : "neutral"}>{MOVEMENT_KIND_LABELS[m.kind] ?? m.kind}</Badge></Td>
                    <Td>
                      {m.invoiceId ? <Link href={`${base}/invoices/${m.invoiceId}`} className="text-brand hover:underline">{m.label}</Link>
                        : m.expenseId ? <Link href={`${base}/expenses/${m.expenseId}`} className="text-brand hover:underline">{m.label}</Link>
                        : m.label}
                      {m.reversed && <span className="ml-2 text-xs text-text-muted">(contre-passé)</span>}
                    </Td>
                    <Td className="text-text-secondary">{m.author}</Td>
                    <Td align="right"><Money value={m.amount} signed colored /></Td>
                    <Td align="right" className="font-medium">{formatMoney(m.balanceAfter)}</Td>
                    <Td>
                      {ctx.can("treasury.manage") && m.reversible && (
                        <details>
                          <summary className="cursor-pointer text-sm text-negative">Contre-passer</summary>
                          <div className="mt-2 w-60">
                            <ActionForm action={reverseMovementAction.bind(null, companyId, m.id)} submitLabel="Confirmer" submitVariant="danger">
                              <Input name="reason" label="Motif" required maxLength={300} />
                            </ActionForm>
                          </div>
                        </details>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        {ctx.can("treasury.manage") && (
          <Card>
            <CardHeader title="Mouvement manuel" description="Frais bancaires, apport, régularisation…" />
            <CardBody>
              <ActionForm action={addMovementAction.bind(null, companyId)} submitLabel="Enregistrer">
                <Select name="kind" label="Type" defaultValue="MANUAL_OUT" options={[{ value: "MANUAL_IN", label: "Entrée" }, { value: "MANUAL_OUT", label: "Sortie" }]} />
                <Input name="label" label="Libellé" required maxLength={120} />
                <AmountInput name="amount" label="Montant (DT)" required />
                <Input name="date" type="date" label="Date" defaultValue={today()} min={real.initialBalanceDate} max={today()} required />
              </ActionForm>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
