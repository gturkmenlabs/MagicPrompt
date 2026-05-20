/**
 * Dummy Tracing Module (Opentelemetry removed)
 */

export const SR_ATTRS = {
  PROVIDER: 'sr.provider',
  DOMAIN: 'sr.domain',
  FRAMEWORK: 'sr.framework',
  CACHE_HIT: 'sr.cache_hit',
  TOKEN_INPUT: 'sr.token.input',
  TOKEN_OUTPUT: 'sr.token.output',
  COST_USD: 'sr.cost_usd',
  JUDGE_SCORE: 'sr.judge_score',
  RISK_LEVEL: 'sr.risk_level',
  RUN_ID: 'sr.run_id',
  PROMPT_ID: 'sr.prompt_id',
} as const;

export const SpanStatusCode = {
  UNSET: 0,
  OK: 1,
  ERROR: 2,
};

export interface Span {
  setAttribute(key: string, value: any): this;
  setStatus(status: { code: number; message?: string }): this;
  recordException(exception: any): void;
  end(): void;
}

const dummySpan: Span = {
  setAttribute: () => dummySpan,
  setStatus: () => dummySpan,
  recordException: () => { },
  end: () => { },
};

export async function withSpan<T>(
  _name: string,
  optionsOrFn: any | ((span: Span) => Promise<T>),
  maybeFn?: (span: Span) => Promise<T>,
): Promise<T> {
  const fn = typeof optionsOrFn === 'function' ? optionsOrFn : maybeFn!;
  return await fn(dummySpan);
}

export function withSpanSync<T>(
  _name: string,
  optionsOrFn: any | ((span: Span) => T),
  maybeFn?: (span: Span) => T,
): T {
  const fn = typeof optionsOrFn === 'function' ? optionsOrFn : maybeFn!;
  return fn(dummySpan);
}

export function getTracer(): any {
  return { startActiveSpan: () => { }, startSpan: () => dummySpan };
}

export function isTracingEnabled(): boolean {
  return false;
}
