/**
 * Standardized API error response utility.
 * All API errors should use this format for consistency.
 */

import type { Response } from 'express';

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  toJSON(): ApiErrorBody {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details !== undefined ? { details: this.details } : {}),
      },
    };
  }

  send(res: Response): void {
    res.status(this.statusCode).json(this.toJSON());
  }
}

// ── Factory helpers ─────────────────────────────────────────────────────────

export const Errors = {
  badRequest(message: string, details?: unknown) {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  },
  unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED') {
    return new ApiError(401, code, message);
  },
  forbidden(message = 'Insufficient permissions', code = 'FORBIDDEN') {
    return new ApiError(403, code, message);
  },
  notFound(message = 'Resource not found') {
    return new ApiError(404, 'NOT_FOUND', message);
  },
  conflict(message: string) {
    return new ApiError(409, 'CONFLICT', message);
  },
  tooManyRequests(message = 'Rate limit exceeded') {
    return new ApiError(429, 'RATE_LIMIT_EXCEEDED', message);
  },
  internal(message = 'Internal server error') {
    return new ApiError(500, 'INTERNAL_ERROR', message);
  },
  serviceUnavailable(message = 'Service temporarily unavailable') {
    return new ApiError(503, 'SERVICE_UNAVAILABLE', message);
  },
  validation(details: unknown) {
    return new ApiError(400, 'VALIDATION_ERROR', 'Validation failed', details);
  },
} as const;

/**
 * Express error handler middleware that catches ApiError instances.
 * Place after all routes.
 */
export function apiErrorHandler(
  err: unknown,
  _req: unknown,
  res: Response,
  next: (err?: unknown) => void,
): void {
  if (err instanceof ApiError) {
    err.send(res);
    return;
  }

  // JSON parse errors
  if (err instanceof SyntaxError && 'body' in err) {
    Errors.badRequest('Invalid JSON payload').send(res);
    return;
  }

  // Unknown errors
  console.error('[UnhandledError]', err);
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : (err as Error)?.message ?? 'Unknown error';
  Errors.internal(message).send(res);
}
