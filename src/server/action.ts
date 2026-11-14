import "server-only";
import { z } from "zod";
import { AppError, ValidationError } from "@/domain/errors";
import type { ActionState } from "@/lib/action-state";

const SECRET_FIELDS = /password/i;

/** Plain string values of a form, without secrets nor React internals. */
export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$") && !SECRET_FIELDS.test(key)) values[key] = value;
  }
  return values;
}

/** Validates input with a Zod schema, throwing a ValidationError with per-field messages. */
export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const flat = z.flattenError(result.error);
    const fieldErrors: Record<string, string[] | undefined> = { ...flat.fieldErrors };
    // Errors on nested paths (e.g. lines.0.unitPrice) are flattened to "lines.0.unitPrice".
    for (const issue of result.error.issues) {
      if (issue.path.length > 1) {
        const key = issue.path.join(".");
        fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
      }
    }
    throw new ValidationError(flat.formErrors[0] ?? "Certains champs sont invalides.", fieldErrors);
  }
  return result.data;
}

/**
 * Runs the body of a Server Action and converts expected errors into an
 * ActionState for the form. Unexpected errors (and Next.js redirects) are rethrown.
 */
export async function runAction(
  formData: FormData,
  body: () => Promise<ActionState | void>,
): Promise<ActionState> {
  try {
    return (await body()) ?? { ok: true };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { ok: false, error: error.message, fieldErrors: error.fieldErrors, values: formValues(formData) };
    }
    if (error instanceof AppError) {
      return { ok: false, error: error.message, values: formValues(formData) };
    }
    throw error;
  }
}
