/**
 * Request ID middleware — attaches a unique ID to every request for audit trail correlation.
 * Uses crypto.randomUUID() (Node 19+), falls back to Date-based ID.
 */

import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

const REQUEST_ID_HEADER = 'X-Request-Id';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const existing = req.headers['x-request-id'];
  const requestId = typeof existing === 'string' && existing.length > 0
    ? existing
    : randomUUID();

  (req as any).requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}
