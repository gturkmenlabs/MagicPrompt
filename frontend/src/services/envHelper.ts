/**
 * Universal env accessor — works in both Vite (import.meta.env) and Node (process.env).
 */
export function getEnv(key: string, fallback = ''): string {
  try {
    // Vite (browser)
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return (import.meta.env as Record<string, string>)[key] ?? fallback;
    }
  } catch {}
  try {
    // Node.js (server)
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] ?? fallback;
    }
  } catch {}
  return fallback;
}
