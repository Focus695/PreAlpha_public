/**
 * API Configuration
 * Environment variable handling and API base URL configuration
 */

// ============================================================
// Environment Variable Readers
// ============================================================

function readProcessEnv(key: string): string | undefined {
  if (typeof process !== 'undefined' && typeof process.env !== 'undefined') {
    const envRecord = process.env as Record<string, string | undefined>;
    const value = envRecord[key];
    if (typeof value === 'string') {
      return value;
    }
  }
  return undefined;
}

function readImportMetaEnv(key: string): string | undefined {
  if (typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined') {
    const envRecord = import.meta.env as Record<string, string | undefined>;
    const value = envRecord[key];
    if (typeof value === 'string') {
      return value;
    }
  }
  return undefined;
}

function readWindowEnv(key: string): string | undefined {
  if (typeof window !== 'undefined' && window.__PREALPHA_ENV__) {
    const envRecord = window.__PREALPHA_ENV__;
    const value = envRecord[key];
    if (typeof value === 'string') {
      return value;
    }
  }
  return undefined;
}

/**
 * Get environment variable value from multiple possible sources
 * Tries: process.env → import.meta.env → window.__PREALPHA_ENV__
 */
export function getEnvValue(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = readProcessEnv(key) ?? readImportMetaEnv(key) ?? readWindowEnv(key);
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

// ============================================================
// API Configuration
// ============================================================

/** Default to false - use real API, fallback to mock on failure */
const FORCE_MOCK_DEFAULT = false;

const FORCE_MOCK_FLAG =
  getEnvValue('NEXT_PUBLIC_FORCE_MOCK', 'VITE_FORCE_MOCK', 'REACT_APP_FORCE_MOCK') ??
  (FORCE_MOCK_DEFAULT ? 'true' : 'false');

/** Whether to force mock data (controlled via environment variable) */
export const USE_MOCK = FORCE_MOCK_FLAG === 'true';

/** Cooldown period before retrying unhealthy APIs (30 seconds) */
export const API_FAILURE_COOLDOWN_MS = 30 * 1000;
