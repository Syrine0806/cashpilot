import "server-only";
import path from "node:path";
import { todayISO } from "@/domain/dates";

export const APP_TIMEZONE = process.env.APP_TIMEZONE || "Africa/Tunis";
export const UPLOAD_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR || "./storage/receipts");

/** "Today" for business rules (due dates, overdue, forecast reference). */
export function today(): string {
  return todayISO(APP_TIMEZONE);
}
