/**
 * Scénario de soutenance (from the specification):
 * create a company with an initial balance → issue an invoice → record a partial
 * payment → submit and approve an expense → view the forecast → simulate a
 * payment delay → compare both scenarios.
 */
import { addDays, todayISO } from "../src/domain/dates";
import { expect, test } from "./fixtures";
import { dt } from "./pages/base.page";

const T = todayISO("Africa/Tunis");

test("scénario complet de soutenance", async ({
  page,
  registerPage,
  companiesPage,
  contactsPage,
  invoiceForm,
  invoicePage,
  expenseForm,
  expensePage,
  forecastPage,
  simulationPage,
}) => {
  await registerPage.register("Pilote Test", `pilote-${Date.now()}@test.tn`, "Secret123");

  // 1. Company with an initial balance of 5 000 DT.
  const companyId = await companiesPage.createCompany("Agence Soutenance", "5000", T);

  // 2. Invoice of 4 000 DT (no VAT for readability), due in 10 days.
  await contactsPage.create(companyId, { kind: "Client", name: "Client Démo" });
  await invoiceForm.createDraft(companyId, {
    client: "Client Démo",
    issueDate: T,
    dueDate: addDays(T, 10),
    taxRate: "0",
    lines: [{ description: "Site vitrine", quantity: "1", unitPrice: "4000" }],
  });
  await invoicePage.validate();
  const invoiceUrl = page.url();
  const number = await invoicePage.number();

  // 3. Partial payment: the remaining amount decreases.
  await invoicePage.recordPayment("1000");
  await invoicePage.expectSuccess("Encaissement enregistré.");
  await expect(invoicePage.remaining()).toHaveText(dt(3000));
  await expect(invoicePage.status()).toContainText("Partiellement payée");

  // An invoice cannot be paid beyond its remaining amount.
  await invoicePage.recordPayment("3000,001");
  await invoicePage.expectError("dépasse le reste à payer");
  await expect(invoicePage.remaining()).toHaveText(dt(3000));

  // 4. Submit and approve an expense of 7 000 DT paid in 20 days.
  await expenseForm.submit(companyId, { description: "Salaires", amount: "7000", expenseDate: T, dueDate: addDays(T, 20) });
  await expensePage.approve();

  // 5. Forecast: 6 000 (real) + 3 000 (remaining) − 7 000 = 2 000 at D+30, never negative.
  await forecastPage.goto(companyId);
  await expect(forecastPage.referenceBalance()).toContainText(dt(6000));
  await expect(forecastPage.milestone(30)).toContainText(dt(2000));
  await expect(page.getByText("Aucun manque de liquidités prévu")).toBeVisible();

  // 6. Simulate a 20-day delay on the invoice.
  await simulationPage.create(companyId, "Retard client 20 jours");
  await simulationPage.delayInvoice(number, 20);

  // 7. Compare: the simulated projection shows a shortfall of −1 000 DT for 10 days.
  await expect(simulationPage.baseShortfalls()).toContainText("Aucun manque de liquidités prévu");
  await expect(simulationPage.simulatedShortfalls()).toContainText("1 période(s) de manque de liquidités");
  await expect(simulationPage.simulatedShortfalls()).toContainText(dt(-1000));
  await expect(simulationPage.simulatedShortfalls()).toContainText("10 jour(s)");
  await expect(simulationPage.comparisonRow(30)).toContainText(dt(2000));

  // A simulation never modifies real data.
  await forecastPage.goto(companyId);
  await expect(forecastPage.milestone(30)).toContainText(dt(2000));
  await page.goto(invoiceUrl);
  await expect(invoicePage.remaining()).toHaveText(dt(3000));
});
