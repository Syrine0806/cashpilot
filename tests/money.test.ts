import { describe, expect, it } from "vitest";
import { formatMoney, mulDivRound, parseMoney, toInputAmount } from "@/domain/money";

describe("parseMoney", () => {
  it.each([
    ["1234", 1_234_000],
    ["1234,5", 1_234_500],
    ["1 234.567", 1_234_567],
    ["0,001", 1],
    ["-12,3", -12_300],
    ["5 000 DT", 5_000_000],
  ])("parses %s", (input, expected) => {
    expect(parseMoney(input)).toBe(expected);
  });

  it.each(["", "abc", "1,2345", "1.2.3", "12e3"])("rejects %s", (input) => {
    expect(parseMoney(input)).toBeNull();
  });

  it("adds decimals without floating point errors", () => {
    expect(parseMoney("0,1")! + parseMoney("0,2")!).toBe(parseMoney("0,3"));
  });
});

describe("formatMoney", () => {
  it("formats with thousands separators and 3 decimals", () => {
    expect(formatMoney(1_234_567_890)).toBe("1 234 567,890 DT");
    expect(formatMoney(-5_000)).toBe("-5,000 DT");
    expect(formatMoney(500, { signed: true })).toBe("+0,500 DT");
  });

  it("round-trips through the input format", () => {
    expect(parseMoney(toInputAmount(4_760_123))).toBe(4_760_123);
  });
});

describe("mulDivRound", () => {
  it("rounds half away from zero", () => {
    expect(mulDivRound(1, 5, 10)).toBe(1); // 0.5 → 1
    expect(mulDivRound(1, 4, 10)).toBe(0); // 0.4 → 0
    expect(mulDivRound(-1, 5, 10)).toBe(-1);
  });

  it("does not overflow on large products", () => {
    expect(mulDivRound(10_000_000, 2_000_000_000, 1000)).toBe(20_000_000_000_000);
  });
});
