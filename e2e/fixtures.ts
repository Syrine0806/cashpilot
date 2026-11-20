import { test as base } from "@playwright/test";
import { AppShell } from "./pages/app-shell";
import { LoginPage, RegisterPage } from "./pages/auth.page";
import { CompaniesPage } from "./pages/companies.page";
import { ContactsPage } from "./pages/contacts.page";
import { ExpenseFormPage, ExpensePage } from "./pages/expense.page";
import { ForecastPage, SimulationPage } from "./pages/forecast.page";
import { InvoiceFormPage, InvoicePage } from "./pages/invoice.page";

interface Pages {
  loginPage: LoginPage;
  registerPage: RegisterPage;
  companiesPage: CompaniesPage;
  shell: AppShell;
  contactsPage: ContactsPage;
  invoiceForm: InvoiceFormPage;
  invoicePage: InvoicePage;
  expenseForm: ExpenseFormPage;
  expensePage: ExpensePage;
  forecastPage: ForecastPage;
  simulationPage: SimulationPage;
}

/** Injects one instance of every page object into each test. */
export const test = base.extend<Pages>({
  loginPage: async ({ page }, provide) => provide(new LoginPage(page)),
  registerPage: async ({ page }, provide) => provide(new RegisterPage(page)),
  companiesPage: async ({ page }, provide) => provide(new CompaniesPage(page)),
  shell: async ({ page }, provide) => provide(new AppShell(page)),
  contactsPage: async ({ page }, provide) => provide(new ContactsPage(page)),
  invoiceForm: async ({ page }, provide) => provide(new InvoiceFormPage(page)),
  invoicePage: async ({ page }, provide) => provide(new InvoicePage(page)),
  expenseForm: async ({ page }, provide) => provide(new ExpenseFormPage(page)),
  expensePage: async ({ page }, provide) => provide(new ExpensePage(page)),
  forecastPage: async ({ page }, provide) => provide(new ForecastPage(page)),
  simulationPage: async ({ page }, provide) => provide(new SimulationPage(page)),
});

export { expect } from "@playwright/test";

export const DEMO = {
  password: "Demo1234!",
  director: "dirigeant@cashpilot.tn",
  finance: "gestionnaire@cashpilot.tn",
  employee: "collaborateur@cashpilot.tn",
};
