import type { Metadata } from "next";
import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar, FilterSearch, FilterSelect } from "@/components/ui/filter-bar";
import { Money } from "@/components/ui/money";
import { PageHeader } from "@/components/ui/page-header";
import { InvoiceStatusBadge } from "@/components/ui/status-badges";
import { Table, Td, Th } from "@/components/ui/table";
import { formatDate } from "@/domain/dates";
import { INVOICE_STATUS_LABELS, type InvoiceDisplayStatus } from "@/domain/invoice";
import { formatMoney } from "@/domain/money";
import { param } from "@/lib/search-params";
import { requireCompanyPage } from "@/server/auth/dal";
import { listInvoices } from "@/server/queries/invoice.queries";

export const metadata: Metadata = { title: "Factures" };

export default async function InvoicesPage({ params, searchParams }: PageProps<"/c/[companyId]/invoices">) {
  const { companyId } = await params;
  const sp = await searchParams;
  const ctx = await requireCompanyPage(companyId, "invoices.view");
  const filters = { status: param(sp.status), q: param(sp.q) };
  const invoices = await listInvoices(companyId, filters);
  const base = `/c/${companyId}/invoices`;
  const totalRemaining = invoices.reduce((s, i) => s + i.remaining, 0);

  return (
    <>
      <PageHeader
        title="Factures"
        description="Brouillons, factures validées, échéances et reste à payer."
        actions={ctx.can("invoices.manage") && <LinkButton href={`${base}/new`}>Nouvelle facture</LinkButton>}
      />
      <Card>
        <FilterBar resetHref={base}>
          <FilterSearch value={filters.q} placeholder="N° de facture ou client" />
          <FilterSelect
            name="status"
            label="Statut"
            value={filters.status}
            options={(Object.keys(INVOICE_STATUS_LABELS) as InvoiceDisplayStatus[]).map((s) => ({ value: s, label: INVOICE_STATUS_LABELS[s] }))}
          />
        </FilterBar>
        {invoices.length === 0 ? (
          <EmptyState
            title="Aucune facture"
            description={filters.q || filters.status ? "Aucun résultat pour ces filtres." : "Créez votre première facture pour suivre vos encaissements."}
            action={ctx.can("invoices.manage") && <LinkButton href={`${base}/new`}>Nouvelle facture</LinkButton>}
          />
        ) : (
          <>
            <Table caption="Liste des factures">
              <thead>
                <tr>
                  <Th>N°</Th>
                  <Th>Client</Th>
                  <Th>Émission</Th>
                  <Th>Échéance</Th>
                  <Th>Statut</Th>
                  <Th align="right">Total TTC</Th>
                  <Th align="right">Payé</Th>
                  <Th align="right">Reste à payer</Th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.id} className="hover:bg-surface-muted/60">
                    <Td>
                      <Link href={`${base}/${i.id}`} className="font-medium text-brand hover:underline">
                        {i.number ?? "Brouillon"}
                      </Link>
                    </Td>
                    <Td>{i.clientName}</Td>
                    <Td>{formatDate(i.issueDate)}</Td>
                    <Td className={i.status === "OVERDUE" ? "font-medium text-negative" : ""}>{formatDate(i.dueDate)}</Td>
                    <Td><InvoiceStatusBadge status={i.status} /></Td>
                    <Td align="right"><Money value={i.total} /></Td>
                    <Td align="right"><Money value={i.paid} /></Td>
                    <Td align="right" className="font-medium"><Money value={i.remaining} /></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <p className="px-5 py-3 text-right text-sm text-text-secondary">
              Reste à encaisser sur la sélection : <strong className="tabular text-text">{formatMoney(totalRemaining)}</strong>
            </p>
          </>
        )}
      </Card>
    </>
  );
}
