import type { Metadata } from "next";
import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { Money } from "@/components/ui/money";
import { PageHeader } from "@/components/ui/page-header";
import { ExpenseStatusBadge } from "@/components/ui/status-badges";
import { Table, Td, Th } from "@/components/ui/table";
import { formatDate } from "@/domain/dates";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_STATUSES,
  EXPENSE_STATUS_LABELS,
  type ExpenseCategory,
} from "@/domain/expense";
import { param } from "@/lib/search-params";
import { requireCompanyPage } from "@/server/auth/dal";
import { listExpenses } from "@/server/queries/expense.queries";

export const metadata: Metadata = { title: "Dépenses" };

export default async function ExpensesPage({ params, searchParams }: PageProps<"/c/[companyId]/expenses">) {
  const { companyId } = await params;
  const sp = await searchParams;
  const ctx = await requireCompanyPage(companyId, "expenses.submit");
  const viewAll = ctx.can("expenses.viewAll");
  const filters = { status: param(sp.status), category: param(sp.category), mine: param(sp.mine) === "1" };
  const expenses = await listExpenses(ctx, filters);
  const base = `/c/${companyId}/expenses`;

  return (
    <>
      <PageHeader
        title={viewAll ? "Dépenses" : "Mes dépenses"}
        description="Soumission → approbation ou refus par le dirigeant → paiement."
        actions={<LinkButton href={`${base}/new`}>Soumettre une dépense</LinkButton>}
      />
      <Card>
        <FilterBar resetHref={base}>
          <FilterSelect name="status" label="Statut" value={filters.status} options={EXPENSE_STATUSES.map((s) => ({ value: s, label: EXPENSE_STATUS_LABELS[s] }))} />
          <FilterSelect name="category" label="Catégorie" value={filters.category} options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: EXPENSE_CATEGORY_LABELS[c] }))} />
          {viewAll && <FilterSelect name="mine" label="Auteur" value={filters.mine ? "1" : ""} options={[{ value: "1", label: "Mes demandes" }]} />}
        </FilterBar>
        {expenses.length === 0 ? (
          <EmptyState
            title="Aucune dépense"
            description={filters.status || filters.category ? "Aucun résultat pour ces filtres." : "Les dépenses soumises apparaîtront ici."}
            action={<LinkButton href={`${base}/new`}>Soumettre une dépense</LinkButton>}
          />
        ) : (
          <Table caption="Liste des dépenses">
            <thead>
              <tr>
                <Th>Description</Th>
                <Th>Catégorie</Th>
                <Th>Date</Th>
                <Th>Paiement prévu</Th>
                {viewAll && <Th>Soumise par</Th>}
                <Th>Statut</Th>
                <Th align="right">Montant</Th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-surface-muted/60">
                  <Td>
                    <Link href={`${base}/${e.id}`} className="font-medium text-brand hover:underline">
                      {e.description}
                    </Link>
                    {e.supplier && <span className="block text-xs text-text-muted">{e.supplier.name}</span>}
                  </Td>
                  <Td className="text-text-secondary">{EXPENSE_CATEGORY_LABELS[e.category as ExpenseCategory] ?? e.category}</Td>
                  <Td>{formatDate(e.expenseDate)}</Td>
                  <Td>{formatDate(e.dueDate)}</Td>
                  {viewAll && <Td className="text-text-secondary">{e.submittedBy.name}</Td>}
                  <Td><ExpenseStatusBadge status={e.status} /></Td>
                  <Td align="right"><Money value={e.amount} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
