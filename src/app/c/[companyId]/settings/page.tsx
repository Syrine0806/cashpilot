import type { Metadata } from "next";
import {
  addMemberAction,
  changeRoleAction,
  removeMemberAction,
  updateInitialBalanceAction,
  updateSettingsAction,
} from "@/actions/company.actions";
import { ActionForm } from "@/components/forms/action-form";
import { AmountInput, Input, Select } from "@/components/forms/fields";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Td, Th } from "@/components/ui/table";
import { SECTORS, SECTOR_LABELS } from "@/domain/company";
import { toISODate } from "@/domain/dates";
import { toInputAmount } from "@/domain/money";
import { ROLES, ROLE_LABELS, ROLE_PERMISSIONS, type Role } from "@/domain/permissions";
import { requireCompanyPage } from "@/server/auth/dal";
import { today } from "@/server/env";
import { getCompanySettings, listMembers } from "@/server/queries/company.queries";

export const metadata: Metadata = { title: "Entreprise & membres" };

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  DIRECTOR: "Consulte les indicateurs, approuve les dépenses, gère l'entreprise et les membres.",
  FINANCE_MANAGER: "Gère les factures, paiements, trésorerie, prévisions et simulations.",
  EMPLOYEE: "Soumet des dépenses et consulte ses propres demandes.",
};

export default async function SettingsPage({ params }: PageProps<"/c/[companyId]/settings">) {
  const { companyId } = await params;
  const ctx = await requireCompanyPage(companyId, "members.manage");
  const [company, members] = await Promise.all([getCompanySettings(companyId), listMembers(companyId)]);
  const roleOptions = ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

  return (
    <>
      <PageHeader title="Entreprise & membres" description="Espace entreprise, membres et permissions." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Paramètres" />
          <CardBody>
            <ActionForm action={updateSettingsAction.bind(null, companyId)} submitLabel="Enregistrer">
              <Input name="name" label="Nom" defaultValue={company.name} required maxLength={80} />
              <Select name="sector" label="Secteur" defaultValue={company.sector} options={SECTORS.map((s) => ({ value: s, label: SECTOR_LABELS[s] }))} />
              <div className="grid grid-cols-2 gap-3">
                <Input name="invoicePrefix" label="Préfixe des factures" defaultValue={company.invoicePrefix} required maxLength={8} />
                <Input name="defaultTaxRate" label="TVA par défaut (%)" defaultValue={String(company.defaultTaxRateBp / 100)} required />
              </div>
            </ActionForm>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Solde initial"
            description={company._count.movements > 0 ? "Verrouillé : des opérations existent. Corrigez via un mouvement de trésorerie." : "Modifiable tant qu'aucune opération n'est enregistrée."}
          />
          <CardBody>
            <ActionForm action={updateInitialBalanceAction.bind(null, companyId)} submitLabel="Mettre à jour">
              <fieldset disabled={company._count.movements > 0} className="space-y-4">
                <AmountInput name="initialBalance" label="Solde initial (DT)" defaultValue={toInputAmount(company.initialBalance)} required />
                <Input name="initialBalanceDate" type="date" label="Date" defaultValue={toISODate(company.initialBalanceDate)} max={today()} required />
              </fieldset>
            </ActionForm>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Membres" description={`${members.length} membre(s)`} />
        <Table caption="Membres de l'entreprise">
          <thead>
            <tr><Th>Nom</Th><Th>E-mail</Th><Th>Rôle</Th><Th><span className="sr-only">Actions</span></Th></tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <Td className="font-medium">{m.user.name}{m.user.id === ctx.user.id && <span className="ml-1 text-xs text-text-muted">(vous)</span>}</Td>
                <Td className="text-text-secondary">{m.user.email}</Td>
                <Td>
                  <ActionForm inline action={changeRoleAction.bind(null, companyId, m.id)} submitLabel="Changer" submitVariant="secondary">
                    <Select name="role" aria-label={`Rôle de ${m.user.name}`} defaultValue={m.role} options={roleOptions} />
                  </ActionForm>
                </Td>
                <Td align="right">
                  <ActionForm inline action={removeMemberAction.bind(null, companyId, m.id)} submitLabel="Retirer" submitVariant="ghost" confirm={`Retirer ${m.user.name} de l'entreprise ?`} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Ajouter un membre" description="Compte existant : l'e-mail suffit. Nouveau compte : nom et mot de passe provisoire." />
          <CardBody>
            <ActionForm action={addMemberAction.bind(null, companyId)} submitLabel="Ajouter">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="email" type="email" label="E-mail" required />
                <Select name="role" label="Rôle" defaultValue="EMPLOYEE" options={roleOptions} />
                <Input name="name" label="Nom (nouveau compte)" maxLength={80} />
                <Input name="password" type="password" label="Mot de passe provisoire" minLength={8} autoComplete="new-password" />
              </div>
            </ActionForm>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Rôles et permissions" />
          <CardBody className="space-y-4">
            {ROLES.map((r) => (
              <div key={r}>
                <p className="font-medium">{ROLE_LABELS[r]}</p>
                <p className="text-sm text-text-secondary">{ROLE_DESCRIPTIONS[r]}</p>
                <p className="mt-1 text-xs text-text-muted">{[...ROLE_PERMISSIONS[r]].join(" · ")}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
