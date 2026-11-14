/** Shape returned by every Server Action used with `useActionState`. */
export interface ActionState {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Submitted values, used to refill the form after a validation error. */
  values?: Record<string, string>;
}

export const initialActionState: ActionState = {};
