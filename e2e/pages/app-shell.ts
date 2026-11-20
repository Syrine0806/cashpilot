import { expect, type Page } from "@playwright/test";

/** Sidebar navigation of a company workspace. */
export class AppShell {
  constructor(private readonly page: Page) {}

  private nav() {
    return this.page.getByRole("navigation", { name: "Navigation principale" }).first();
  }

  async goTo(section: string) {
    await this.nav().getByRole("link", { name: new RegExp(`^${section}`) }).click();
    await expect(this.page.getByRole("heading", { level: 1 })).toBeVisible();
  }

  async expectLinks(visible: string[], hidden: string[]) {
    for (const name of visible) await expect(this.nav().getByRole("link", { name: new RegExp(`^${name}`) })).toBeVisible();
    for (const name of hidden) await expect(this.nav().getByRole("link", { name: new RegExp(`^${name}`) })).toHaveCount(0);
  }
}
