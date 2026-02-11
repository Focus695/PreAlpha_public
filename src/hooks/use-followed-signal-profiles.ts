/**
 * Followed Signal Profiles Hook
 *
 * Fetches and caches profile data for followed wallets that appear in signals.
 * Uses 30-day cache to reduce API calls for frequently-viewed followed wallets.
 *
 * This is separate from the main address_profiles cache (24h) because:
 * - Followed wallet profiles change less frequently
 * - We want longer cache to reduce repeated API calls
 * - Independent lifecycle from leaderboard profiles
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { leaderboardApi } from '@/lib/api/endpoints/leaderboard';
import {
  getFollowedSignalProfiles,
  saveFollowedSignalProfiles,
  filterFollowedAddressesNeedingFetch,
  type FollowedSignalProfileData,
} from '@/lib/storage/db/followed-signal-profiles-db';

// ============================================================
// Types
// ============================================================

export interface UseFollowedSignalProfilesOptions {
  /** Followed addresses to check for profile data */
  addresses: readonly string[];
  /** Whether the hook is enabled */
  enabled?: boolean;
  /** Concurrent request limit */
  concurrency?: number;
}

export interface UseFollowedSignalProfilesResult {
  /** Map of address to profile data (userName, avatarUrl, twitterHandle, twitterUrl) */
  profiles: Map<string, FollowedSignalProfileData>;
  /** Whether currently fetching profiles */
  isLoading: boolean;
  /** Refetch all profiles (bypass cache) */
  refetch: () => Promise<void>;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Fetch profile for a single address from the leaderboard API
 */
async function fetchProfile(
  address: string
): Promise<{ address: string; profile: FollowedSignalProfileData } | null> {
  try {
    const response = await leaderboardApi.getUserProfile(address);

    if (response?.result) {
      const result = response.result;
      return {
        address,
        profile: {
          userName: result.userName,
          avatarUrl: result.avatarUrl,
          twitterHandle: result.xUsername,
          twitterUrl: result.xUsername
            ? `https://twitter.com/${result.xUsername.replace(/^@/, '')}`
            : undefined,
        },
      };
    }

    return null;
  } catch (error) {
    logger.warn(`[useFollowedSignalProfiles] Failed to fetch profile for ${address}:`, error);
    return null;
  }
}

/**
 * Batch fetch profiles with concurrency control
 */
async function fetchBatchProfiles(
  addresses: string[],
  concurrency: number = 3
): Promise<Map<string, FollowedSignalProfileData>> {
  const results = new Map<string, FollowedSignalProfileData>();

  // Process in batches to control concurrency
  for (let i = 0; i < addresses.length; i += concurrency) {
    const batch = addresses.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fetchProfile));

    for (const result of batchResults) {
      if (result) {
        results.set(result.address.toLowerCase(), result.profile);
      }
    }
  }

  return results;
}

// ============================================================
// Hook Implementation
// ============================================================

/**
 * Hook for fetching and caching followed wallet profiles in signals
 *
 * @example
 * ```tsx
 * const { profiles, isLoading } = useFollowedSignalProfiles({
 *   addresses: followedAddressesInSignals,
 *   enabled: true,
 *   concurrency: 3,
 * });
 *
 * const profile = profiles.get(address.toLowerCase());
 * ```
 */
export function useFollowedSignalProfiles({
  addresses,
  enabled = true,
  concurrency = 3,
}: UseFollowedSignalProfilesOptions): UseFollowedSignalProfilesResult {
  const [profiles, setProfiles] = useState<Map<string, FollowedSignalProfileData>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(false);
  const initializedRef = useRef(false);
  const prevAddressesRef = useRef<string[]>([]);

  // Check if addresses changed
  const addressesChanged =
    prevAddressesRef.current.length !== addresses.length ||
    prevAddressesRef.current.some((addr, i) => addr !== addresses[i]);

  /**
   * Main effect: load profiles from cache, then fetch missing ones
   */
  useEffect(() => {
    if (!enabled || addresses.length === 0) {
      // Avoid update loops by only clearing when state is non-empty.
      if (profiles.size > 0 || isLoading) {
        setProfiles(new Map());
        setIsLoading(false);
      }
      prevAddressesRef.current = [...addresses];
      initializedRef.current = false;
      return;
    }

    // Reset initialization when addresses change
    if (addressesChanged) {
      initializedRef.current = false;
      prevAddressesRef.current = [...addresses];
    }

    // Skip if already initialized
    if (initializedRef.current) {
      return;
    }

    let isMounted = true;

    async function loadProfiles() {
      try {
        setIsLoading(true);

        // Step 1: Load from cache first (instant display)
        const cachedMap = await getFollowedSignalProfiles(addresses);

        if (!isMounted) return;

        // Update state with cached data
        setProfiles(cachedMap);
        initializedRef.current = true;

        // Step 2: Find addresses that need fetching
        const needsFetch = await filterFollowedAddressesNeedingFetch(addresses);

        if (needsFetch.length === 0 || !isMounted) {
          setIsLoading(false);
          return;
        }

        // Step 3: Fetch missing profiles from API
        logger.debug(
          `[useFollowedSignalProfiles] Fetching ${needsFetch.length} missing profiles`
        );
        const fetchedProfiles = await fetchBatchProfiles(needsFetch, concurrency);

        if (!isMounted) return;

        // Step 4: Save fetched profiles to cache
        if (fetchedProfiles.size > 0) {
          await saveFollowedSignalProfiles(fetchedProfiles);
        }

        // Step 5: Update state with fetched data
        setProfiles((prev) => {
          const merged = new Map(prev);
          for (const [address, profile] of fetchedProfiles.entries()) {
            merged.set(address, profile);
          }
          return merged;
        });

        logger.debug(
          `[useFollowedSignalProfiles] Loaded ${cachedMap.size} from cache, fetched ${fetchedProfiles.size} from API`
        );
      } catch (error) {
        logger.error('[useFollowedSignalProfiles] Failed to load profiles:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProfiles();

    return () => {
      isMounted = false;
    };
  }, [addresses, enabled, addressesChanged, concurrency, profiles.size, isLoading]);

  /**
   * Refetch: bypass cache and reload all profiles
   */
  const refetch = useCallback(async () => {
    if (!enabled || addresses.length === 0) {
      return;
    }

    setIsLoading(true);
    initializedRef.current = false;

    try {
      // Clear cache for these addresses first
      const { clearFollowedSignalProfileCache } =
        await import('@/lib/storage/db/followed-signal-profiles-db');
      for (const address of addresses) {
        await clearFollowedSignalProfileCache(address);
      }

      // Fetch fresh data
      const fetchedProfiles = await fetchBatchProfiles([...addresses], concurrency);

      // Save to cache
      if (fetchedProfiles.size > 0) {
        await saveFollowedSignalProfiles(fetchedProfiles);
      }

      setProfiles(fetchedProfiles);
      initializedRef.current = true;

      logger.debug(
        `[useFollowedSignalProfiles] Refetched ${fetchedProfiles.size} profiles`
      );
    } catch (error) {
      logger.error('[useFollowedSignalProfiles] Failed to refetch:', error);
    } finally {
      setIsLoading(false);
    }
  }, [addresses, enabled, concurrency]);

  return {
    profiles,
    isLoading,
    refetch,
  };
}
