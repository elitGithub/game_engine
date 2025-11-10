export interface ITimerProvider {
  /**
   * Executes a callback after a specified delay.
   * @param callback The function to execute.
   * @param ms The delay in milliseconds.
   * @returns A handle that can be used with clearTimeout.
   */
  setTimeout(callback: () => void, ms: number): unknown;

  /**
   * Cancels a timer set with setTimeout.
   * @param id The handle returned by setTimeout.
   */
  clearTimeout(id: unknown): void;
}
