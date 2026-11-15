"use client";

import clsx from "clsx";
import { createContext, use, useActionState, useEffect, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { useToast } from "../feedback/toaster";
import { Alert } from "../ui/alert";
import { Button, type ButtonVariant } from "../ui/button";

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

const FormStateContext = createContext<ActionState>(initialActionState);

/** Current form state (errors and submitted values) for the fields below an ActionForm. */
export function useFormState(): ActionState {
  return use(FormStateContext);
}

/**
 * Generic form bound to a Server Action. Handles pending state, error and
 * success messages, per-field errors and optional confirmation.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  submitVariant = "primary",
  confirm,
  className,
  inline = false,
  showSuccess = true,
}: {
  action: FormAction;
  children?: ReactNode;
  submitLabel?: string;
  submitVariant?: ButtonVariant;
  confirm?: string;
  className?: string;
  inline?: boolean;
  showSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, initialActionState);
  const toast = useToast();

  // Success messages are shown as toasts: they survive the re-render that may remove this form.
  useEffect(() => {
    if (showSuccess && state.ok && state.message) toast(state.message);
  }, [state, showSuccess, toast]);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
      className={clsx(inline ? "flex flex-wrap items-end gap-2" : "space-y-4", className)}
    >
      <FormStateContext value={state}>
        {state.error && !inline && <Alert tone="danger">{state.error}</Alert>}
        {children}
        {submitLabel && <SubmitButton variant={submitVariant} size={inline ? "sm" : "md"}>{submitLabel}</SubmitButton>}
        {inline && state.error && (
          <p role="alert" className="w-full text-sm text-negative">
            {state.error}
          </p>
        )}
      </FormStateContext>
    </form>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  size = "md",
  className,
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "md";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} disabled={pending} aria-busy={pending} className={className}>
      {pending && <span aria-hidden className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </Button>
  );
}
