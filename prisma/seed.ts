/**
 * Demo data — reproduces the example of the specification:
 *   real balance 5 000 DT, 3 000 DT expected from a client,
 *   6 000 DT of approved expenses, and a "20-day delay" scenario.
 *
 * All dates are relative to the day the seed runs, so the demo is always current.
 * Run with: npm run db:seed (wipes existing data).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, fromISODate, todayISO } from "../src/domain/dates";
import { computeInvoiceTotals, formatInvoiceNumber } from "../src/domain/invoice";

const prisma = new PrismaClient();
const DT = (dinars: number) => Math.round(dinars * 1000);
const T = todayISO(process.env.APP_TIMEZONE || "Africa/Tunis");
const day = (offset: number) => fromISODate(addDays(T, offset));
export const DEMO_PASSWORD = "Demo1234!";

async function main() {
  // Clean slate (order matters because of foreign keys).
  await prisma.auditLog.deleteMany();
  await prisma.scenarioAdjustment.deleteMany();
  await prisma.scenario.deleteMany();
  await prisma.movement.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.retainer.deleteMany();
  await prisma.plannedFlow.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const [director, finance, employee] = await Promise.all([
    prisma.user.create({ data: { email: "dirigeant@cashpilot.tn", name: "Sami Dridi", passwordHash } }),
    prisma.user.create({ data: { email: "gestionnaire@cashpilot.tn", name: "Lina Trabelsi", passwordHash } }),
    prisma.user.create({ data: { email: "collaborateur@cashpilot.tn", name: "Youssef Mansour", passwordHash } }),
  ]);

  const company = await prisma.company.create({
    data: {
      name: "Studio Pixel",
      sector: "DIGITAL_AGENCY",
      initialBalance: DT(4000),
      initialBalanceDate: day(-60),
      nextInvoiceNumber: 3,
      memberships: {
        create: [
          { userId: director.id, role: "DIRECTOR" },
          { userId: finance.id, role: "FINANCE_MANAGER" },
          { userId: employee.id, role: "EMPLOYEE" },
        ],
      },
    },
  });
  const companyId = company.id;
  const log = (actorId: string, action: string, entityType: string, entityId: string, summary: string) =>
    prisma.auditLog.create({ data: { companyId, actorId, action, entityType, entityId, summary } });
  await log(director.id, "company.created", "Company", companyId, "Création de l'entreprise avec un solde initial de 4 000,000 DT");

  // Contacts
  const [jasmin, medina, oliviers, atlas, nour] = await Promise.all([
    prisma.contact.create({ data: { companyId, kind: "CLIENT", name: "Boutique Jasmin", email: "compta@boutique-jasmin.tn", phone: "+216 71 000 101", address: "Rue de Marseille, Tunis", taxId: "1234567/A/M/000" } }),
    prisma.contact.create({ data: { companyId, kind: "CLIENT", name: "Café Médina", email: "contact@cafemedina.tn", phone: "+216 71 000 102", address: "Médina de Tunis" } }),
    prisma.contact.create({ data: { companyId, kind: "CLIENT", name: "Clinique Les Oliviers", email: "direction@lesoliviers.tn", address: "Sousse" } }),
    prisma.contact.create({ data: { companyId, kind: "SUPPLIER", name: "Atlas Hosting", email: "billing@atlas-hosting.tn" } }),
    prisma.contact.create({ data: { companyId, kind: "SUPPLIER", name: "Studio Freelance Nour", email: "nour@freelance.tn" } }),
  ]);

  async function createInvoice(params: {
    clientId: string;
    number: string | null;
    issue: number;
    due: number;
    lines: { description: string; quantity: number; unitPrice: number }[];
  }) {
    const totals = computeInvoiceTotals(
      params.lines.map((l) => ({ description: l.description, quantityMilli: Math.round(l.quantity * 1000), unitPrice: DT(l.unitPrice) })),
      1900,
    );
    return prisma.invoice.create({
      data: {
        companyId,
        clientId: params.clientId,
        number: params.number,
        status: params.number ? "ISSUED" : "DRAFT",
        issueDate: day(params.issue),
        dueDate: day(params.due),
        taxRateBp: 1900,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        total: totals.total,
        createdById: finance.id,
        issuedAt: params.number ? day(params.issue) : null,
        issuedById: params.number ? finance.id : null,
        lines: { create: totals.lines.map((l, position) => ({ ...l, position })) },
      },
    });
  }

  async function pay(invoice: { id: string; number: string | null }, amount: number, offset: number, method = "TRANSFER") {
    const payment = await prisma.payment.create({
      data: { companyId, invoiceId: invoice.id, amount, date: day(offset), method, createdById: finance.id },
    });
    await prisma.movement.create({
      data: { companyId, date: day(offset), amount, kind: "CUSTOMER_PAYMENT", label: `Encaissement ${invoice.number}`, paymentId: payment.id, createdById: finance.id },
    });
  }

  const year = Number(T.slice(0, 4));
  // Invoice 1: 2 000 DT HT → 2 380 DT TTC, fully paid.
  const inv1 = await createInvoice({
    clientId: medina.id,
    number: formatInvoiceNumber("FAC", year, 1),
    issue: -50,
    due: -20,
    lines: [{ description: "Identité visuelle & menu digital", quantity: 1, unitPrice: 2000 }],
  });
  await pay(inv1, DT(2380), -25);
  await log(finance.id, "invoice.issued", "Invoice", inv1.id, `Facture ${inv1.number} validée (2 380,000 DT TTC)`);
  await log(finance.id, "payment.recorded", "Invoice", inv1.id, `Encaissement de 2 380,000 DT sur ${inv1.number} — reste à payer 0,000 DT`);

  // Invoice 2: 4 000 DT HT → 4 760 DT TTC, partial payment of 1 760 DT → 3 000 DT still expected.
  const inv2 = await createInvoice({
    clientId: jasmin.id,
    number: formatInvoiceNumber("FAC", year, 2),
    issue: -20,
    due: 10,
    lines: [
      { description: "Développement boutique en ligne (jours)", quantity: 12.5, unitPrice: 280 },
      { description: "Intégration paiement en ligne", quantity: 1, unitPrice: 500 },
    ],
  });
  await pay(inv2, DT(1760), -5, "CHECK");
  await log(finance.id, "invoice.issued", "Invoice", inv2.id, `Facture ${inv2.number} validée (4 760,000 DT TTC)`);
  await log(finance.id, "payment.recorded", "Invoice", inv2.id, `Encaissement de 1 760,000 DT sur ${inv2.number} — reste à payer 3 000,000 DT`);

  // Draft (not counted anywhere until validated).
  await createInvoice({
    clientId: oliviers.id,
    number: null,
    issue: 0,
    due: 45,
    lines: [{ description: "Refonte du site institutionnel", quantity: 1, unitPrice: 6500 }],
  });

  // Expenses
  const paidExpense = await prisma.expense.create({
    data: {
      companyId, submittedById: finance.id, supplierId: atlas.id, category: "SOFTWARE",
      description: "Licences logicielles & hébergement annuel", amount: DT(3140),
      expenseDate: day(-18), dueDate: day(-15), status: "PAID",
      reviewedById: director.id, reviewedAt: day(-17), paidAt: day(-15), paidById: finance.id, paymentMethod: "TRANSFER",
    },
  });
  await prisma.movement.create({
    data: { companyId, date: day(-15), amount: -DT(3140), kind: "EXPENSE_PAYMENT", label: `Dépense — ${paidExpense.description}`, expenseId: paidExpense.id, createdById: finance.id },
  });
  await log(director.id, "expense.approved", "Expense", paidExpense.id, `Dépense « ${paidExpense.description} » approuvée`);
  await log(finance.id, "expense.paid", "Expense", paidExpense.id, `Dépense « ${paidExpense.description} » payée (3 140,000 DT)`);

  const salaries = await prisma.expense.create({
    data: {
      companyId, submittedById: finance.id, category: "SALARIES", description: "Salaires de l'équipe",
      amount: DT(4000), expenseDate: day(-1), dueDate: day(15), status: "APPROVED", reviewedById: director.id, reviewedAt: day(-1),
    },
  });
  const freelance = await prisma.expense.create({
    data: {
      companyId, submittedById: finance.id, supplierId: nour.id, category: "FREELANCE", description: "Sous-traitance application mobile",
      amount: DT(2000), expenseDate: day(-2), dueDate: day(25), status: "APPROVED", reviewedById: director.id, reviewedAt: day(-1),
    },
  });
  await log(director.id, "expense.approved", "Expense", salaries.id, `Dépense « ${salaries.description} » approuvée`);
  await log(director.id, "expense.approved", "Expense", freelance.id, `Dépense « ${freelance.description} » approuvée`);

  const pending = await prisma.expense.create({
    data: {
      companyId, submittedById: employee.id, category: "TRAVEL", description: "Déplacement salon e-commerce Sfax",
      amount: DT(450), expenseDate: day(-1), dueDate: day(20), status: "SUBMITTED",
    },
  });
  await log(employee.id, "expense.submitted", "Expense", pending.id, `Dépense « ${pending.description} » soumise (450,000 DT)`);
  const rejected = await prisma.expense.create({
    data: {
      companyId, submittedById: employee.id, category: "HARDWARE", description: "Casque audio sans fil",
      amount: DT(320), expenseDate: day(-10), dueDate: day(-5), status: "REJECTED",
      reviewedById: director.id, reviewedAt: day(-9), reviewComment: "Non prioritaire ce trimestre.",
    },
  });
  await log(director.id, "expense.rejected", "Expense", rejected.id, `Dépense « ${rejected.description} » refusée — Non prioritaire ce trimestre.`);

  // Sector feature: monthly retainer starting after the 30-day window, and planned rent.
  await prisma.retainer.create({
    data: {
      companyId, clientId: jasmin.id, label: "Maintenance & hébergement e-commerce", monthlyAmount: DT(1000),
      taxRateBp: 1900, dayOfMonth: 10, startDate: day(35),
    },
  });
  await prisma.plannedFlow.create({
    data: { companyId, direction: "OUT", label: "Loyer des bureaux", amount: DT(800), startDate: day(40), recurrence: "MONTHLY", createdById: finance.id },
  });

  // Saved "What if?" scenario from the specification.
  await prisma.scenario.create({
    data: {
      companyId, name: "Retard client de 20 jours", createdById: finance.id,
      description: "Boutique Jasmin paie le reste de sa facture avec 20 jours de retard.",
      adjustments: { create: [{ kind: "DELAY_INVOICE", invoiceId: inv2.id, delayDays: 20 }] },
    },
  });

  console.log(`Seed OK — today = ${T}. Accounts (password ${DEMO_PASSWORD}):`);
  console.log("  dirigeant@cashpilot.tn · gestionnaire@cashpilot.tn · collaborateur@cashpilot.tn");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
