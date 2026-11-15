import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

/** Horizontally scrollable table wrapper (responsive on small screens). */
export function Table({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}

export function Th({ className, align = "left", ...props }: ComponentProps<"th"> & { align?: "left" | "right" | "center" }) {
  return (
    <th
      scope="col"
      className={clsx(
        "border-b border-border bg-surface-muted/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted",
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, align = "left", ...props }: ComponentProps<"td"> & { align?: "left" | "right" | "center" }) {
  return (
    <td
      className={clsx(
        "border-b border-border px-4 py-3 align-middle text-text",
        align === "right" ? "whitespace-nowrap text-right tabular" : align === "center" ? "text-center" : "text-left",
        className,
      )}
      {...props}
    />
  );
}
