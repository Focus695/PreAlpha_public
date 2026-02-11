/**
 * Logger Utility
 *
 * Environment-aware logging utility that automatically disables debug logs
 * in production builds. Supports debug, info, warn, and error log levels.
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.debug('[tag]', 'Debug message', data);
 *   logger.info('[tag]', 'Info message');
 *   logger.warn('[tag]', 'Warning message');
 *   logger.error('[tag]', 'Error message', error);
 */

/**
 * Get the current environment mode
 * Checks multiple sources: process.env, import.meta.env
 * Defaults to 'development' for safety
 */
function getEnvMode(): 'development' | 'production' {
  // Check process.env (Node.js/Bun runtime, or build-time injection)
  if (typeof process !== 'undefined' && typeof process.env !== 'undefined') {
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === 'production' || nodeEnv === 'development') {
      return nodeEnv;
    }
  }

  // Check import.meta.env (Bun build environment)
  if (typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined') {
    const metaEnv = (import.meta.env as { NODE_ENV?: string }).NODE_ENV;
    if (metaEnv === 'production' || metaEnv === 'development') {
      return metaEnv;
    }
  }

  // Default to development for safety (better to show logs than hide them in dev)
  return 'development';
}

/**
 * Check if we're in development mode
 */
function isDevelopment(): boolean {
  return getEnvMode() === 'development';
}

/**
 * Logger interface with different log levels
 */
interface Logger {
  /**
   * Debug logs - only shown in development
   * These are automatically disabled in production builds
   */
  debug(...args: unknown[]): void;

  /**
   * Info logs - shown in all environments
   * Use for important informational messages
   */
  info(...args: unknown[]): void;

  /**
   * Warning logs - shown in all environments
   * Use for warnings that should be visible in production
   */
  warn(...args: unknown[]): void;

  /**
   * Error logs - shown in all environments
   * Use for errors that should always be logged
   */
  error(...args: unknown[]): void;
}

/**
 * Logger implementation
 */
const logger: Logger = {
  debug(...args: unknown[]): void {
    // In production, debug logs are completely disabled
    // This check allows bundlers to tree-shake debug calls in production builds
    if (!isDevelopment()) {
      return;
    }
    console.debug(...args);
  },

  info(...args: unknown[]): void {
    console.info(...args);
  },

  warn(...args: unknown[]): void {
    console.warn(...args);
  },

  error(...args: unknown[]): void {
    console.error(...args);
  },
};

export { logger, type Logger };
