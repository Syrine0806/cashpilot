"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  FlaskConical,
  Gauge,
  Landmark,
  Receipt,
  Repeat,
  ScrollText,
  Settings,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { NavGroup } from "./navigation";

const ICONS: Record<string, LucideIcon> = {
  dashboard: Gauge,
  invoices: FileText,
  contacts: Users,
  expenses: Receipt,
  treasury: Landmark,
  forecast: TrendingUp,
  simulations: FlaskConical,
  retainers: Repeat,
  audit: ScrollText,
  settings: Settings,
};

export function NavLinks({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-nav-muted">{group.label}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = ICONS[item.key];
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active ? "bg-nav-active text-white" : "text-nav-text hover:bg-nav-raised hover:text-white",
                    )}
                  >
                    {active && <span aria-hidden className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-[var(--brand)]" />}
                    {Icon && <Icon aria-hidden className={clsx("size-4 shrink-0", active ? "text-[#9fb0ff]" : "text-nav-muted group-hover:text-white")} />}
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge ? (
                      <span className="grid min-w-5 place-items-center rounded-full bg-negative px-1.5 text-[11px] font-semibold text-white" aria-label={`${item.badge} alertes`}>
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
