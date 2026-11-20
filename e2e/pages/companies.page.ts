import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class CompaniesPage extends BasePage {
  async createCompany(name: string, initialBalance: string, date: string) {
    const form = this.card("Nouvelle entreprise");
    await form.getByLabel("Nom de l'entreprise").fill(name);
    await form.getByLabel("Solde initial (DT)").fill(initialBalance);
    await form.getByLabel("Date du solde initial").fill(date);
    await form.getByRole("button", { name: "Créer l'entreprise" }).click();
    await expect(this.page).toHaveURL(/\/c\/[^/]+\/dashboard/);
    return this.page.url().match(/\/c\/([^/]+)\//)![1];
  }

  async open(name: string) {
    await this.page.goto("/companies");
    await this.page.getByRole("link", { name: new RegExp(name) }).click();
    await expect(this.page).toHaveURL(/\/dashboard/);
    return this.page.url().match(/\/c\/([^/]+)\//)![1];
  }
}
