import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactForm } from "@/components/forms/contact-form";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireCompanyPage } from "@/server/auth/dal";
import { prisma } from "@/server/db";

export const metadata: Metadata = { title: "Modifier le contact" };

export default async function EditContactPage({ params }: PageProps<"/c/[companyId]/contacts/[contactId]/edit">) {
  const { companyId, contactId } = await params;
  await requireCompanyPage(companyId, "contacts.manage");
  const contact = await prisma.contact.findFirst({ where: { id: contactId, companyId } });
  if (!contact) notFound();
  return (
    <div className="max-w-3xl">
      <PageHeader title={`Modifier « ${contact.name} »`} back={{ href: `/c/${companyId}/contacts/${contactId}`, label: contact.name }} />
      <Card>
        <CardBody>
          <ContactForm companyId={companyId} contactId={contactId} contact={contact} />
        </CardBody>
      </Card>
    </div>
  );
}
