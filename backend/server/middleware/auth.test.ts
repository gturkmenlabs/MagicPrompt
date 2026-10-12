import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { optionalApiKey, requireApiKey } from './auth';
import { optionalAnyAuth, requireAnyAuth } from './supabaseAuth';

function createMockResponse() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return { status, json };
}

describe('API key header enforcement', () => {
  it('rejects query-string API key in requireApiKey', () => {
    process.env.API_KEYS = 'valid-key';
    process.env.DISABLE_API_KEY_AUTH = 'false';
    process.env.NODE_ENV = 'test';

    const req = {
      header: vi.fn().mockReturnValue(undefined),
      query: { 'x-api-key': 'valid-key' },
    } as unknown as Request;
    const res = createMockResponse() as unknown as Response;
    const next = vi.fn();

    requireApiKey(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect((res as any).status).toHaveBeenCalledWith(401);
    expect((res as any).json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'MISSING_API_KEY' }),
    );
  });

  it('accepts header API key in requireApiKey', () => {
    process.env.API_KEYS = 'valid-key';
    process.env.DISABLE_API_KEY_AUTH = 'false';
    process.env.NODE_ENV = 'test';

    const req = {
      header: vi.fn().mockReturnValue('valid-key'),
      query: {},
    } as unknown as Request;
    const res = createMockResponse() as unknown as Response;
    const next = vi.fn();

    requireApiKey(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect((req as any).apiKey).toBe('valid-key');
  });

  it('ignores query-string API key in optionalApiKey', () => {
    process.env.API_KEYS = 'valid-key';
    process.env.DISABLE_API_KEY_AUTH = 'false';
    process.env.NODE_ENV = 'test';

    const req = {
      header: vi.fn().mockReturnValue(undefined),
      query: { 'x-api-key': 'valid-key' },
    } as unknown as Request;
    const res = createMockResponse() as unknown as Response;
    const next = vi.fn();

    optionalApiKey(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect((req as any).apiKey).toBeUndefined();
  });

  it('requireAnyAuth rejects query-string API key without header', async () => {
    process.env.DISABLE_API_KEY_AUTH = 'false';
    process.env.NODE_ENV = 'test';

    const req = {
      headers: {},
      query: { 'x-api-key': 'valid-key' },
    } as unknown as Request;
    const res = createMockResponse() as unknown as Response;
    const next = vi.fn();

    await requireAnyAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect((res as any).status).toHaveBeenCalledWith(401);
    expect((res as any).json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'NO_AUTH' }),
    );
  });

  it('optionalAnyAuth does not promote query-string API key', async () => {
    process.env.DISABLE_API_KEY_AUTH = 'false';
    process.env.NODE_ENV = 'test';

    const req = {
      headers: {},
      query: { 'x-api-key': 'valid-key' },
    } as unknown as Request;
    const res = createMockResponse() as unknown as Response;
    const next = vi.fn();

    await optionalAnyAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect((req as any).apiKey).toBeUndefined();
  });
});
