"use client";

import clsx from "clsx";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";

type ToastTone = "success" | "error";
interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

const ToastContext = createContext<((message: string, tone?: ToastTone) => void) | null>(null);

/** Shows a short-lived notification. Must be used below <Toaster>. */
export function useToast() {
  const push = use(ToastContext);
  if (!push) throw new Error("useToast must be used within <Toaster>");
  return push;
}

let nextId = 1;

/**
 * Notification centre. Messages live here (not in the form that triggered
 * them), so they stay visible even when that form unmounts after success.
 */
export function Toaster({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const id = nextId++;
      setToasts((list) => [...list.slice(-3), { id, tone, message }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext value={value}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:left-auto sm:right-6 sm:bottom-6">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={clsx(
              "pointer-events-auto flex w-full max-w-sm animate-toast items-start gap-3 rounded-xl border bg-surface px-4 py-3 text-sm text-text shadow-pop",
              toast.tone === "success" ? "border-positive/30" : "border-negative/30",
            )}
          >
            {toast.tone === "success" ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-positive" aria-hidden />
            ) : (
              <XCircle className="mt-0.5 size-4 shrink-0 text-negative" aria-hidden />
            )}
            <p className="flex-1">{toast.message}</p>
            <button type="button" onClick={() => dismiss(toast.id)} className="text-text-muted hover:text-text" aria-label="Fermer la notification">
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}
