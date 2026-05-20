/**
 * PII redaction utility for audit logs and error messages.
 * Masks sensitive data before writing to logs.
 */

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const IP_REGEX = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const JWT_REGEX = /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g;
const API_KEY_REGEX = /(?:sk|pk|api)[_-][a-zA-Z0-9_-]{20,}/g;

export function redactPII(input: string): string {
  return input
    .replace(EMAIL_REGEX, '[EMAIL_REDACTED]')
    .replace(JWT_REGEX, '[JWT_REDACTED]')
    .replace(API_KEY_REGEX, '[API_KEY_REDACTED]')
    .replace(IP_REGEX, '[IP_REDACTED]');
}

export function redactObjectPII<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    const val = result[key];
    if (typeof val === 'string') {
      (result as Record<string, unknown>)[key] = redactPII(val);
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      (result as Record<string, unknown>)[key] = redactObjectPII(val as Record<string, unknown>);
    }
  }
  return result;
}
