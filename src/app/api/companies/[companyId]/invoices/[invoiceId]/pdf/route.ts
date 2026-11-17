import { getCompanyContext } from "@/server/auth/dal";
import { renderInvoicePdf } from "@/server/pdf/invoice-pdf";
import { getInvoice } from "@/server/queries/invoice.queries";

export async function GET(_request: Request, { params }: RouteContext<"/api/companies/[companyId]/invoices/[invoiceId]/pdf">) {
  const { companyId, invoiceId } = await params;
  const ctx = await getCompanyContext(companyId);
  if (!ctx || !ctx.can("invoices.view")) return new Response("Introuvable", { status: 404 });

  const invoice = await getInvoice(companyId, invoiceId);
  if (!invoice || invoice.status === "DRAFT" || !invoice.number) return new Response("Introuvable", { status: 404 });

  const pdf = await renderInvoicePdf({
    number: invoice.number,
    status: invoice.status,
    issueDate: invoice.issueDateISO,
    dueDate: invoice.dueDateISO,
    company: { name: invoice.company.name },
    client: invoice.client,
    lines: invoice.lines,
    subtotal: invoice.subtotal,
    taxRateBp: invoice.taxRateBp,
    taxAmount: invoice.taxAmount,
    total: invoice.total,
    paid: invoice.paid,
    remaining: invoice.remaining,
    notes: invoice.notes,
  });
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="facture-${invoice.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
