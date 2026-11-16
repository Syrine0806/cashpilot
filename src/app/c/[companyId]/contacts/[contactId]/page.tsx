import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { archiveContactAction } from "@/actions/contact.actions";
import { ActionForm } from "@/components/forms/action-form";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Money } from "@/components/ui/money";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { ExpenseStatusBadge, InvoiceStatusBadge } from "@/components/ui/status-badges";
import { Table, Td, Th } from "@/components/ui/table";
import { CONTACT_KIND_LABELS, type ContactKind } from "@/domain/company";
import { formatDate, formatInstant } from "@/domain/dates";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/domain/invoice";
import { formatMoney } from "@/domain/money";
import { requireCompanyPage } from "@/server/auth/dal";
import { getContact } from "@/server/queries/contact.queries";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage({ params }: PageProps<"/c/[companyId]/contacts/[contactId]">) {
  const { companyId, contactId } = await params;
  const ctx = await requireCompanyPage(companyId, "contacts.view");
  const data = await getContact(companyId, contactId);
  if (!data) notFound();
  const { contact, invoices, payments, expenses } = data;
  const base = `/c/${companyId}`;
  const billed = invoices.filter((i) => i.status !== "DRAFT" && i.status !== "CANCELLED").reduce((s, i) => s + i.total, 0);
  const remaining = invoices.reduce((s, i) => s + i.remaining, 0);

  return (
    <>
      <PageHeader
        title={contact.name}
        description={<Badge tone={contact.kind === "CLIENT" ? "info" : "neutral"}>{CONTACT_KIND_LABELS[contact.kind as ContactKind]}</Badge>}
        back={{ href: `${base}/contacts`, label: "Contacts" }}
        actions={
          ctx.can("contacts.manage") && (
            <>
              <LinkButton href={`${base}/contacts/${contactId}/edit`} variant="secondary">Modifier</LinkButton>
              <ActionForm
                inline
                action={archiveContactAction.bind(null, companyId, contactId, !contact.archivedAt)}
                submitLabel={contact.archivedAt ? "Restaurer" : "Archiver"}
                submitVariant="ghost"
              />
            </>
          )
        }
      />
      {contact.archivedAt && <p className="mb-4 text-sm text-warning">Contact archivé le {formatInstant(contact.archivedAt)} — son historique est conservé.</p>}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader title="Coordonnées" />
          <CardBody>
            <dl className="space-y-3 text-sm">
              {[
                ["E-mail", contact.email],
                ["Téléphone", contact.phone],
                ["Adresse", contact.address],
                ["Matricule fiscal", contact.taxId],
                ["Notes", contact.notes],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-text-muted">{label}</dt>
                  <dd className="whitespace-pre-line">{value || "—"}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>

        <div className="space-y-6">
          {contact.kind === "CLIENT" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <StatCard label="Total facturé (TTC)" value={formatMoney(billed)} />
                <StatCard label="Reste à encaisser" value={formatMoney(remaining)} tone={remaining > 0 ? "warning" : "neutral"} />
              </div>
              <Card>
                <CardHeader
                  title="Historique des factures"
                  actions={ctx.can("invoices.manage") && <LinkButton href={`${base}/invoices/new?clientId=${contactId}`} size="sm">Nouvelle facture</LinkButton>}
                />
                {invoices.length === 0 ? (
                  <EmptyState title="Aucune facture" />
                ) : (
                  <Table caption="Factures du client">
                    <thead>
                      <tr><Th>N°</Th><Th>Émise le</Th><Th>Échéance</Th><Th>Statut</Th><Th align="right">Total</Th><Th align="right">Reste</Th></tr>
                    </thead>
                    <tbody>
                      {invoices.map((i) => (
                        <tr key={i.id}>
                          <Td><Link href={`${base}/invoices/${i.id}`} className="font-medium text-brand hover:underline">{i.number ?? "Brouillon"}</Link></Td>
                          <Td>{formatDate(i.issueDate)}</Td>
                          <Td>{formatDate(i.dueDate)}</Td>
                          <Td><InvoiceStatusBadge status={i.status} /></Td>
                          <Td align="right"><Money value={i.total} /></Td>
                          <Td align="right"><Money value={i.remaining} /></Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card>
              <Card>
                <CardHeader title="Historique des paiements" />
                {payments.length === 0 ? (
                  <EmptyState title="Aucun paiement reçu" />
                ) : (
                  <Table caption="Paiements du client">
                    <thead>
                      <tr><Th>Date</Th><Th>Facture</Th><Th>Mode</Th><Th>Référence</Th><Th align="right">Montant</Th></tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id}>
                          <Td>{formatDate(p.date)}</Td>
                          <Td><Link href={`${base}/invoices/${p.invoice.id}`} className="text-brand hover:underline">{p.invoice.number}</Link></Td>
                          <Td>{PAYMENT_METHOD_LABELS[p.method as PaymentMethod] ?? p.method}{p.reversalOfId && " (contre-passation)"}</Td>
                          <Td className="text-text-secondary">{p.reference ?? "—"}</Td>
                          <Td align="right"><Money value={p.amount} colored signed /></Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader title="Historique des dépenses" />
              {expenses.length === 0 ? (
                <EmptyState title="Aucune dépense liée à ce fournisseur" />
              ) : (
                <Table caption="Dépenses du fournisseur">
                  <thead>
                    <tr><Th>Date</Th><Th>Description</Th><Th>Statut</Th><Th align="right">Montant</Th></tr>
                  </thead>
                  <tbody>
                    {expenses.map((e) => (
                      <tr key={e.id}>
                        <Td>{formatDate(e.expenseDate)}</Td>
                        <Td><Link href={`${base}/expenses/${e.id}`} className="text-brand hover:underline">{e.description}</Link></Td>
                        <Td><ExpenseStatusBadge status={e.status} /></Td>
                        <Td align="right"><Money value={e.amount} /></Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
