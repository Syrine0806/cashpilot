import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class ContactsPage extends BasePage {
  async create(companyId: string, contact: { kind: "Client" | "Fournisseur"; name: string; email?: string }) {
    await this.page.goto(`/c/${companyId}/contacts/new`);
    await this.page.getByLabel("Type").selectOption({ label: contact.kind });
    await this.page.getByLabel("Nom / raison sociale").fill(contact.name);
    if (contact.email) await this.page.getByLabel("E-mail").fill(contact.email);
    await this.page.getByRole("button", { name: "Créer le contact" }).click();
    await expect(this.heading()).toHaveText(contact.name);
  }
}
