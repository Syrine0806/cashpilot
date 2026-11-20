import { expect, type Locator, type Page } from "@playwright/test";

/** Shared helpers for every page object. */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /** A card (<section>) identified by its heading. */
  protected card(title: string | RegExp): Locator {
    return this.page.locator("section").filter({ has: this.page.getByRole("heading", { name: title }) });
  }

  async expectSuccess(message: string | RegExp) {
    await expect(this.page.getByRole("status").filter({ hasText: message })).toBeVisible();
  }

  async expectError(message: string | RegExp) {
    await expect(this.page.getByRole("alert").filter({ hasText: message }).first()).toBeVisible();
  }

  heading(): Locator {
    return this.page.getByRole("heading", { level: 1 });
  }
}

/** "5 000,000 DT" — same format as the application (regular spaces). */
export function dt(dinars: number): string {
  const [units, decimals] = dinars.toFixed(3).split(".");
  return `${units.replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${decimals} DT`;
}
