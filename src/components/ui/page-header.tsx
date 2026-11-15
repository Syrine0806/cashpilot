import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
  back,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  eyebrow?: string;
}) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back ? (
          <Link href={back.href} className="mb-2 inline-flex items-center gap-0.5 text-sm text-text-muted transition-colors hover:text-text">
            <ChevronLeft className="size-4" aria-hidden /> {back.label}
          </Link>
        ) : (
          eyebrow && <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand">{eyebrow}</p>
        )}
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-text">{title}</h1>
        {description && <div className="mt-1.5 max-w-3xl text-sm text-text-secondary">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
