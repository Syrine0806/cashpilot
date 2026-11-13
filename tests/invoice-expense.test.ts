import { describe, expect, it } from "vitest";
import {
  assertCanCancel,
  assertPaymentAllowed,
  computeInvoiceTotals,
  displayStatus,
  remainingAmount,
} from "@/domain/invoice";
import { canTransition, nextExpenseStatus } from "@/domain/expense";
import { BusinessRuleError } from "@/domain/errors";

describe("invoice totals", () => {
  it("computes lines, tax (19 %) and total in millimes", () => {
    const totals = computeInvoiceTotals(
      [
        { description: "Développement", quantityMilli: 7_500, unitPrice: 120_000 }, // 7.5 h × 120 DT
        { description: "Hébergement", quantityMilli: 1_000, unitPrice: 99_990 },
      ],
      1900,
    );
    expect(totals.lines.map((l) => l.amount)).toEqual([900_000, 99_990]);
    expect(totals.subtotal).toBe(999_990);
    expect(totals.taxAmount).toBe(189_998); // 189 998.1 → 189 998
    expect(totals.total).toBe(1_189_988);
  });
});

describe("partial payments", () => {
  const invoice = { status: "ISSUED", total: 4_760_000 };

  it("a partial payment decreases the remaining amount", () => {
    const payments = [{ amount: 1_760_000 }];
    expect(remainingAmount(invoice.total, payments)).toBe(3_000_000);
  });

  it("a reversal restores the remaining amount", () => {
    expect(remainingAmount(invoice.total, [{ amount: 1_760_000 }, { amount: -1_760_000 }])).toBe(4_760_000);
  });

  it("refuses a payment above the remaining amount", () => {
    expect(() => assertPaymentAllowed(invoice, [{ amount: 1_760_000 }], 3_000_001)).toThrow(BusinessRuleError);
    expect(() => assertPaymentAllowed(invoice, [{ amount: 1_760_000 }], 3_000_000)).not.toThrow();
  });

  it("refuses payments on drafts, cancelled invoices and non-positive amounts", () => {
    expect(() => assertPaymentAllowed({ status: "DRAFT", total: 10 }, [], 1)).toThrow(BusinessRuleError);
    expect(() => assertPaymentAllowed({ status: "CANCELLED", total: 10 }, [], 1)).toThrow(BusinessRuleError);
    expect(() => assertPaymentAllowed(invoice, [], 0)).toThrow(BusinessRuleError);
  });

  it("derives the display status", () => {
    const base = { status: "ISSUED", total: 1000, dueDate: "2026-12-01" };
    expect(displayStatus(base, 0, "2026-11-21")).toBe("ISSUED");
    expect(displayStatus(base, 400, "2026-11-21")).toBe("PARTIALLY_PAID");
    expect(displayStatus(base, 1000, "2026-12-15")).toBe("PAID");
    expect(displayStatus(base, 400, "2026-12-02")).toBe("OVERDUE");
  });

  it("cannot cancel an invoice that still holds payments", () => {
    expect(() => assertCanCancel({ status: "ISSUED" }, [{ amount: 10 }])).toThrow(BusinessRuleError);
    expect(() => assertCanCancel({ status: "ISSUED" }, [{ amount: 10 }, { amount: -10 }])).not.toThrow();
  });
});

describe("expense workflow", () => {
  it("submission → approval → payment", () => {
    expect(nextExpenseStatus("SUBMITTED", "approve")).toBe("APPROVED");
    expect(nextExpenseStatus("APPROVED", "pay")).toBe("PAID");
  });

  it("a rejected expense can never be paid", () => {
    expect(nextExpenseStatus("SUBMITTED", "reject")).toBe("REJECTED");
    expect(canTransition("REJECTED", "pay")).toBe(false);
    expect(() => nextExpenseStatus("REJECTED", "pay")).toThrow(BusinessRuleError);
  });

  it("an expense cannot be paid twice nor paid before approval", () => {
    expect(() => nextExpenseStatus("PAID", "pay")).toThrow(BusinessRuleError);
    expect(() => nextExpenseStatus("SUBMITTED", "pay")).toThrow(BusinessRuleError);
  });
});
