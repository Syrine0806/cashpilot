import { readFileSync } from "node:fs";
import { SignJWT } from "jose";
import { expect, test, DEMO } from "./fixtures";
import { dt } from "./pages/base.page";

test.describe("permissions & business rules", () => {
  test("a collaborator only sees their own requests", async ({ page, loginPage, companiesPage, shell }) => {
    await loginPage.login(DEMO.employee, DEMO.password);
    const companyId = await companiesPage.open("Studio Pixel");
    await shell.expectLinks(["Tableau de bord", "Mes dépenses"], ["Factures", "Trésorerie", "Prévisions", "Simulations", "Journal"]);

    await shell.goTo("Mes dépenses");
    await expect(page.getByRole("link", { name: "Déplacement salon e-commerce Sfax" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Salaires de l'équipe" })).toHaveCount(0);

    // Blocked on the server as well, not only hidden in the menu.
    await page.goto(`/c/${companyId}/invoices`);
    await expect(page.getByRole("heading", { name: "Accès refusé" })).toBeVisible();
    const pdf = await page.request.get(`/api/companies/${companyId}/invoices/unknown/pdf`);
    expect(pdf.status()).toBe(404);
  });

  test("the finance manager cannot approve, and a rejected expense cannot be paid", async ({ page, loginPage, companiesPage }) => {
    await loginPage.login(DEMO.finance, DEMO.password);
    const companyId = await companiesPage.open("Studio Pixel");

    await page.goto(`/c/${companyId}/expenses`);
    await page.getByRole("link", { name: "Déplacement salon e-commerce Sfax" }).click();
    await expect(page.getByRole("heading", { name: "Décision" })).toHaveCount(0);
    await expect(page.getByText("En attente de la validation du dirigeant.")).toBeVisible();

    await page.goto(`/c/${companyId}/expenses`);
    await page.getByRole("link", { name: "Casque audio sans fil" }).click();
    await expect(page.getByRole("heading", { name: "Enregistrer le paiement" })).toHaveCount(0);
    await expect(page.getByText("Dépense refusée : elle ne peut pas être payée.")).toBeVisible();
  });

  test("paying an approved expense affects the real balance exactly once", async ({ page, loginPage, companiesPage, expensePage }) => {
    await loginPage.login(DEMO.director, DEMO.password);
    const companyId = await companiesPage.open("Studio Pixel");
    await page.goto(`/c/${companyId}/treasury`);
    await expect(page.getByText(dt(5000)).first()).toBeVisible();

    await page.goto(`/c/${companyId}/expenses`);
    await page.getByRole("link", { name: "Sous-traitance application mobile" }).click();
    await expensePage.pay();
    await expect(expensePage.paymentCard()).toHaveCount(0); // cannot be paid twice

    await page.goto(`/c/${companyId}/treasury`);
    await expect(page.getByText(dt(3000)).first()).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "Sous-traitance application mobile" })).toHaveCount(1);
  });

  test("company data is only visible to its members", async ({ browser, loginPage, companiesPage }) => {
    await loginPage.login(DEMO.director, DEMO.password);
    const companyId = await companiesPage.open("Studio Pixel");

    const outsider = await browser.newContext();
    const page = await outsider.newPage();
    await page.goto("/register");
    await page.getByLabel("Nom complet").fill("Intrus");
    await page.getByLabel("E-mail").fill(`intrus-${Date.now()}@test.tn`);
    await page.getByLabel("Mot de passe").fill("Secret123");
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page).toHaveURL(/\/companies/);

    await page.goto(`/c/${companyId}/dashboard`);
    await expect(page.getByRole("heading", { name: "Introuvable" })).toBeVisible();
    await expect(page.getByText("Studio Pixel")).toHaveCount(0);
    await outsider.close();
  });
});

test("a session cookie of a deleted user does not cause a redirect loop", async ({ page, context, baseURL }) => {
  // Correctly signed token whose user does not exist (e.g. after re-seeding the database).
  const secret = readFileSync(".env", "utf8").match(/SESSION_SECRET="([^"]+)"/)![1];
  const token = await new SignJWT({ userId: "deleted-user" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(secret));
  await context.addCookies([{ name: "cashpilot_session", value: token, url: baseURL! }]);

  await page.goto("/companies");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
});
