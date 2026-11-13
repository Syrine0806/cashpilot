/**
 * Expected application errors. Their messages are safe to show to end users;
 * any other error is treated as unexpected and rethrown.
 */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** A business rule was violated (e.g. paying more than the remaining amount). */
export class BusinessRuleError extends AppError {}

/** The current user is not allowed to perform the operation. */
export class ForbiddenError extends AppError {
  constructor(message = "Vous n'avez pas les droits nécessaires pour cette action.") {
    super(message);
  }
}

/** The resource does not exist or does not belong to the current company. */
export class NotFoundError extends AppError {
  constructor(message = "Élément introuvable.") {
    super(message);
  }
}

/** Input validation failed; carries per-field messages for forms. */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly fieldErrors: Record<string, string[] | undefined> = {},
  ) {
    super(message);
  }
}
