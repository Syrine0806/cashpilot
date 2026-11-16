"use client";

import clsx from "clsx";
import { ArrowRight, CornerDownLeft, Search, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { CommandItem } from "./navigation";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * ⌘K / Ctrl+K command palette: jump to any page or start an action.
 * Built on the native <dialog> element (focus trap, Escape, backdrop for free).
 */
export function CommandPalette({ items }: { items: CommandItem[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const router = useRouter();
  const listId = useId();

  const results = items.filter((item) => normalize(`${item.label} ${item.hint ?? ""}`).includes(normalize(query.trim())));

  const open = useCallback(() => {
    setQuery("");
    setActive(0);
    dialogRef.current?.showModal();
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (dialogRef.current?.open) dialogRef.current.close();
        else open();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const go = (item: CommandItem | undefined) => {
    if (!item) return;
    dialogRef.current?.close();
    router.push(item.href);
  };

  const onInputKey = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(results[active]);
    }
  };

  return (
    <>
      {/* One palette, two triggers: a search bar on desktop, an icon on mobile. */}
      <button
        type="button"
        onClick={open}
        className="hidden h-10 w-full max-w-md items-center gap-2.5 rounded-xl border border-border bg-surface px-3 text-sm text-text-muted shadow-card transition-colors hover:border-border-strong lg:flex"
      >
        <Search className="size-4" aria-hidden />
        <span className="flex-1 text-left">Rechercher une page ou une action…</span>
        <kbd className="rounded-md border border-border bg-surface-muted px-1.5 py-0.5 font-mono text-[11px]">⌘K</kbd>
      </button>
      <button type="button" onClick={open} className="grid size-10 place-items-center rounded-lg border border-border bg-surface lg:hidden" aria-label="Rechercher">
        <Search className="size-4" aria-hidden />
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Palette de commandes"
        className="m-auto mt-[12vh] w-[min(640px,calc(100%-2rem))] overflow-hidden rounded-2xl border border-border bg-surface p-0 text-text shadow-pop"
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close(); // click on backdrop
        }}
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-4 text-text-muted" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKey}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results[active] ? `${listId}-${results[active].id}` : undefined}
            placeholder="Aller à… ou créer…"
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-text-muted focus-visible:outline-none"
          />
          <kbd className="rounded-md border border-border bg-surface-muted px-1.5 py-0.5 font-mono text-[11px] text-text-muted">Échap</kbd>
        </div>
        <ul id={listId} role="listbox" aria-label="Résultats" className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 && <li className="px-3 py-8 text-center text-sm text-text-muted">Aucun résultat pour « {query} »</li>}
          {results.map((item, index) => {
            const showSection = index === 0 || results[index - 1].section !== item.section;
            return (
              <li key={item.id} role="none">
                {showSection && <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">{item.section}</p>}
                <button
                  type="button"
                  id={`${listId}-${item.id}`}
                  role="option"
                  aria-selected={index === active}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => go(item)}
                  className={clsx(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm",
                    index === active ? "bg-brand-soft text-brand" : "text-text",
                  )}
                >
                  {item.section === "Actions" ? <Zap className="size-4 shrink-0" aria-hidden /> : <ArrowRight className="size-4 shrink-0" aria-hidden />}
                  <span className="flex-1">{item.label}</span>
                  {item.hint && <span className="text-xs text-text-muted">{item.hint}</span>}
                  {index === active && <CornerDownLeft className="size-3.5" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      </dialog>
    </>
  );
}
