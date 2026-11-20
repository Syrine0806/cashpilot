import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export interface InvoiceLine {
  description: string;
  quantity: string;
  unitPrice: string;
}

/** New / edit invoice form. */
export class InvoiceFormPage extends BasePage {
  async createDraft(companyId: string, data: { client: string; issueDate: string; dueDate: string; taxRate: string; lines: InvoiceLine[] }) {
    await this.page.goto(`/c/${companyId}/invoices/new`);
    await this.page.getByLabel("Client").selectOption({ label: data.client });
    await this.page.getByLabel("Date d'émission").fill(data.issueDate);
    await this.page.getByLabel("Échéance").fill(data.dueDate);
    for (const [i, line] of data.lines.entries()) {
      if (i > 0) await this.page.getByRole("button", { name: "Ajouter une ligne" }).click();
      await this.page.getByLabel(`Description ligne ${i + 1}`).fill(line.description);
      await this.page.getByLabel(`Quantité ligne ${i + 1}`).fill(line.quantity);
      await this.page.getByLabel(`Prix unitaire ligne ${i + 1}`).fill(line.unitPrice);
    }
    await this.page.getByLabel("TVA (%)").fill(data.taxRate);
    await this.page.getByRole("button", { name: "Enregistrer le brouillon" }).click();
    await expect(this.page).toHaveURL(/\/invoices\/[^/]+$/);
    return new InvoicePage(this.page);
  }
}

/** Invoice detail: validation, payments, cancellation. */
export class InvoicePage extends BasePage {
  async validate() {
    this.page.once("dialog", (dialog) => dialog.accept());
    await this.page.getByRole("button", { name: "Valider la facture" }).click();
    await expect(this.heading()).toContainText(/FAC-\d{4}-\d{4}/);
  }

  number() {
    return this.heading().textContent().then((t) => t!.match(/FAC-\d{4}-\d{4}/)![0]);
  }

  async recordPayment(amount: string, date?: string) {
    const form = this.card("Enregistrer un encaissement");
    await form.getByLabel("Montant (DT)").fill(amount);
    if (date) await form.getByLabel("Date de réception").fill(date);
    await form.getByRole("button", { name: "Enregistrer l'encaissement" }).click();
  }

  remaining() {
    return this.page.getByTestId("remaining");
  }

  status() {
    return this.heading();
  }
}
