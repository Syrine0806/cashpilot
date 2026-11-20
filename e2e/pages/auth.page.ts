import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class LoginPage extends BasePage {
  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password: string) {
    await this.goto();
    await this.page.getByLabel("E-mail").fill(email);
    await this.page.getByLabel("Mot de passe").fill(password);
    await this.page.getByRole("button", { name: "Se connecter" }).click();
    await expect(this.page).toHaveURL(/\/companies/);
  }
}

export class RegisterPage extends BasePage {
  async register(name: string, email: string, password: string) {
    await this.page.goto("/register");
    await this.page.getByLabel("Nom complet").fill(name);
    await this.page.getByLabel("E-mail").fill(email);
    await this.page.getByLabel("Mot de passe").fill(password);
    await this.page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(this.page).toHaveURL(/\/companies/);
  }
}
