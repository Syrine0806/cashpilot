/** The seeded demo company reproduces the example of the specification. */
import { expect, test, DEMO } from "./fixtures";
import { dt } from "./pages/base.page";

test("demo: 5 000 DT, 3 000 DT expected, 6 000 DT of expenses, 20-day delay", async ({ page, loginPage, companiesPage, forecastPage, shell }) => {
  await loginPage.login(DEMO.finance, DEMO.password);
  const companyId = await companiesPage.open("Studio Pixel");

  await forecastPage.goto(companyId);
  await expect(forecastPage.referenceBalance()).toContainText(dt(5000));
  await expect(forecastPage.milestone(30)).toContainText(dt(2000));

  await shell.goTo("Simulations");
  await page.getByRole("link", { name: /Retard client de 20 jours/ }).click();
  await expect(page.getByText("1 période(s) de manque de liquidités")).toBeVisible();
  await expect(page.getByText(dt(-1000)).first()).toBeVisible();
});
