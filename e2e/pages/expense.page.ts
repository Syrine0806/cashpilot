import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class ExpenseFormPage extends BasePage {
  async submit(companyId: string, data: { description: string; amount: string; category?: string; expenseDate: string; dueDate: string }) {
    await this.page.goto(`/c/${companyId}/expenses/new`);
    await this.page.getByLabel("Description").fill(data.description);
    if (data.category) await this.page.getByLabel("Catégorie").selectOption({ label: data.category });
    await this.page.getByLabel("Montant TTC (DT)").fill(data.amount);
    await this.page.getByLabel("Date de la dépense").fill(data.expenseDate);
    await this.page.getByLabel("Date de paiement prévue").fill(data.dueDate);
    await this.page.getByRole("button", { name: "Soumettre la dépense" }).click();
    await expect(this.page).toHaveURL(/\/expenses\/[^/]+$/);
    return new ExpensePage(this.page);
  }
}

export class ExpensePage extends BasePage {
  async approve(comment?: string) {
    const card = this.card("Décision");
    if (comment) await card.getByLabel("Commentaire (facultatif)").fill(comment);
    await card.getByRole("button", { name: "Approuver" }).click();
    await expect(this.heading()).toContainText("Approuvée");
  }

  async reject(reason: string) {
    const card = this.card("Décision");
    await card.getByLabel("Motif du refus").fill(reason);
    await card.getByRole("button", { name: "Refuser" }).click();
  }

  async pay(date?: string) {
    const card = this.card("Enregistrer le paiement");
    if (date) await card.getByLabel("Date du paiement").fill(date);
    await card.getByRole("button", { name: "Marquer comme payée" }).click();
    await expect(this.heading()).toContainText("Payée");
  }

  decisionCard() {
    return this.card("Décision");
  }

  paymentCard() {
    return this.card("Enregistrer le paiement");
  }
}
