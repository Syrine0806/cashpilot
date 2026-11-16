import { saveContactAction } from "@/actions/contact.actions";
import { CONTACT_KINDS, CONTACT_KIND_LABELS } from "@/domain/company";
import { ActionForm } from "./action-form";
import { Input, Select, Textarea } from "./fields";

interface ContactValues {
  kind: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxId: string | null;
  notes: string | null;
}

export function ContactForm({ companyId, contact, contactId }: { companyId: string; contact?: ContactValues; contactId?: string }) {
  return (
    <ActionForm action={saveContactAction.bind(null, companyId, contactId ?? null)} submitLabel={contactId ? "Enregistrer" : "Créer le contact"}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select name="kind" label="Type" defaultValue={contact?.kind ?? "CLIENT"} options={CONTACT_KINDS.map((k) => ({ value: k, label: CONTACT_KIND_LABELS[k] }))} />
        <Input name="name" label="Nom / raison sociale" defaultValue={contact?.name} required maxLength={120} />
        <Input name="email" type="email" label="E-mail" defaultValue={contact?.email} />
        <Input name="phone" type="tel" label="Téléphone" defaultValue={contact?.phone} maxLength={30} />
        <Input name="taxId" label="Matricule fiscal" defaultValue={contact?.taxId} maxLength={40} />
        <Input name="address" label="Adresse" defaultValue={contact?.address} maxLength={200} />
      </div>
      <Textarea name="notes" label="Notes" defaultValue={contact?.notes} maxLength={500} />
    </ActionForm>
  );
}
