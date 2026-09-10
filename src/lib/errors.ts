/**
 * Domain error hierarchy.
 * All application errors extend AppError so they can be caught uniformly
 * in API route handlers and converted to consistent HTTP responses.
 */

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}

// ─── Auth & Access ────────────────────────────────────────────────────────────

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, "UNAUTHORIZED", 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(message, "FORBIDDEN", 403);
    this.name = "ForbiddenError";
  }
}

// ─── Resource ─────────────────────────────────────────────────────────────────

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} '${id}' not found` : `${resource} not found`,
      "NOT_FOUND",
      404
    );
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, "CONFLICT", 409);
    this.name = "ConflictError";
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly fields?: Record<string, string[]>
  ) {
    super(message, "VALIDATION_ERROR", 422);
    this.name = "ValidationError";
  }
}

// ─── Domain Logic ─────────────────────────────────────────────────────────────

export class InvalidStateTransitionError extends AppError {
  constructor(from: string, to: string, reason?: string) {
    super(
      reason
        ? `Cannot transition from ${from} to ${to}: ${reason}`
        : `Cannot transition from ${from} to ${to}`,
      "INVALID_STATE_TRANSITION",
      422
    );
    this.name = "InvalidStateTransitionError";
  }
}

export class FeatureDisabledError extends AppError {
  constructor(feature: string) {
    super(`Feature '${feature}' is currently disabled`, "FEATURE_DISABLED", 403);
    this.name = "FeatureDisabledError";
  }
}

export class SystemModeError extends AppError {
  constructor(mode: string, action: string) {
    super(
      `Action '${action}' is not permitted in system mode '${mode}'`,
      "SYSTEM_MODE_RESTRICTION",
      503
    );
    this.name = "SystemModeError";
  }
}

export class DuplicateError extends AppError {
  constructor(resource: string, field?: string) {
    super(
      field
        ? `A ${resource} with this ${field} already exists`
        : `Duplicate ${resource}`,
      "DUPLICATE",
      409
    );
    this.name = "DuplicateError";
  }
}

export class RateLimitError extends AppError {
  constructor() {
    super("Too many requests. Please try again later.", "RATE_LIMITED", 429);
    this.name = "RateLimitError";
  }
}

// ─── Type Guards ──────────────────────────────────────────────────────────────

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
