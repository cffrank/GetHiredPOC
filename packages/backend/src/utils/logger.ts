/**
 * Structured JSON logger for Cloudflare Workers
 *
 * Produces JSON-structured log entries queryable in Cloudflare Workers Logs.
 * Uses console.* methods directly — no external logging libraries needed in Workers.
 *
 * Usage:
 *   const logger = createLogger('my-module');
 *   logger.info('Cache hit', { cacheKey });
 *   logger.error('Failed', { error: String(err) });
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  module: string;
  message: string;
  [key: string]: unknown;
}

export function createLogger(module: string) {
  return {
    info: (message: string, data?: Record<string, unknown>): void => {
      const entry: LogEntry = { level: 'info', module, message, ...data };
      console.log(JSON.stringify(entry));
    },
    warn: (message: string, data?: Record<string, unknown>): void => {
      const entry: LogEntry = { level: 'warn', module, message, ...data };
      console.warn(JSON.stringify(entry));
    },
    error: (message: string, data?: Record<string, unknown>): void => {
      const entry: LogEntry = { level: 'error', module, message, ...data };
      console.error(JSON.stringify(entry));
    },
    debug: (message: string, data?: Record<string, unknown>): void => {
      const entry: LogEntry = { level: 'debug', module, message, ...data };
      console.log(JSON.stringify(entry));
    },
  };
}
