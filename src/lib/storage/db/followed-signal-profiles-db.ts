/**
 * Followed Signal Profile Data Access Layer
 *
 * Manages profile data for followed wallets that appear in signals.
 * Caches userName, avatarUrl, and twitterHandle with 30-day expiration.
 *
 * This is separate from address_profiles (24h cache) because:
 * - Followed wallet profiles change less frequently
 * - Longer cache reduces API calls for frequently-viewed signals
 * - Independent cache lifecycle from leaderboard profiles
 */

import { logger } from '@/lib/logger';
import { db } from '../database';

// ============================================================
// Types
// ============================================================

/**
 * Followed signal profile entry for IndexedDB storage
 * Lightweight profile with display fields needed for signals
 */
export interface FollowedSignalProfileEntry {
  /** Primary key - lowercase wallet address */
  address: string;
  /** Display username */
  userName?: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Twitter handle (without @) */
  twitterHandle?: string;
  /** Twitter URL (derived from handle) */
  twitterUrl?: string;
  /** Unix timestamp when created */
  createdAt: number;
  /** Unix timestamp when expires (30 days) */
  expiresAt: number;
}

/**
 * Partial profile data for display in signals
 */
export interface FollowedSignalProfileData {
  userName?: string;
  avatarUrl?: string;
  twitterHandle?: string;
  twitterUrl?: string;
}

// ============================================================
// Constants
// ============================================================

/** Cache duration: 30 days in milliseconds */
const CACHE_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

// ============================================================
// Helper Functions
// ============================================================

/**
 * Normalize address for IndexedDB storage (lowercase, keep 0x prefix)
 */
function normalizeAddressForCache(address: string): string {
  return address.toLowerCase();
}

/**
 * Build Twitter URL from handle
 */
function buildTwitterUrl(handle?: string): string | undefined {
  if (!handle) return undefined;
  const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;
  return `https://twitter.com/${cleanHandle}`;
}

/**
 * Convert profile data to entry with expiration
 */
function profileToEntry(
  address: string,
  profile: FollowedSignalProfileData
): FollowedSignalProfileEntry {
  const now = Date.now();
  const twitterHandle = profile.twitterHandle;
  return {
    address: normalizeAddressForCache(address),
    userName: profile.userName,
    avatarUrl: profile.avatarUrl,
    twitterHandle: twitterHandle,
    twitterUrl: profile.twitterUrl ?? buildTwitterUrl(twitterHandle),
    createdAt: now,
    expiresAt: now + CACHE_DURATION_MS,
  };
}

// ============================================================
// Public API
// ============================================================

/**
 * Get followed signal profile from cache
 *
 * @param address - Wallet address to fetch from cache
 * @returns Profile data if cache is valid, null otherwise
 */
export async function getFollowedSignalProfile(
  address: string
): Promise<FollowedSignalProfileData | null> {
  try {
    const normalized = normalizeAddressForCache(address);
    const entry = await db.followed_signal_profiles.get(normalized);

    if (!entry) {
      return null;
    }

    // Check expiration
    const now = Date.now();
    if (entry.expiresAt < now) {
      // Remove expired entry
      await db.followed_signal_profiles.delete(normalized);
      logger.debug('[followedSignalProfilesDB] Cache expired for', address);
      return null;
    }

    logger.debug('[followedSignalProfilesDB] Cache hit for', address);
    return {
      userName: entry.userName,
      avatarUrl: entry.avatarUrl,
      twitterHandle: entry.twitterHandle,
      twitterUrl: entry.twitterUrl,
    };
  } catch (error) {
    logger.error('[followedSignalProfilesDB] Error reading cache:', error);
    return null;
  }
}

/**
 * Batch get multiple profiles from cache
 *
 * @param addresses - Array of wallet addresses to fetch
 * @returns Map of address to profile data (only cached addresses included)
 */
export async function getFollowedSignalProfiles(
  addresses: readonly string[]
): Promise<Map<string, FollowedSignalProfileData>> {
  const result = new Map<string, FollowedSignalProfileData>();
  const now = Date.now();

  if (addresses.length === 0) {
    return result;
  }

  try {
    const normalizedAddresses = addresses.map(normalizeAddressForCache);
    const entries = await db.followed_signal_profiles
      .where('address')
      .anyOf(normalizedAddresses)
      .toArray();

    const expiredKeys: string[] = [];
    for (const entry of entries) {
      if (entry.expiresAt > now) {
        // Find original address by matching normalized version
        const originalAddress = addresses.find(
          (addr) => normalizeAddressForCache(addr) === entry.address
        );
        if (originalAddress) {
          result.set(originalAddress.toLowerCase(), {
            userName: entry.userName,
            avatarUrl: entry.avatarUrl,
            twitterHandle: entry.twitterHandle,
            twitterUrl: entry.twitterUrl,
          });
        }
      } else {
        expiredKeys.push(entry.address);
      }
    }

    // Batch delete expired entries
    if (expiredKeys.length > 0) {
      await db.followed_signal_profiles.bulkDelete(expiredKeys);
      logger.debug(
        `[followedSignalProfilesDB] Removed ${expiredKeys.length} expired entries during batch get`
      );
    }

    logger.debug(
      `[followedSignalProfilesDB] Batch cache hit: ${result.size}/${addresses.length}`
    );
  } catch (error) {
    logger.error('[followedSignalProfilesDB] Error in batch get:', error);
  }

  return result;
}

