export interface LocalAuthSessionRecord {
  email: string;
  name?: string;
  ts: number;
}

export const LOCAL_AUTH_STORAGE_KEY = 'sr_auth_session';
export const LOCAL_AUTH_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function readLocalAuthSession(): LocalAuthSessionRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LocalAuthSessionRecord;
  } catch {
    return null;
  }
}

export function writeLocalAuthSession(session: LocalAuthSessionRecord): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage failures in restricted environments.
  }
}

export function clearLocalAuthSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(LOCAL_AUTH_STORAGE_KEY);
  } catch {
    // Ignore storage failures in restricted environments.
  }
}

export function readValidLocalAuthSession(now: number = Date.now()): LocalAuthSessionRecord | null {
  const session = readLocalAuthSession();
  if (!session) return null;
  if (now - session.ts >= LOCAL_AUTH_SESSION_MAX_AGE_MS) {
    clearLocalAuthSession();
    return null;
  }
  return session;
}
