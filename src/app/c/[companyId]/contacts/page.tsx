import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar, FilterSearch, FilterSelect } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Td, Th } from "@/components/ui/table";
import { CONTACT_KINDS, CONTACT_KIND_LABELS, type ContactKind } from "@/domain/company";
import { param } from "@/lib/search-params";
import { requireCompanyPage } from "@/server/auth/dal";
import { listContacts } from "@/server/queries/contact.queries";

export const metadata: Metadata = { title: "Clients & fournisseurs" };

export default async function ContactsPage({ params, searchParams }: PageProps<"/c/[companyId]/contacts">) {
  const { companyId } = await params;
  const sp = await searchParams;
  const ctx = await requireCompanyPage(companyId, "contacts.view");
  const filters = { kind: param(sp.kind), q: param(sp.q), archived: param(sp.archived) === "1" };
  const contacts = await listContacts(companyId, filters);
  const base = `/c/${companyId}/contacts`;

  return (
    <>
      <PageHeader
        title="Clients & fournisseurs"
        description="Coordonnées et historique des factures, paiements et dépenses."
        actions={ctx.can("contacts.manage") && <LinkButton href={`${base}/new`}>Nouveau contact</LinkButton>}
      />
      <Card>
        <FilterBar resetHref={base}>
          <FilterSearch value={filters.q} placeholder="Nom ou e-mail" />
          <FilterSelect name="kind" label="Type" value={filters.kind} options={CONTACT_KINDS.map((k) => ({ value: k, label: CONTACT_KIND_LABELS[k] }))} />
          <FilterSelect name="archived" label="Archives" value={filters.archived ? "1" : ""} options={[{ value: "1", label: "Archivés uniquement" }]} />
        </FilterBar>
        {contacts.length === 0 ? (
          <EmptyState
            title="Aucun contact"
            description={filters.q || filters.kind ? "Aucun résultat pour ces filtres." : "Ajoutez vos clients et fournisseurs pour commencer à facturer."}
            action={ctx.can("contacts.manage") && <LinkButton href={`${base}/new`}>Nouveau contact</LinkButton>}
          />
        ) : (
          <Table caption="Liste des contacts">
            <thead>
              <tr>
                <Th>Nom</Th>
                <Th>Type</Th>
                <Th>E-mail</Th>
                <Th>Téléphone</Th>
                <Th align="right">Factures</Th>
                <Th align="right">Dépenses</Th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-surface-muted/60">
                  <Td>
                    <Link href={`${base}/${c.id}`} className="font-medium text-brand hover:underline">
                      {c.name}
                    </Link>
                  </Td>
                  <Td>
                    <Badge tone={c.kind === "CLIENT" ? "info" : "neutral"}>{CONTACT_KIND_LABELS[c.kind as ContactKind]}</Badge>
                  </Td>
                  <Td className="text-text-secondary">{c.email ?? "—"}</Td>
                  <Td className="text-text-secondary">{c.phone ?? "—"}</Td>
                  <Td align="right">{c._count.invoices}</Td>
                  <Td align="right">{c._count.expenses}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
