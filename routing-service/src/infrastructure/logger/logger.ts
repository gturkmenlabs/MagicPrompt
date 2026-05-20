import pino from 'pino';

export function createLogger(level: string) {
  return pino({
    level,
    base: { service: 'prompt-routing-service' },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}
