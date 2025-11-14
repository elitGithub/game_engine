import type { ILogger } from '@engine/interfaces/ILogger';

/**
 * ConsoleLogger - Default ILogger implementation
 *
 * Forwards all log calls to the standard `console` object.
 * This is suitable for both browser and Node.js environments.
 */
export class ConsoleLogger implements ILogger {
  log(...args: unknown[]): void {
    console.log(...args);
  }

  warn(...args: unknown[]): void {
    console.warn(...args);
  }

  error(...args: unknown[]): void {
    console.error(...args);
  }
}