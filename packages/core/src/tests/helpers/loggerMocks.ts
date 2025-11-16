// engine/tests/helpers/loggerMocks.ts
import { vi } from 'vitest';
import type { ILogger } from '@game-engine/core/interfaces';

/**
 * Creates a fully-implemented mock ILogger with all methods mocked.
 * This ensures all test files use a consistent mock that
 * adheres to the ILogger interface.
 */
export const createMockLogger = (): ILogger => ({
  debug: vi.fn(),
  info: vi.fn(),
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});