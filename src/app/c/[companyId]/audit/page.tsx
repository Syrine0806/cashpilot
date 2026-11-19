import type { Metadata } from "next";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Td, Th } from "@/components/ui/table";
import { requireCompanyPage } from "@/server/auth/dal";
import { listAuditLogs } from "@/server/queries/company.queries";

export const metadata: Metadata = { title: "Journal d'audit" };

const DATE_TIME = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: process.env.APP_TIMEZONE || "Africa/Tunis" });

export default async function AuditPage({ params }: PageProps<"/c/[companyId]/audit">) {
  const { companyId } = await params;
  await requireCompanyPage(companyId, "audit.view");
  const logs = await listAuditLogs(companyId);
  return (
    <>
      <PageHeader title="Journal d'audit" description="Toutes les opérations sont tracées : auteur, date et détail. Ce journal ne peut pas être modifié." />
      <Card>
        <CardHeader title="Dernières opérations" description={`${logs.length} entrée(s) affichée(s)`} />
        {logs.length === 0 ? (
          <EmptyState title="Aucune opération" />
        ) : (
          <Table caption="Journal d'audit">
            <thead>
              <tr><Th>Date</Th><Th>Auteur</Th><Th>Action</Th><Th>Détail</Th></tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <Td className="whitespace-nowrap">{DATE_TIME.format(l.createdAt)}</Td>
                  <Td>{l.actor.name}</Td>
                  <Td><code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs">{l.action}</code></Td>
                  <Td>{l.summary}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
