import type { Metadata } from "next";
import Link from "next/link";
import { createScenarioAction } from "@/actions/scenario.actions";
import { ActionForm } from "@/components/forms/action-form";
import { Input, Textarea } from "@/components/forms/fields";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatInstant } from "@/domain/dates";
import { requireCompanyPage } from "@/server/auth/dal";
import { listScenarios } from "@/server/queries/scenario.queries";

export const metadata: Metadata = { title: "Simulations" };

export default async function SimulationsPage({ params }: PageProps<"/c/[companyId]/simulations">) {
  const { companyId } = await params;
  await requireCompanyPage(companyId, "scenarios.manage");
  const scenarios = await listScenarios(companyId);

  return (
    <>
      <PageHeader
        title="Simulations « What if? »"
        description="Testez un retard client, une nouvelle dépense ou une rentrée prévue dans un scénario séparé. Les données réelles ne sont jamais modifiées."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader title="Scénarios" />
          {scenarios.length === 0 ? (
            <EmptyState title="Aucun scénario" description="Créez un scénario puis ajoutez-y des hypothèses pour comparer les projections." />
          ) : (
            <ul className="divide-y divide-border">
              {scenarios.map((s) => (
                <li key={s.id}>
                  <Link href={`/c/${companyId}/simulations/${s.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-surface-muted">
                    <div>
                      <p className="font-medium">{s.name}</p>
                      {s.description && <p className="text-sm text-text-muted">{s.description}</p>}
                    </div>
                    <div className="text-right text-xs text-text-muted">
                      <p>{s._count.adjustments} hypothèse(s)</p>
                      <p>créé le {formatInstant(s.createdAt)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Nouveau scénario" />
          <CardBody>
            <ActionForm action={createScenarioAction.bind(null, companyId)} submitLabel="Créer le scénario">
              <Input name="name" label="Nom" required maxLength={80} placeholder="Retard client de 20 jours" />
              <Textarea name="description" label="Description (facultatif)" maxLength={300} rows={2} />
            </ActionForm>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
