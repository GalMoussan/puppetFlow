/**
 * Custom Error Types
 *
 * Error hierarchy for PuppetFlow API and agent pipeline.
 * Each error type maps to specific HTTP status codes.
 *
 * @module lib/errors
 */

/**
 * Base error for variety engine failures
 * HTTP: 400 Bad Request
 */
export class VarietyError extends Error {
  name = "VarietyError" as const;

  constructor(
    message: string,
    public readonly poolSize?: number,
    public readonly batchSize?: number
  ) {
    super(message);
  }
}

/**
 * Error for Anthropic API failures
 * HTTP: 503 Service Unavailable
 */
export class AnthropicError extends Error {
  name = "AnthropicError" as const;

  constructor(
    message: string,
    public readonly code?: string,
    public readonly retryAfter?: number
  ) {
    super(message);
  }
}

/**
 * Error for resource not found
 * HTTP: 404 Not Found
 */
export class NotFoundError extends Error {
  name = "NotFoundError" as const;

  constructor(message: string) {
    super(message);
  }
}

/**
 * Error for invalid request data
 * HTTP: 400 Bad Request
 */
export class BadRequestError extends Error {
  name = "BadRequestError" as const;

  constructor(
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

/**
 * Error for resource conflicts
 * HTTP: 409 Conflict
 */
export class ConflictError extends Error {
  name = "ConflictError" as const;

  constructor(message: string) {
    super(message);
  }
}

/**
 * Error for lint failures that cannot be repaired
 * HTTP: 422 Unprocessable Entity
 */
export class LintError extends Error {
  name = "LintError" as const;

  constructor(
    message: string,
    public readonly violations?: unknown[]
  ) {
    super(message);
  }
}

/**
 * Type guard to check if an error is one of our custom errors
 */
export function isCustomError(
  error: unknown
): error is
  | VarietyError
  | AnthropicError
  | NotFoundError
  | BadRequestError
  | ConflictError
  | LintError {
  return (
    error instanceof VarietyError ||
    error instanceof AnthropicError ||
    error instanceof NotFoundError ||
    error instanceof BadRequestError ||
    error instanceof ConflictError ||
    error instanceof LintError
  );
}

/**
 * Get HTTP status code for an error
 */
export function getErrorStatusCode(error: unknown): number {
  if (error instanceof NotFoundError) return 404;
  if (error instanceof BadRequestError) return 400;
  if (error instanceof VarietyError) return 400;
  if (error instanceof ConflictError) return 409;
  if (error instanceof AnthropicError) return 503;
  if (error instanceof LintError) return 422;
  return 500;
}

/**
 * Get error message safe for client response
 */
export function getErrorMessage(error: unknown): string {
  if (isCustomError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    // In production, don't expose internal error messages
    if (process.env.NODE_ENV === "production") {
      return "Internal server error";
    }
    return error.message;
  }
  return "Unknown error";
}
