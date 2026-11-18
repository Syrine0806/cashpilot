import { formatShortDate } from "@/domain/dates";
import { formatMoney } from "@/domain/money";

export const toDinars = (millimes: number) => millimes / 1000;

/** Compact axis label: "12 k", "-3 k", "850". */
export function axisMoney(dinars: number): string {
  const abs = Math.abs(dinars);
  if (abs >= 1000) return `${(dinars / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} k`;
  return dinars.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
}

export const tooltipMoney = (dinars: number) => formatMoney(Math.round(dinars * 1000));
export const axisDate = (iso: string) => formatShortDate(iso);
