/**
 * Leaderboard Cache Data Access Layer
 *
 * Manages enriched leaderboard data in IndexedDB.
 * Replaces the old localStorage-based leaderboard-cache.ts
 *
 * Cache duration: 12 hours
 */

import { logger } from '@/lib/logger';
import { db, type LeaderboardCacheEntry } from '../database';
import type { EnrichedLeaderboardApiEntry } from '@/lib/api/types';

// ============================================================
// Constants
// ============================================================

/** Cache duration: 24 hours in milliseconds */
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

/** Supported time ranges */
export type LeaderboardTimeRange = '1d' | '7d' | '30d' | 'all';

// ============================================================
// Types
// ============================================================

/** Cache validation result */
export interface CacheValidation {
  isValid: boolean;
  data?: EnrichedLeaderboardApiEntry[];
  reason?: 'expired' | 'missing' | 'corrupted';
}

/** Cache metadata for debugging */
export interface CacheMetadata {
  timestamp: number;
  expiresAt: number;
  isExpired: boolean;
  dataLength: number;
}

// ============================================================
// Public API
// ============================================================

/**
 * Load leaderboard data from cache
 *
 * @param timeRange - Time range to load (1d, 7d, 30d, all)
 * @returns Cache validation result with data if valid
 */
export async function loadFromCache(
  timeRange: LeaderboardTimeRange
): Promise<CacheValidation> {
  try {
    const entry = await db.leaderboard_cache.where('timeRange').equals(timeRange).first();

    if (!entry) {
      return { isValid: false, reason: 'missing' };
    }

    // Validate structure
    if (!entry.data || !Array.isArray(entry.data)) {
      logger.warn('[leaderboardDB] Corrupted cache structure, clearing');
      await clearCache(timeRange);
      return { isValid: false, reason: 'corrupted' };
    }

    // Check expiration
    const now = Date.now();
    if (entry.expiresAt < now) {
      logger.debug('[leaderboardDB] Cache expired for', timeRange);
      await clearCache(timeRange);
      return { isValid: false, reason: 'expired' };
    }

    logger.debug(`[leaderboardDB] Cache hit for ${timeRange}, ${entry.data.length} entries`);
    return {
      isValid: true,
      data: entry.data,
    };
  } catch (error) {
    logger.error('[leaderboardDB] Error loading cache:', error);
    return { isValid: false, reason: 'corrupted' };
  }
}

/**
 * Save leaderboard data to cache
 *
 * @param timeRange - Time range for the data (1d, 7d, 30d, all)
 * @param data - Enriched leaderboard entries to cache
 */
export async function saveToCache(
  timeRange: LeaderboardTimeRange,
  data: EnrichedLeaderboardApiEntry[]
): Promise<void> {
  try {
    const now = Date.now();

    const entry: LeaderboardCacheEntry = {
      timeRange,
      data,
      createdAt: now,
      expiresAt: now + CACHE_DURATION_MS,
    };

    await db.leaderboard_cache.put(entry);
    logger.debug(
      `[leaderboardDB] Saved cache for ${timeRange}, expires at ${new Date(entry.expiresAt).toISOString()}`
    );
  } catch (error) {
    logger.error('[leaderboardDB] Failed to save cache:', error);
  }
}

/**
 * Clear cache for a specific time range or all caches
 *
 * @param timeRange - Time range to clear, or undefined to clear all
 */
export async function clearCache(timeRange?: LeaderboardTimeRange): Promise<void> {
  try {
    if (timeRange) {
      await db.leaderboard_cache.where('timeRange').equals(timeRange).delete();
      logger.debug(`[leaderboardDB] Cleared cache for ${timeRange}`);
    } else {
      await db.leaderboard_cache.clear();
      logger.debug('[leaderboardDB] Cleared all caches');
    }
  } catch (error) {
    logger.error('[leaderboardDB] Error clearing cache:', error);
  }
}

/**
 * Get cache metadata for debugging
 *
 * @param timeRange - Time range to inspect
 * @returns Cache metadata or null if not cached
 */
export async function getCacheMetadata(
  timeRange: LeaderboardTimeRange
): Promise<CacheMetadata | null> {
  try {
    const entry = await db.leaderboard_cache.where('timeRange').equals(timeRange).first();

    if (!entry) return null;

    const now = Date.now();
    return {
      timestamp: entry.createdAt,
      expiresAt: entry.expiresAt,
      isExpired: entry.expiresAt < now,
      dataLength: entry.data.length,
    };
  } catch (error) {
    logger.error('[leaderboardDB] Error getting metadata:', error);
    return null;
  }
}

/**
 * Cleanup expired leaderboard cache entries
 *
 * @returns Number of entries removed
 */
export async function cleanupExpiredLeaderboard(): Promise<number> {
  try {
    const now = Date.now();
    const expiredIds: number[] = [];

    // Collect expired entry IDs
    await db.leaderboard_cache
      .where('expiresAt')
      .below(now)
      .each((entry) => {
        if (entry.id !== undefined) {
          expiredIds.push(entry.id);
        }
      });

    // Batch delete expired entries (more efficient and reliable than individual deletes)
    if (expiredIds.length > 0) {
      await db.leaderboard_cache.bulkDelete(expiredIds);
      logger.debug(`[leaderboardDB] Cleaned up ${expiredIds.length} expired caches`);
    }

    return expiredIds.length;
  } catch (error) {
    logger.error('[leaderboardDB] Error during cleanup:', error);
    return 0;
  }
}

/**
 * Batch save multiple time ranges at once
 *
 * @param caches - Record of timeRange to data entries
 */
export async function batchSaveToCache(
  caches: Partial<Record<LeaderboardTimeRange, EnrichedLeaderboardApiEntry[]>>
): Promise<void> {
  try {
    const now = Date.now();
    const entries: LeaderboardCacheEntry[] = [];

    for (const [timeRange, data] of Object.entries(caches)) {
      if (data) {
        entries.push({
          timeRange: timeRange as LeaderboardTimeRange,
          data,
          createdAt: now,
          expiresAt: now + CACHE_DURATION_MS,
        });
      }
    }

    if (entries.length > 0) {
      await db.leaderboard_cache.bulkPut(entries);
      logger.debug(`[leaderboardDB] Batch saved ${entries.length} cache entries`);
    }
  } catch (error) {
    logger.error('[leaderboardDB] Failed to batch save cache:', error);
  }
}

/**
 * Get all cached time ranges
 *
 * @returns Array of time ranges that have valid (non-expired) cache
 */
export async function getValidTimeRanges(): Promise<LeaderboardTimeRange[]> {
  try {
    const now = Date.now();
    const validRanges: LeaderboardTimeRange[] = [];

    await db.leaderboard_cache.each((entry) => {
      if (entry.expiresAt > now) {
        validRanges.push(entry.timeRange);
      }
    });

    return validRanges;
  } catch (error) {
    logger.error('[leaderboardDB] Error getting valid time ranges:', error);
    return [];
  }
}
