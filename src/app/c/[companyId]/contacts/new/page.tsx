import type { Metadata } from "next";
import { ContactForm } from "@/components/forms/contact-form";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireCompanyPage } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Nouveau contact" };

export default async function NewContactPage({ params }: PageProps<"/c/[companyId]/contacts/new">) {
  const { companyId } = await params;
  await requireCompanyPage(companyId, "contacts.manage");
  return (
    <div className="max-w-3xl">
      <PageHeader title="Nouveau contact" back={{ href: `/c/${companyId}/contacts`, label: "Contacts" }} />
      <Card>
        <CardBody>
          <ContactForm companyId={companyId} />
        </CardBody>
      </Card>
    </div>
  );
}