/**
 * Save followed signal profile to cache
 *
 * @param address - Wallet address
 * @param profile - Profile data to cache
 */
export async function saveFollowedSignalProfile(
  address: string,
  profile: FollowedSignalProfileData
): Promise<void> {
  try {
    const entry = profileToEntry(address, profile);
    await db.followed_signal_profiles.put(entry);
    logger.debug(
      `[followedSignalProfilesDB] Saved cache for ${address}, expires at ${new Date(entry.expiresAt).toISOString()}`
    );
  } catch (error) {
    logger.error('[followedSignalProfilesDB] Failed to save cache:', error);
  }
}

/**
 * Batch save multiple profiles to cache
 *
 * @param profiles - Map of address to profile data
 * @returns Number of entries saved
 */
export async function saveFollowedSignalProfiles(
  profiles: Map<string, FollowedSignalProfileData>
): Promise<number> {
  if (profiles.size === 0) {
    return 0;
  }

  try {
    const entries: FollowedSignalProfileEntry[] = [];
    for (const [address, profile] of profiles.entries()) {
      entries.push(profileToEntry(address, profile));
    }

    await db.followed_signal_profiles.bulkPut(entries);

    const expiresAt = Date.now() + CACHE_DURATION_MS;
    logger.debug(
      `[followedSignalProfilesDB] Batch saved ${entries.length} profiles to cache, expires at ${new Date(expiresAt).toISOString()}`
    );

    return entries.length;
  } catch (error) {
    logger.error('[followedSignalProfilesDB] Failed to batch save profiles:', error);
    return 0;
  }
}

/**
 * Filter addresses that need fetching (not in cache or expired)
 *
 * @param addresses - Array of wallet addresses to check
 * @returns Array of addresses that need to be fetched
 */
export async function filterFollowedAddressesNeedingFetch(
  addresses: readonly string[]
): Promise<string[]> {
  const needsFetch: string[] = [];
  const now = Date.now();

  if (addresses.length === 0) {
    return needsFetch;
  }

  try {
    const normalizedAddresses = addresses.map(normalizeAddressForCache);
    const entries = await db.followed_signal_profiles
      .where('address')
      .anyOf(normalizedAddresses)
      .toArray();

    const cachedValid = new Set<string>();
    for (const entry of entries) {
      if (entry.expiresAt > now) {
        cachedValid.add(entry.address);
      }
    }

    for (let i = 0; i < addresses.length; i++) {
      const normalized = normalizedAddresses[i];
      if (!cachedValid.has(normalized)) {
        needsFetch.push(addresses[i]);
      }
    }

    logger.debug(
      `[followedSignalProfilesDB] Addresses needing fetch: ${needsFetch.length}/${addresses.length}`
    );
  } catch (error) {
    logger.error('[followedSignalProfilesDB] Error filtering addresses:', error);
    return [...addresses];
  }

  return needsFetch;
}

/**
 * Check if profile cache exists and is valid for an address
 *
 * @param address - Wallet address to check
 * @returns true if cache exists and is not expired
 */
export async function isFollowedSignalProfileValid(address: string): Promise<boolean> {
  try {
    const normalized = normalizeAddressForCache(address);
    const entry = await db.followed_signal_profiles.get(normalized);

    if (!entry) {
      return false;
    }

    return entry.expiresAt > Date.now();
  } catch {
    return false;
  }
}

/**
 * Clear profile cache for a specific address or all profiles
 *
 * @param address - Optional address to clear, or undefined to clear all
 */
export async function clearFollowedSignalProfileCache(address?: string): Promise<void> {
  try {
    if (address) {
      const normalized = normalizeAddressForCache(address);
      await db.followed_signal_profiles.delete(normalized);
      logger.debug(`[followedSignalProfilesDB] Cleared cache for ${address}`);
    } else {
      await db.followed_signal_profiles.clear();
      logger.debug('[followedSignalProfilesDB] Cleared all profile caches');
    }
  } catch (error) {
    logger.error('[followedSignalProfilesDB] Error clearing cache:', error);
  }
}

/**
 * Cleanup expired profile entries
 *
 * @returns Number of entries removed
 */
export async function cleanupExpiredFollowedSignalProfiles(): Promise<number> {
  try {
    const now = Date.now();
    const expiredKeys: string[] = [];

    await db.followed_signal_profiles
      .where('expiresAt')
      .below(now)
      .each((entry) => {
        expiredKeys.push(entry.address);
      });

    if (expiredKeys.length > 0) {
      await db.followed_signal_profiles.bulkDelete(expiredKeys);
      logger.debug(
        `[followedSignalProfilesDB] Cleaned up ${expiredKeys.length} expired profiles`
      );
    }

    return expiredKeys.length;
  } catch (error) {
    logger.error('[followedSignalProfilesDB] Error during cleanup:', error);
    return 0;
  }
}
