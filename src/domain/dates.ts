/**
 * Date-only helpers. Business dates are manipulated as ISO strings
 * ("YYYY-MM-DD"), which sort lexicographically and avoid time-zone drift.
 * They are persisted as Date objects at 00:00 UTC.
 */

export type ISODate = string;

const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

export function isISODate(value: string): value is ISODate {
  const match = ISO_PATTERN.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toISOString().slice(0, 10) === value;
}

export function toISODate(date: Date): ISODate {
  return date.toISOString().slice(0, 10);
}

export function fromISODate(value: ISODate): Date {
  if (!isISODate(value)) throw new Error(`Invalid ISO date: ${value}`);
  return new Date(`${value}T00:00:00.000Z`);
}

export function addDays(value: ISODate, days: number): ISODate {
  return toISODate(new Date(fromISODate(value).getTime() + days * DAY_MS));
}

/** Number of days from `from` to `to` (positive when `to` is later). */
export function diffDays(from: ISODate, to: ISODate): number {
  return Math.round((fromISODate(to).getTime() - fromISODate(from).getTime()) / DAY_MS);
}

export function maxDate(a: ISODate, b: ISODate): ISODate {
  return a > b ? a : b;
}

/** Today's date in the given IANA time zone (default: Africa/Tunis). */
export function todayISO(timeZone = "Africa/Tunis", now: Date = new Date()): ISODate {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Builds a date in the given month, clamping the day to the month length. */
export function dateInMonth(year: number, monthIndex: number, day: number): ISODate {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return toISODate(new Date(Date.UTC(year, monthIndex, Math.min(day, lastDay))));
}

/** Monthly occurrences of `day` between `from` and `to` (inclusive). */
export function monthlyOccurrences(day: number, from: ISODate, to: ISODate): ISODate[] {
  const start = fromISODate(from);
  const result: ISODate[] = [];
  let year = start.getUTCFullYear();
  let month = start.getUTCMonth();
  for (;;) {
    const occurrence = dateInMonth(year, month, day);
    if (occurrence > to) break;
    if (occurrence >= from) result.push(occurrence);
    month += 1;
    if (month === 12) {
      month = 0;
      year += 1;
    }
  }
  return result;
}

export function monthKey(value: ISODate): string {
  return value.slice(0, 7);
}

const DISPLAY = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const SHORT = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", timeZone: "UTC" });

export function formatDate(value: ISODate | Date): string {
  return DISPLAY.format(typeof value === "string" ? fromISODate(value) : value);
}

export function formatShortDate(value: ISODate): string {
  return SHORT.format(fromISODate(value));
}

/**
 * Formats an instant (createdAt, reviewedAt…) as a calendar date in the
 * business time zone. Date-only fields must use formatDate instead.
 */
export function formatInstant(value: Date, timeZone = "Africa/Tunis"): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone }).format(value);
}
