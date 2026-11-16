"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { NavLinks } from "./nav-links";
import type { NavGroup } from "./navigation";

/**
 * Slide-over navigation drawer for small screens. Rendered in a portal: the
 * sticky top bar uses backdrop-filter, which would otherwise trap the fixed drawer.
 */
export function MobileNav({ groups, header, footer }: { groups: NavGroup[]; header: ReactNode; footer: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        className="grid size-10 place-items-center rounded-lg border border-border bg-surface"
      >
        <Menu className="size-5" aria-hidden />
        <span className="sr-only">Ouvrir le menu</span>
      </button>
      {open &&
        createPortal(
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Fermer le menu" className="absolute inset-0 bg-[rgb(5_8_16/0.55)]" onClick={() => setOpen(false)} />
          <div id="mobile-menu" className="radar-grid absolute inset-y-0 left-0 flex w-[min(300px,85vw)] animate-rise flex-col bg-nav-bg text-nav-text shadow-pop">
            <div className="flex h-16 items-center justify-between px-4">
              {header}
              <button type="button" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-lg text-nav-text hover:bg-nav-raised" aria-label="Fermer le menu">
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-3 py-2">
              <NavLinks groups={groups} onNavigate={() => setOpen(false)} />
            </nav>
            <div className="border-t border-nav-border p-4">{footer}</div>
          </div>
        </div>,
          document.body,
        )}
    </div>
  );
}
