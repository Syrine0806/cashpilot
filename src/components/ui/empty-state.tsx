import type { ReactNode } from "react";

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <svg aria-hidden viewBox="0 0 96 64" className="mb-2 h-14 w-24 text-border-strong">
        <path d="M4 52h88" stroke="currentColor" strokeWidth="2" strokeDasharray="4 6" strokeLinecap="round" />
        <path d="M20 44 L44 30 L58 36 L80 16" fill="none" stroke="var(--brand)" strokeOpacity="0.45" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="80" cy="16" r="4" fill="var(--brand)" fillOpacity="0.6" />
      </svg>
      <p className="font-medium text-text">{title}</p>
      {description && <p className="max-w-md text-sm text-text-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
