/**
 * API Client
 *
 * This file re-exports from the modular API structure for backwards compatibility.
 * New code should import directly from '@/lib/api' instead.
 *
 * @deprecated Import from '@/lib/api' instead
 */

export { apiClient } from './api';
export * from './api/types';
export type { AddressProfile, LeaderboardEntry, Signal, ApiResponse, TimeRange } from '@/types';
