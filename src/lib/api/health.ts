/**
 * API Health State Management
 * Tracks API health status and implements fallback logic
 */

import { logger } from '../logger';
import { USE_MOCK, API_FAILURE_COOLDOWN_MS } from './config';

// ============================================================
// Types
// ============================================================

export type ApiResource =
  | 'leaderboard'
  | 'addressProfile'
  | 'traderPerformance'
  | 'userPositions'
  | 'userTrades'
  | 'userProfile'
  | 'userLabels'
  | 'volumeDistribution';

export type DataSourceTag = 'api' | 'mock';

interface HealthState {
  isHealthy: boolean;
  lastFailure: number | null;
}

// ============================================================
// Health State Tracking
// ============================================================

const apiHealthState: Record<ApiResource, HealthState> = {
  leaderboard: { isHealthy: true, lastFailure: null },
  addressProfile: { isHealthy: true, lastFailure: null },
  traderPerformance: { isHealthy: true, lastFailure: null },
  userPositions: { isHealthy: true, lastFailure: null },
  userTrades: { isHealthy: true, lastFailure: null },
  userProfile: { isHealthy: true, lastFailure: null },
  userLabels: { isHealthy: true, lastFailure: null },
  volumeDistribution: { isHealthy: true, lastFailure: null },
};

/**
 * Check if we should attempt to call the API for a resource
 * Returns true if healthy or cooldown has expired
 */
export function shouldAttemptApi(resource: ApiResource): boolean {
  const state = apiHealthState[resource];
  if (state.isHealthy || state.lastFailure === null) {
    return true;
  }
  return Date.now() - state.lastFailure >= API_FAILURE_COOLDOWN_MS;
}

/**
 * Mark an API resource as healthy
 */
export function markApiHealthy(resource: ApiResource): void {
  apiHealthState[resource] = { isHealthy: true, lastFailure: null };
}

/**
 * Mark an API resource as failed
 */
export function markApiFailure(resource: ApiResource): void {
  apiHealthState[resource] = { isHealthy: false, lastFailure: Date.now() };
}

/**
 * Tag a result with its data source (for debugging/analytics)
 */
export function tagResultWithSource<T>(result: T, source: DataSourceTag): T {
  if (result && typeof result === 'object') {
    Object.defineProperty(result, '__source', {
      value: source,
      enumerable: false,
    });
  }
  return result;
}

/**
 * Wrapper that attempts API call first, falls back to mock on failure
 * Implements health state tracking and cooldown logic
 */
export async function withMockFallback<T>(
  resource: ApiResource,
  fetcher: () => Promise<T>,
  fallback: () => T | Promise<T>
): Promise<T> {
  if (USE_MOCK) {
    const mockResult = await fallback();
    return tagResultWithSource(mockResult, 'mock');
  }

  if (shouldAttemptApi(resource)) {
    try {
      const result = await fetcher();
      markApiHealthy(resource);
      return tagResultWithSource(result, 'api');
    } catch (error) {
      logger.warn(`[apiClient] ${resource} API failed. Using mock data instead.`, error);
      markApiFailure(resource);
    }
  }

  const fallbackResult = await fallback();
  return tagResultWithSource(fallbackResult, 'mock');
}
