import { expect, type Locator } from "@playwright/test";
import { BasePage } from "./base.page";

export class ForecastPage extends BasePage {
  async goto(companyId: string) {
    await this.page.goto(`/c/${companyId}/forecast`);
    await expect(this.heading()).toHaveText("Prévisions de trésorerie");
  }

  /** Stat card "Solde prévu à J+30" etc. */
  milestone(days: 30 | 60 | 90): Locator {
    return this.page.getByRole("group", { name: `Solde prévu à J+${days}` });
  }

  referenceBalance(): Locator {
    return this.page.getByRole("group", { name: "Solde réel de référence" });
  }
}

export class SimulationPage extends BasePage {
  async create(companyId: string, name: string) {
    await this.page.goto(`/c/${companyId}/simulations`);
    await this.card("Nouveau scénario").getByLabel("Nom").fill(name);
    await this.page.getByRole("button", { name: "Créer le scénario" }).click();
    await expect(this.heading()).toHaveText(name);
  }

  async delayInvoice(invoiceNumber: string, days: number) {
    const card = this.card("Retard de paiement client");
    const select = card.getByLabel("Facture");
    const option = select.locator("option", { hasText: invoiceNumber });
    await select.selectOption((await option.getAttribute("value"))!);
    await card.getByLabel("Retard (jours)").fill(String(days));
    await card.getByRole("button", { name: "Simuler le retard" }).click();
    await this.expectSuccess("Hypothèse ajoutée.");
  }

  async addExpense(label: string, amount: string, date: string) {
    const card = this.card("Nouvelle dépense");
    await card.getByLabel("Libellé").fill(label);
    await card.getByLabel("Montant (DT)").fill(amount);
    await card.getByLabel("Date").fill(date);
    await card.getByRole("button", { name: "Ajouter l'hypothèse" }).click();
    await this.expectSuccess("Hypothèse ajoutée.");
  }

  /** Row of the 30/60/90 comparison table. */
  comparisonRow(days: 30 | 60 | 90): Locator {
    return this.page.getByRole("row").filter({ hasText: `J+${days}` });
  }

  simulatedShortfalls(): Locator {
    return this.page.getByTestId("shortfalls-simulated");
  }

  baseShortfalls(): Locator {
    return this.page.getByTestId("shortfalls-base");
  }
}
