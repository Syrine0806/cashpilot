import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { saveInvoiceAction } from "@/actions/invoice.actions";
import { InvoiceForm } from "@/components/forms/invoice-form";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { toInputAmount } from "@/domain/money";
import { requireCompanyPage } from "@/server/auth/dal";
import { listContactOptions } from "@/server/queries/contact.queries";
import { getInvoice } from "@/server/queries/invoice.queries";

export const metadata: Metadata = { title: "Modifier le brouillon" };

export default async function EditInvoicePage({ params }: PageProps<"/c/[companyId]/invoices/[invoiceId]/edit">) {
  const { companyId, invoiceId } = await params;
  await requireCompanyPage(companyId, "invoices.manage");
  const invoice = await getInvoice(companyId, invoiceId);
  if (!invoice) notFound();
  if (invoice.status !== "DRAFT") redirect(`/c/${companyId}/invoices/${invoiceId}`);
  const clients = await listContactOptions(companyId, "CLIENT");

  return (
    <div className="max-w-5xl">
      <PageHeader title="Modifier le brouillon" back={{ href: `/c/${companyId}/invoices/${invoiceId}`, label: "Facture" }} />
      <Card>
        <CardBody>
          <InvoiceForm
            action={saveInvoiceAction.bind(null, companyId, invoiceId)}
            clients={clients}
            submitLabel="Enregistrer"
            initial={{
              clientId: invoice.clientId,
              issueDate: invoice.issueDateISO,
              dueDate: invoice.dueDateISO,
              taxRate: String(invoice.taxRateBp / 100),
              notes: invoice.notes ?? "",
              lines: invoice.lines.map((l) => ({
                description: l.description,
                quantity: String(l.quantityMilli / 1000).replace(".", ","),
                unitPrice: toInputAmount(l.unitPrice),
              })),
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
