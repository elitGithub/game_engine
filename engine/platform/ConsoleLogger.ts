import type { ILogger } from '@engine/interfaces/ILogger';

/**
 * ConsoleLogger - Default ILogger implementation
 *
 * Forwards all log calls to the standard `console` object.
 * This is suitable for both browser and Node.js environments.
 */
export class ConsoleLogger implements ILogger {
  log(...args: any[]): void {
    console.log(...args);
  }

  warn(...args: any[]): void {
    console.warn(...args);
  }

  error(...args: any[]): void {
    console.error(...args);
  }
}