import type { Metadata } from "next";
import { saveInvoiceAction } from "@/actions/invoice.actions";
import { InvoiceForm } from "@/components/forms/invoice-form";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { addDays } from "@/domain/dates";
import { param } from "@/lib/search-params";
import { requireCompanyPage } from "@/server/auth/dal";
import { prisma } from "@/server/db";
import { today } from "@/server/env";
import { listContactOptions } from "@/server/queries/contact.queries";

export const metadata: Metadata = { title: "Nouvelle facture" };

export default async function NewInvoicePage({ params, searchParams }: PageProps<"/c/[companyId]/invoices/new">) {
  const { companyId } = await params;
  const sp = await searchParams;
  await requireCompanyPage(companyId, "invoices.manage");
  const [clients, company] = await Promise.all([
    listContactOptions(companyId, "CLIENT"),
    prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { defaultTaxRateBp: true } }),
  ]);
  const t = today();

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Nouvelle facture"
        description="La facture est créée en brouillon ; elle reçoit son numéro lors de la validation."
        back={{ href: `/c/${companyId}/invoices`, label: "Factures" }}
      />
      <Card>
        <CardBody>
          {clients.length === 0 ? (
            <EmptyState
              title="Aucun client"
              description="Créez d'abord un client à facturer."
              action={<LinkButton href={`/c/${companyId}/contacts/new`}>Nouveau client</LinkButton>}
            />
          ) : (
            <InvoiceForm
              action={saveInvoiceAction.bind(null, companyId, null)}
              clients={clients}
              submitLabel="Enregistrer le brouillon"
              initial={{
                clientId: param(sp.clientId) ?? "",
                issueDate: t,
                dueDate: addDays(t, 30),
                taxRate: String(company.defaultTaxRateBp / 100),
                notes: "",
                lines: [],
              }}
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
