import clsx from "clsx";
import type { ReactNode } from "react";

export type Tone = "neutral" | "positive" | "negative" | "warning" | "info" | "brand";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-muted text-text-secondary ring-border",
  positive: "bg-positive-soft text-positive ring-positive/20",
  negative: "bg-negative-soft text-negative ring-negative/20",
  warning: "bg-warning-soft text-warning ring-warning/20",
  info: "bg-info-soft text-info ring-info/20",
  brand: "bg-brand-soft text-brand ring-brand/20",
};

/** Status pill: a coloured dot + label (colour is never the only signal). */
export function Badge({ tone = "neutral", children, dot = true }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", TONES[tone])}>
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
