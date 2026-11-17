import { Paperclip } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { payExpenseAction, reviewExpenseAction, withdrawExpenseAction } from "@/actions/expense.actions";
import { ActionForm } from "@/components/forms/action-form";
import { Input, Select, Textarea } from "@/components/forms/fields";
import { Alert } from "@/components/ui/alert";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ExpenseStatusBadge } from "@/components/ui/status-badges";
import { formatDate, toISODate, formatInstant } from "@/domain/dates";
import { canTransition, EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from "@/domain/expense";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/domain/invoice";
import { formatMoney } from "@/domain/money";
import { requireCompanyPage } from "@/server/auth/dal";
import { today } from "@/server/env";
import { getExpense } from "@/server/queries/expense.queries";

export const metadata: Metadata = { title: "Dépense" };

export default async function ExpensePage({ params }: PageProps<"/c/[companyId]/expenses/[expenseId]">) {
  const { companyId, expenseId } = await params;
  const ctx = await requireCompanyPage(companyId, "expenses.submit");
  const expense = await getExpense(ctx, expenseId);
  if (!expense) notFound();

  const isAuthor = expense.submittedById === ctx.user.id;
  const steps = [
    { label: "Soumise", done: true, detail: `par ${expense.submittedBy.name} le ${formatInstant(expense.createdAt)}` },
    {
      label: expense.status === "REJECTED" ? "Refusée" : "Approuvée",
      done: expense.status !== "SUBMITTED",
      detail: expense.reviewedBy && expense.reviewedAt ? `par ${expense.reviewedBy.name} le ${formatInstant(expense.reviewedAt)}` : "En attente du dirigeant",
    },
    ...(expense.status === "REJECTED"
      ? []
      : [{ label: "Payée", done: expense.status === "PAID", detail: expense.paidAt ? `le ${formatDate(expense.paidAt)}` : "Après approbation" }]),
  ];

  return (
    <>
      <PageHeader
        title={<span className="flex flex-wrap items-center gap-3">{expense.description} <ExpenseStatusBadge status={expense.status} /></span>}
        description={`${EXPENSE_CATEGORY_LABELS[expense.category as ExpenseCategory] ?? expense.category} · ${formatMoney(expense.amount)}`}
        back={{ href: `/c/${companyId}/expenses`, label: "Dépenses" }}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Informations" />
            <CardBody>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div><dt className="text-text-muted">Montant</dt><dd className="text-lg font-semibold tabular">{formatMoney(expense.amount)}</dd></div>
                <div><dt className="text-text-muted">Catégorie</dt><dd>{EXPENSE_CATEGORY_LABELS[expense.category as ExpenseCategory] ?? expense.category}</dd></div>
                <div><dt className="text-text-muted">Date de la dépense</dt><dd>{formatDate(expense.expenseDate)}</dd></div>
                <div><dt className="text-text-muted">Paiement prévu</dt><dd>{formatDate(expense.dueDate)}</dd></div>
                <div>
                  <dt className="text-text-muted">Fournisseur</dt>
                  <dd>
                    {expense.supplier ? (
                      ctx.can("contacts.view") ? <Link className="text-brand hover:underline" href={`/c/${companyId}/contacts/${expense.supplier.id}`}>{expense.supplier.name}</Link> : expense.supplier.name
                    ) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-muted">Justificatif</dt>
                  <dd>
                    {expense.receiptPath ? (
                      <a href={`/api/companies/${companyId}/expenses/${expenseId}/receipt`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-brand hover:underline">
                        <Paperclip className="size-4" aria-hidden /> {expense.receiptName}
                      </a>
                    ) : (
                      <span className="text-text-muted">Aucun</span>
                    )}
                  </dd>
                </div>
              </dl>
              {expense.reviewComment && (
                <div className="mt-4">
                  <Alert tone={expense.status === "REJECTED" ? "danger" : "info"} title="Commentaire du dirigeant">{expense.reviewComment}</Alert>
                </div>
              )}
              {expense.status === "PAID" && expense.paymentMethod && expense.movement && (
                <p className="mt-4 text-sm text-text-secondary">
                  Payée par {PAYMENT_METHOD_LABELS[expense.paymentMethod as PaymentMethod]} — mouvement de trésorerie du {formatDate(toISODate(expense.movement.date))}.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Suivi de la demande" />
            <CardBody>
              <ol className="space-y-4">
                {steps.map((s) => (
                  <li key={s.label} className="flex gap-3">
                    <span
                      aria-hidden
                      className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-xs text-white ${
                        s.done ? (s.label === "Refusée" ? "bg-negative" : "bg-positive") : "bg-border"
                      }`}
                    >
                      {s.done ? (s.label === "Refusée" ? "✕" : "✓") : ""}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{s.label}</p>
                      <p className="text-xs text-text-muted">{s.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          {ctx.can("expenses.approve") && canTransition(expense.status, "approve") && (
            <Card>
              <CardHeader title="Décision" description="Approuver ou refuser la demande." />
              <CardBody>
                <ReviewForms companyId={companyId} expenseId={expenseId} />
              </CardBody>
            </Card>
          )}
          {ctx.can("expenses.submit") && !ctx.can("expenses.approve") && expense.status === "SUBMITTED" && (
            <Alert tone="info">En attente de la validation du dirigeant.</Alert>
          )}

          {ctx.can("expenses.pay") && canTransition(expense.status, "pay") && (
            <Card>
              <CardHeader title="Enregistrer le paiement" description="Le solde réel sera débité une seule fois." />
              <CardBody>
                <ActionForm action={payExpenseAction.bind(null, companyId, expenseId)} submitLabel="Marquer comme payée">
                  <Input name="date" type="date" label="Date du paiement" defaultValue={today()} max={today()} required />
                  <Select name="method" label="Mode" defaultValue="TRANSFER" options={PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] }))} />
                </ActionForm>
              </CardBody>
            </Card>
          )}
          {expense.status === "REJECTED" && <Alert tone="danger">Dépense refusée : elle ne peut pas être payée.</Alert>}

          {isAuthor && canTransition(expense.status, "withdraw") && (
            <ActionForm
              action={withdrawExpenseAction.bind(null, companyId, expenseId)}
              submitLabel="Retirer ma demande"
              submitVariant="secondary"
              confirm="Retirer cette demande de dépense ?"
            />
          )}
        </div>
      </div>
    </>
  );
}

function ReviewForms({ companyId, expenseId }: { companyId: string; expenseId: string }) {
  const action = reviewExpenseAction.bind(null, companyId, expenseId);
  return (
    <div className="space-y-5">
      <ActionForm action={action} submitLabel="Approuver" className="space-y-3 [&>button]:w-full">
        <input type="hidden" name="decision" value="approve" />
        <Textarea name="comment" label="Commentaire (facultatif)" rows={2} maxLength={300} />
      </ActionForm>
      <div className="border-t border-border pt-4">
        <ActionForm action={action} submitLabel="Refuser" submitVariant="danger" className="space-y-3 [&>button]:w-full">
          <input type="hidden" name="decision" value="reject" />
          <Textarea name="comment" label="Motif du refus" rows={2} maxLength={300} required />
        </ActionForm>
      </div>
    </div>
  );
}
