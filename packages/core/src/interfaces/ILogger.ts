/**
 * ILogger - Platform-agnostic logging interface
 *
 * Provides a simple abstraction over the console, allowing platforms
 * to route engine logs to native logging services, files, or UI.
 */
export interface ILogger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  log(...args: unknown[]): void;
}
