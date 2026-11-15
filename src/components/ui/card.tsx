import clsx from "clsx";
import type { ReactNode } from "react";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={clsx("min-w-0 animate-rise overflow-hidden rounded-2xl border border-border bg-surface shadow-card", className)}>
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  actions,
  icon,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        {icon && <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">{icon}</span>}
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-text">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-text-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("px-5 py-4", className)}>{children}</div>;
}
