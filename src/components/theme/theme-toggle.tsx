"use client";

import clsx from "clsx";
import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

type Theme = "light" | "dark" | "system";
const KEY = "cp-theme";
const EVENT = "cp-theme-change";

function readTheme(): Theme {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function apply(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

function subscribe(callback: () => void) {
  const media = matchMedia("(prefers-color-scheme: dark)");
  const onSystem = () => {
    if (readTheme() === "system") apply("system");
    callback();
  };
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  media.addEventListener("change", onSystem);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
    media.removeEventListener("change", onSystem);
  };
}

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Thème clair", Icon: Sun },
  { value: "system", label: "Thème du système", Icon: Monitor },
  { value: "dark", label: "Thème sombre", Icon: Moon },
];

/** Segmented light / system / dark switch. */
export function ThemeToggle({ tone = "nav" }: { tone?: "nav" | "surface" }) {
  // Server snapshot is "system" so the markup matches during hydration.
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system" as Theme);

  const choose = (value: Theme) => {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* storage unavailable: still apply for this page */
    }
    apply(value);
    window.dispatchEvent(new Event(EVENT));
  };

  return (
    <div
      role="radiogroup"
      aria-label="Thème"
      className={clsx(
        "inline-flex rounded-lg p-0.5",
        tone === "nav" ? "bg-nav-raised ring-1 ring-nav-border" : "bg-surface-muted ring-1 ring-border",
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={() => choose(value)}
          className={clsx(
            "grid size-7 place-items-center rounded-md transition-colors",
            theme === value
              ? tone === "nav"
                ? "bg-nav-active text-white"
                : "bg-surface text-text shadow-card"
              : tone === "nav"
                ? "text-nav-muted hover:text-white"
                : "text-text-muted hover:text-text",
          )}
        >
          <Icon className="size-3.5" aria-hidden />
        </button>
      ))}
    </div>
  );
}
