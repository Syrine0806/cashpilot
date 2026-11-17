import { Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  cancelInvoiceAction,
  deleteDraftAction,
  issueInvoiceAction,
  recordPaymentAction,
  reversePaymentAction,
} from "@/actions/invoice.actions";
import { ActionForm } from "@/components/forms/action-form";
import { AmountInput, Input, Select } from "@/components/forms/fields";
import { Alert } from "@/components/ui/alert";
import { buttonClass, LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Money } from "@/components/ui/money";
import { PageHeader } from "@/components/ui/page-header";
import { InvoiceStatusBadge } from "@/components/ui/status-badges";
import { Table, Td, Th } from "@/components/ui/table";
import { formatDate, formatInstant } from "@/domain/dates";
import { formatQuantity, formatTaxRate, PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/domain/invoice";
import { formatMoney, toInputAmount } from "@/domain/money";
import { requireCompanyPage } from "@/server/auth/dal";
import { today } from "@/server/env";
import { getInvoice } from "@/server/queries/invoice.queries";

export const metadata: Metadata = { title: "Facture" };

export default async function InvoicePage({ params }: PageProps<"/c/[companyId]/invoices/[invoiceId]">) {
  const { companyId, invoiceId } = await params;
  const ctx = await requireCompanyPage(companyId, "invoices.view");
  const invoice = await getInvoice(companyId, invoiceId);
  if (!invoice) notFound();

  const base = `/c/${companyId}`;
  const canManage = ctx.can("invoices.manage");
  const canPay = ctx.can("payments.manage") && invoice.status === "ISSUED" && invoice.remaining > 0;
  const isDraft = invoice.status === "DRAFT";

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {invoice.number ?? "Brouillon de facture"} <InvoiceStatusBadge status={invoice.displayStatus} />
          </span>
        }
        description={
          <>
            Client :{" "}
            <Link href={`${base}/contacts/${invoice.clientId}`} className="text-brand hover:underline">
              {invoice.client.name}
            </Link>
            {invoice.retainer && <> · Contrat récurrent « {invoice.retainer.label} » ({invoice.retainerPeriod})</>}
          </>
        }
        back={{ href: `${base}/invoices`, label: "Factures" }}
        actions={
          <>
            {!isDraft && (
              <a href={`/api/companies/${companyId}/invoices/${invoiceId}/pdf`} className={buttonClass("secondary")}>
                <Download className="size-4" aria-hidden /> Export PDF
              </a>
            )}
            {isDraft && canManage && (
              <>
                <LinkButton href={`${base}/invoices/${invoiceId}/edit`} variant="secondary">Modifier</LinkButton>
                <ActionForm
                  inline
                  action={deleteDraftAction.bind(null, companyId, invoiceId)}
                  submitLabel="Supprimer"
                  submitVariant="ghost"
                  confirm="Supprimer définitivement ce brouillon ?"
                />
                <ActionForm
                  inline
                  action={issueInvoiceAction.bind(null, companyId, invoiceId)}
                  submitLabel="Valider la facture"
                  confirm="Une fois validée, la facture reçoit un numéro définitif et ne peut plus être modifiée. Continuer ?"
                />
              </>
            )}
          </>
        }
      />

      {invoice.status === "CANCELLED" && invoice.cancelledAt && (
        <div className="mb-6">
          <Alert tone="warning" title={`Facture annulée le ${formatInstant(invoice.cancelledAt)}`}>
            Motif : {invoice.cancelReason}. Elle est conservée pour l&apos;historique et n&apos;entre plus dans les prévisions.
          </Alert>
        </div>
      )}
      {isDraft && (
        <div className="mb-6">
          <Alert tone="info">Brouillon : il n&apos;est pas pris en compte dans la trésorerie ni dans les prévisions tant qu&apos;il n&apos;est pas validé.</Alert>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Détail"
              description={`Émise le ${formatDate(invoice.issueDateISO)} · échéance le ${formatDate(invoice.dueDateISO)}`}
            />
            <Table caption="Lignes de la facture">
              <thead>
                <tr><Th>Description</Th><Th align="right">Qté</Th><Th align="right">PU HT</Th><Th align="right">Montant HT</Th></tr>
              </thead>
              <tbody>
                {invoice.lines.map((l) => (
                  <tr key={l.id}>
                    <Td>{l.description}</Td>
                    <Td align="right">{formatQuantity(l.quantityMilli)}</Td>
                    <Td align="right"><Money value={l.unitPrice} /></Td>
                    <Td align="right"><Money value={l.amount} /></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <dl className="ml-auto max-w-xs space-y-1 px-5 py-4 text-sm">
              <div className="flex justify-between"><dt className="text-text-secondary">Total HT</dt><dd className="tabular">{formatMoney(invoice.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-text-secondary">TVA {formatTaxRate(invoice.taxRateBp)}</dt><dd className="tabular">{formatMoney(invoice.taxAmount)}</dd></div>
              <div className="flex justify-between border-t border-border pt-1 text-base font-semibold"><dt>Total TTC</dt><dd className="tabular">{formatMoney(invoice.total)}</dd></div>
            </dl>
            {invoice.notes && <p className="border-t border-border px-5 py-3 text-sm text-text-secondary">{invoice.notes}</p>}
          </Card>

          {!isDraft && (
            <Card>
              <CardHeader title="Encaissements" description="Les corrections se font par contre-passation : l'historique est conservé." />
              {invoice.payments.length === 0 ? (
                <EmptyState title="Aucun encaissement" description="Les paiements reçus pour cette facture apparaîtront ici." />
              ) : (
                <Table caption="Encaissements de la facture">
                  <thead>
                    <tr><Th>Date</Th><Th>Mode</Th><Th>Référence / motif</Th><Th align="right">Montant</Th><Th align="right"><span className="sr-only">Actions</span></Th></tr>
                  </thead>
                  <tbody>
                    {invoice.payments.map((p) => (
                      <tr key={p.id} className={p.reversedBy ? "text-text-muted line-through decoration-text-muted/50" : ""}>
                        <Td>{formatDate(p.date)}</Td>
                        <Td>{p.reversalOfId ? "Contre-passation" : PAYMENT_METHOD_LABELS[p.method as PaymentMethod]}</Td>
                        <Td className="text-text-secondary">{p.note ?? p.reference ?? "—"}</Td>
                        <Td align="right"><Money value={p.amount} signed colored={!p.reversedBy} /></Td>
                        <Td align="right">
                          {ctx.can("payments.manage") && p.amount > 0 && !p.reversedBy && (
                            <details className="text-left">
                              <summary className="cursor-pointer text-sm text-negative">Contre-passer</summary>
                              <div className="mt-2 w-64">
                                <ActionForm action={reversePaymentAction.bind(null, companyId, p.id)} submitLabel="Confirmer" submitVariant="danger">
                                  <Input name="reason" label="Motif" required maxLength={300} placeholder="Chèque rejeté, erreur de saisie…" />
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
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardBody className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-text-secondary">Total TTC</span><span className="tabular">{formatMoney(invoice.total)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-text-secondary">Déjà encaissé</span><span className="tabular">{formatMoney(invoice.paid)}</span></div>
              <div className="flex items-baseline justify-between border-t border-border pt-3">
                <span className="font-medium">Reste à payer</span>
                <span data-testid="remaining" className="text-2xl font-semibold tabular">{formatMoney(invoice.remaining)}</span>
              </div>
            </CardBody>
          </Card>

          {canPay && (
            <Card>
              <CardHeader title="Enregistrer un encaissement" description="Paiement total ou partiel." />
              <CardBody>
                <ActionForm action={recordPaymentAction.bind(null, companyId, invoiceId)} submitLabel="Enregistrer l'encaissement">
                  <AmountInput name="amount" label="Montant (DT)" defaultValue={toInputAmount(invoice.remaining)} required hint={`Maximum : ${formatMoney(invoice.remaining)}`} />
                  <Input name="date" type="date" label="Date de réception" defaultValue={today()} max={today()} min={invoice.issueDateISO} required />
                  <Select name="method" label="Mode" defaultValue="TRANSFER" options={PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] }))} />
                  <Input name="reference" label="Référence (facultatif)" maxLength={80} />
                </ActionForm>
              </CardBody>
            </Card>
          )}

          {canManage && invoice.status === "ISSUED" && invoice.paid === 0 && (
            <Card>
              <CardHeader title="Annuler la facture" description="L'annulation est tracée et ne supprime rien." />
              <CardBody>
                <ActionForm
                  action={cancelInvoiceAction.bind(null, companyId, invoiceId)}
                  submitLabel="Annuler la facture"
                  submitVariant="danger"
                  confirm="Confirmer l'annulation de cette facture ?"
                >
                  <Input name="reason" label="Motif" required maxLength={300} />
                </ActionForm>
              </CardBody>
            </Card>
          )}
          {canManage && invoice.status === "ISSUED" && invoice.paid !== 0 && (
            <p className="text-xs text-text-muted">Pour annuler cette facture, contre-passez d&apos;abord ses encaissements.</p>
          )}
        </div>
      </div>
    </>
  );
}
