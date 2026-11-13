/**
 * Money helpers.
 *
 * All amounts are integers expressed in millimes (1 DT = 1 000 millimes).
 * Parsing works on the string representation (never through floats), so
 * "0,1" + "0,2" is exactly 300 millimes — no visible rounding errors.
 */

export type Millimes = number;

export const MILLIMES_PER_DINAR = 1000;
/** Upper bound for a single amount (stored as a 32-bit integer). */
export const MAX_AMOUNT: Millimes = 2_000_000_000; // 2 000 000 DT

const AMOUNT_PATTERN = /^(-)?(\d{1,10})(?:[.,](\d{1,3}))?$/;

/** Parses "1 234,5" / "1234.500" / "-12" into millimes. Returns null if invalid. */
export function parseMoney(input: string): Millimes | null {
  const normalized = input.replace(/[\s  ]/g, "").replace(/(DT|TND)$/i, "");
  const match = AMOUNT_PATTERN.exec(normalized);
  if (!match) return null;
  const [, sign, units, decimals = ""] = match;
  const value = Number(units) * MILLIMES_PER_DINAR + Number(decimals.padEnd(3, "0"));
  if (!Number.isSafeInteger(value)) return null;
  return sign ? -value : value;
}

/** Formats millimes as "12 345,678 DT" (regular spaces: also safe for PDF fonts). */
export function formatMoney(amount: Millimes, options: { currency?: string; signed?: boolean } = {}): string {
  const { currency = "DT", signed = false } = options;
  const negative = amount < 0;
  const abs = Math.abs(amount);
  const units = Math.floor(abs / MILLIMES_PER_DINAR);
  const decimals = String(abs % MILLIMES_PER_DINAR).padStart(3, "0");
  const grouped = String(units).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const sign = negative ? "-" : signed && amount > 0 ? "+" : "";
  return `${sign}${grouped},${decimals}${currency ? ` ${currency}` : ""}`;
}

/** Value suitable for an <input> default value: "1234,500". */
export function toInputAmount(amount: Millimes): string {
  return formatMoney(amount, { currency: "" }).replace(/ /g, "");
}

/** Integer multiplication followed by a division, rounded half away from zero. */
export function mulDivRound(a: number, b: number, divisor: number): number {
  const product = BigInt(a) * BigInt(b);
  const d = BigInt(divisor);
  const quotient = product / d;
  const remainder = product % d;
  const twice = (remainder < 0n ? -remainder : remainder) * 2n;
  if (twice >= (d < 0n ? -d : d)) {
    return Number(quotient + (product < 0n ? -1n : 1n));
  }
  return Number(quotient);
}

export function sum(values: readonly number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}
