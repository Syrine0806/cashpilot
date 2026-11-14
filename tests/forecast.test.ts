import { describe, expect, it } from "vitest";
import { balanceAt, buildForecastFlows, computeForecast, computeRunway, type ForecastSnapshot } from "@/domain/forecast";
import { applyScenario, compareScenario, type Adjustment } from "@/domain/simulation";

const TODAY = "2026-11-21";

/**
 * Example from the specification: 5 000 DT in the bank, 3 000 DT expected
 * from a client, 6 000 DT of planned expenses; then a 20-day payment delay.
 */
const snapshot: ForecastSnapshot = {
  today: TODAY,
  invoices: [{ id: "inv1", number: "FAC-2026-0002", clientName: "Client A", dueDate: "2026-12-01", remaining: 3_000_000 }],
  expenses: [
    { id: "exp1", label: "Salaires", dueDate: "2026-12-06", amount: 4_000_000, status: "APPROVED" },
    { id: "exp2", label: "Licences", dueDate: "2026-12-16", amount: 2_000_000, status: "APPROVED" },
    { id: "exp3", label: "Demande en attente", dueDate: "2026-12-10", amount: 450_000, status: "SUBMITTED" },
  ],
  plannedFlows: [],
  retainers: [],
};

describe("forecast engine", () => {
  const flows = buildForecastFlows(snapshot);
  const forecast = computeForecast({ referenceDate: TODAY, referenceBalance: 5_000_000, flows });

  it("follows: reference balance + receipts due − disbursements due", () => {
    expect(balanceAt(5_000_000, flows, "2026-12-01")).toBe(8_000_000);
    expect(balanceAt(5_000_000, flows, "2026-12-06")).toBe(4_000_000);
    expect(balanceAt(5_000_000, flows, "2026-12-16")).toBe(2_000_000);
    expect(forecast.milestones.map((m) => [m.days, m.balance])).toEqual([
      [30, 2_000_000],
      [60, 2_000_000],
      [90, 2_000_000],
    ]);
  });

  it("excludes pending expenses unless asked", () => {
    expect(flows.some((f) => f.refId === "exp3")).toBe(false);
    const prudent = buildForecastFlows(snapshot, { includePending: true });
    expect(prudent.find((f) => f.refId === "exp3")?.amount).toBe(-450_000);
  });

  it("has no shortfall in the base scenario", () => {
    expect(forecast.shortfalls).toEqual([]);
    expect(forecast.lowest.balance).toBe(2_000_000);
  });

  it("moves overdue receivables to today and only counts the remaining amount", () => {
    const overdue = buildForecastFlows({
      ...snapshot,
      invoices: [{ id: "old", number: "FAC-1", clientName: "B", dueDate: "2026-11-01", remaining: 1_000 }],
      expenses: [],
    });
    expect(overdue[0]).toMatchObject({ date: TODAY, originalDate: "2026-11-01", amount: 1_000 });
  });

  it("expands monthly planned flows and skips invoiced retainer months", () => {
    const result = buildForecastFlows({
      today: TODAY,
      invoices: [],
      expenses: [],
      plannedFlows: [
        { id: "rent", label: "Loyer", direction: "OUT", amount: 800_000, startDate: "2026-01-05", recurrence: "MONTHLY", endDate: null },
      ],
      retainers: [
        {
          id: "r1",
          label: "Maintenance",
          clientName: "C",
          monthlyTotal: 1_190_000,
          dayOfMonth: 10,
          startDate: "2026-01-01",
          endDate: null,
          invoicedPeriods: ["2026-12"],
        },
      ],
    });
    expect(result.filter((f) => f.refId === "rent").map((f) => f.date)).toEqual(["2026-12-05", "2027-01-05", "2027-02-05"]);
    expect(result.filter((f) => f.refId === "r1").map((f) => f.date)).toEqual(["2027-01-10", "2027-02-10"]);
  });
});

describe("what-if simulation", () => {
  const flows = buildForecastFlows(snapshot);
  const delay: Adjustment = { id: "a1", kind: "DELAY_INVOICE", invoiceId: "inv1", delayDays: 20 };

  it("a 20-day delay reveals a cash shortfall", () => {
    const comparison = compareScenario({ referenceDate: TODAY, referenceBalance: 5_000_000, flows, adjustments: [delay] });
    expect(comparison.simulated.shortfalls).toEqual([
      {
        start: "2026-12-16",
        end: "2026-12-20",
        lowestBalance: -1_000_000,
        lowestDate: "2026-12-16",
        openEnded: false,
      },
    ]);
    // Same final balance: the money arrives later, not less of it.
    expect(comparison.milestones[0]).toMatchObject({ base: 2_000_000, simulated: 2_000_000, difference: 0 });
    expect(comparison.lowestDifference).toBe(-3_000_000);
  });

  it("never mutates the real flows", () => {
    const before = JSON.stringify(flows);
    applyScenario(flows, [delay, { id: "a2", kind: "NEW_EXPENSE", label: "PC", amount: 1, date: TODAY }], TODAY);
    expect(JSON.stringify(flows)).toBe(before);
  });

  it("adds hypothetical expenses and inflows", () => {
    const simulated = applyScenario(
      flows,
      [
        { id: "e", kind: "NEW_EXPENSE", label: "Serveur", amount: 1_500_000, date: "2026-12-02" },
        { id: "i", kind: "NEW_INFLOW", label: "Acompte", amount: 500_000, date: "2026-12-03" },
      ],
      TODAY,
    );
    expect(balanceAt(5_000_000, simulated, "2026-12-03")).toBe(5_000_000 + 3_000_000 - 1_500_000 + 500_000);
  });
});

describe("cash runway", () => {
  const flows = buildForecastFlows(snapshot);

  it("is safe when the balance never goes negative", () => {
    const forecast = computeForecast({ referenceDate: TODAY, referenceBalance: 5_000_000, flows });
    expect(computeRunway(forecast)).toEqual({ days: null, date: null, status: "safe", horizonDays: 90 });
  });

  it("counts the days before the first shortfall", () => {
    const delayed = applyScenario(flows, [{ id: "d", kind: "DELAY_INVOICE", invoiceId: "inv1", delayDays: 20 }], TODAY);
    const forecast = computeForecast({ referenceDate: TODAY, referenceBalance: 5_000_000, flows: delayed });
    expect(computeRunway(forecast)).toMatchObject({ days: 25, date: "2026-12-16", status: "critical" });
  });

  it("is 0 days when the balance is already negative", () => {
    const forecast = computeForecast({ referenceDate: TODAY, referenceBalance: -1, flows: [] });
    expect(computeRunway(forecast)).toMatchObject({ days: 0, status: "critical" });
  });
});
