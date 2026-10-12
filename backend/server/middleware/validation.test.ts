import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { validateBody } from './validation';

function createMockResponse() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return { status, json };
}

describe('validateBody middleware', () => {
  it('returns 400 with validation details for Zod v4 issues', () => {
    const middleware = validateBody(z.object({ intent: z.string().min(1) }));
    const req = { body: { intent: '' } } as Request;
    const res = createMockResponse() as unknown as Response;
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect((res as any).status).toHaveBeenCalledWith(400);
    expect((res as any).json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          details: expect.arrayContaining([
            expect.objectContaining({ path: 'intent' }),
          ]),
        }),
      }),
    );
  });
});
