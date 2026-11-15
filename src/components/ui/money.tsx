import clsx from "clsx";
import { formatMoney } from "@/domain/money";

/** Displays an amount in millimes; optionally colours it by sign. */
export function Money({
  value,
  signed = false,
  colored = false,
  className,
}: {
  value: number;
  signed?: boolean;
  colored?: boolean;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "tabular whitespace-nowrap",
        colored && value > 0 && "text-positive",
        colored && value < 0 && "text-negative",
        className,
      )}
    >
      {formatMoney(value, { signed })}
    </span>
  );
}
