import type { Metadata } from "next";
import { submitExpenseAction } from "@/actions/expense.actions";
import { ActionForm } from "@/components/forms/action-form";
import { AmountInput, Input, Select } from "@/components/forms/fields";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from "@/domain/expense";
import { requireCompanyPage } from "@/server/auth/dal";
import { today } from "@/server/env";
import { listContactOptions } from "@/server/queries/contact.queries";

export const metadata: Metadata = { title: "Soumettre une dépense" };

export default async function NewExpensePage({ params }: PageProps<"/c/[companyId]/expenses/new">) {
  const { companyId } = await params;
  const ctx = await requireCompanyPage(companyId, "expenses.submit");
  const suppliers = ctx.can("contacts.view") ? await listContactOptions(companyId, "SUPPLIER") : [];
  const t = today();

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Soumettre une dépense"
        description="La dépense sera validée par le dirigeant avant d'être payée."
        back={{ href: `/c/${companyId}/expenses`, label: "Dépenses" }}
      />
      <Card>
        <CardBody>
          <ActionForm action={submitExpenseAction.bind(null, companyId)} submitLabel="Soumettre la dépense">
            <Input name="description" label="Description" required maxLength={200} placeholder="Licence Figma annuelle, billet d'avion…" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select name="category" label="Catégorie" defaultValue="OTHER" options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: EXPENSE_CATEGORY_LABELS[c] }))} />
              <AmountInput name="amount" label="Montant TTC (DT)" required />
              <Input name="expenseDate" type="date" label="Date de la dépense" defaultValue={t} required />
              <Input name="dueDate" type="date" label="Date de paiement prévue" defaultValue={t} required hint="Utilisée par les prévisions de trésorerie." />
              {suppliers.length > 0 && (
                <Select name="supplierId" label="Fournisseur (facultatif)" placeholder="—" options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
              )}
              <Input name="receipt" type="file" label="Justificatif" accept="application/pdf,image/png,image/jpeg" hint="PDF, PNG ou JPG — 5 Mo maximum." />
            </div>
          </ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}
