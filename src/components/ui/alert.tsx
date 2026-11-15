import clsx from "clsx";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import type { ReactNode } from "react";

const TONES = {
  danger: { className: "border-negative/25 bg-negative-soft text-negative", Icon: OctagonAlert },
  warning: { className: "border-warning/25 bg-warning-soft text-warning", Icon: AlertTriangle },
  info: { className: "border-info/25 bg-info-soft text-info", Icon: Info },
  success: { className: "border-positive/25 bg-positive-soft text-positive", Icon: CheckCircle2 },
};

export function Alert({ tone = "info", title, children }: { tone?: keyof typeof TONES; title?: string; children?: ReactNode }) {
  const { className, Icon } = TONES[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={clsx("flex gap-3 rounded-xl border px-4 py-3 text-sm", className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={clsx("text-text-secondary", title && "mt-0.5")}>{children}</div>}
      </div>
    </div>
  );
}
