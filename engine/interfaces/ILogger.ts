/**
 * ILogger - Platform-agnostic logging interface
 *
 * Provides a simple abstraction over the console, allowing platforms
 * to route engine logs to native logging services, files, or UI.
 */
export interface ILogger {
  log(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
}