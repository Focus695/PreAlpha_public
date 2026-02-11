/**
 * Address Profile Data Access Layer
 *
 * Manages full address profile data in IndexedDB.
 * Caches all DisplayProfile fields with 24-hour expiration.
 *
 * This replaces the old profile-db.ts which only stored userName and avatarUrl.
 */

import { logger } from '@/lib/logger';
import type { DisplayProfile } from '@/lib/transformers';
import { db } from '../database';

// ============================================================
// Types
// ============================================================

/**
 * Address profile entry for IndexedDB storage
 * Matches DisplayProfile structure with cache metadata
 */
export interface AddressProfileEntry {
  /** Primary key - lowercase wallet address with 0x prefix */
  address: string;
  rank: number;
  ensName?: string;
  twitterHandle?: string;
  userName?: string;
  avatarUrl?: string;
  isWhale: boolean;
  totalPnl: number;
  roi: number;
  winRate: number | null;
  smartScore: number | null;
  tradesCount: number;
  totalVolume: number;
  tags: string[];
  lastActive: string;
  platform: 'polymarket' | 'opinion';
  polymarketLink: string;
  opinionLink?: string;
  /** Unix timestamp when created */
  createdAt: number;
  /** Unix timestamp when expires (24 hours) */
  expiresAt: number;
}

/**
 * Partial profile data for display (subset of full profile)
 */
export interface PartialProfileData {
  userName?: string;
  avatarUrl?: string;
}

// ============================================================
// Constants
// ============================================================

/** Cache duration: 24 hours in milliseconds */
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

// ============================================================
// Helper Functions
// ============================================================

/**
 * Normalize address for IndexedDB storage (lowercase, keep 0x prefix for consistency with EthAddress type)
 */
function normalizeAddressForCache(address: string): string {
  return address.toLowerCase();
}

/**
 * Convert DisplayProfile to AddressProfileEntry with expiration
 */
function displayProfileToEntry(profile: DisplayProfile): AddressProfileEntry {
  const now = Date.now();
  return {
    address: normalizeAddressForCache(profile.address),
    rank: profile.rank,
    ensName: profile.ensName,
    twitterHandle: profile.twitterHandle,
    userName: profile.userName,
    avatarUrl: profile.avatarUrl,
    isWhale: profile.isWhale,
    totalPnl: profile.totalPnl,
    roi: profile.roi,
    winRate: profile.winRate,
    smartScore: profile.smartScore,
    tradesCount: profile.tradesCount,
    totalVolume: profile.totalVolume,
    tags: profile.tags,
    lastActive: profile.lastActive,
    platform: profile.platform,
    polymarketLink: profile.polymarketLink,
    opinionLink: profile.opinionLink,
    createdAt: now,
    expiresAt: now + CACHE_DURATION_MS,
  };
}

/**
 * Convert AddressProfileEntry to DisplayProfile (remove cache metadata)
 */
function entryToDisplayProfile(entry: AddressProfileEntry): DisplayProfile {
  return {
    address: entry.address as `0x${string}`,
    rank: entry.rank,
    ensName: entry.ensName,
    twitterHandle: entry.twitterHandle,
    userName: entry.userName,
    avatarUrl: entry.avatarUrl,
    isWhale: entry.isWhale,
    totalPnl: entry.totalPnl,
    roi: entry.roi,
    winRate: entry.winRate,
    smartScore: entry.smartScore,
    tradesCount: entry.tradesCount,
    totalVolume: entry.totalVolume,
    tags: entry.tags,
    lastActive: entry.lastActive,
    platform: entry.platform,
    polymarketLink: entry.polymarketLink,
    opinionLink: entry.opinionLink,
  };
}

// ============================================================
// Public API
// ============================================================

/**
 * Get address profile from cache
 *
 * @param address - Wallet address to fetch from cache
 * @returns DisplayProfile if cache is valid, null otherwise
 */
export async function getProfile(address: string): Promise<DisplayProfile | null> {
  try {
    const normalized = normalizeAddressForCache(address);
    const entry = await db.address_profiles.get(normalized);

    if (!entry) {
      return null;
    }

    // Check expiration
    const now = Date.now();
    if (entry.expiresAt < now) {
      // Remove expired entry
      await db.address_profiles.delete(normalized);
      logger.debug('[addressProfilesDB] Cache expired for', address);
      return null;
    }

    logger.debug('[addressProfilesDB] Cache hit for', address);
    return entryToDisplayProfile(entry);
  } catch (error) {
    logger.error('[addressProfilesDB] Error reading cache:', error);
    return null;
  }
}

/**
 * Batch get multiple profiles from cache
 *
 * @param addresses - Array of wallet addresses to fetch
 * @returns Map of address to DisplayProfile (only cached addresses included)
 */
export async function getProfiles(addresses: readonly string[]): Promise<Map<string, DisplayProfile>> {
  const result = new Map<string, DisplayProfile>();
  const now = Date.now();

  if (addresses.length === 0) {
    return result;
  }

  try {
    const normalizedAddresses = addresses.map(normalizeAddressForCache);
    const entries = await db.address_profiles.where('address').anyOf(normalizedAddresses).toArray();

    const expiredKeys: string[] = [];
    for (const entry of entries) {
      if (entry.expiresAt > now) {
        // Find original address by matching normalized version
        const originalAddress = addresses.find(
          (addr) => normalizeAddressForCache(addr) === entry.address
        );
        if (originalAddress) {
          result.set(originalAddress.toLowerCase(), entryToDisplayProfile(entry));
        }
      } else {
        expiredKeys.push(entry.address);
      }
    }

    // Batch delete expired entries
    if (expiredKeys.length > 0) {
      await db.address_profiles.bulkDelete(expiredKeys);
      logger.debug(`[addressProfilesDB] Removed ${expiredKeys.length} expired entries during batch get`);
    }

    logger.debug(`[addressProfilesDB] Batch cache hit: ${result.size}/${addresses.length}`);
  } catch (error) {
    logger.error('[addressProfilesDB] Error in batch get:', error);
  }

  return result;
}

/**
 * Save address profile to cache
 *
 * @param profile - DisplayProfile to cache
 */
export async function saveProfile(profile: DisplayProfile): Promise<void> {
  try {
    const entry = displayProfileToEntry(profile);
    await db.address_profiles.put(entry);
    logger.debug(
      `[addressProfilesDB] Saved cache for ${profile.address}, expires at ${new Date(entry.expiresAt).toISOString()}`
    );
  } catch (error) {
    logger.error('[addressProfilesDB] Failed to save cache:', error);
  }
}

/**
 * Batch save multiple profiles to cache
 *
 * @param profiles - Array of DisplayProfile to cache
 * @returns Number of entries saved
 */
export async function saveProfiles(profiles: readonly DisplayProfile[]): Promise<number> {
  if (profiles.length === 0) {
    return 0;
  }

  try {
    const entries = profiles.map(displayProfileToEntry);
    await db.address_profiles.bulkPut(entries);

    const expiresAt = Date.now() + CACHE_DURATION_MS;
    logger.debug(
      `[addressProfilesDB] Batch saved ${entries.length} profiles to cache, expires at ${new Date(expiresAt).toISOString()}`
    );

    return entries.length;
  } catch (error) {
    logger.error('[addressProfilesDB] Failed to batch save profiles:', error);
    return 0;
  }
}

/**
 * Check if profile cache exists and is valid for an address
 *
 * @param address - Wallet address to check
 * @returns true if cache exists and is not expired
 */
export async function isValid(address: string): Promise<boolean> {
  try {
    const normalized = normalizeAddressForCache(address);
    const entry = await db.address_profiles.get(normalized);

    if (!entry) {
      return false;
    }

    return entry.expiresAt > Date.now();
  } catch {
    return false;
  }
}

/**
 * Check if profile cache is expired for an address
 *
 * @param address - Wallet address to check
 * @returns true if cache is expired or doesn't exist
 */
export async function isExpired(address: string): Promise<boolean> {
  return !(await isValid(address));
}

/**
 * Clear profile cache for a specific address or all profiles
 *
 * @param address - Optional address to clear, or undefined to clear all
 */
export async function clearCache(address?: string): Promise<void> {
  try {
    if (address) {
      const normalized = normalizeAddressForCache(address);
      await db.address_profiles.delete(normalized);
      logger.debug(`[addressProfilesDB] Cleared cache for ${address}`);
    } else {
      await db.address_profiles.clear();
      logger.debug('[addressProfilesDB] Cleared all profile caches');
    }
  } catch (error) {
    logger.error('[addressProfilesDB] Error clearing cache:', error);
  }
}

/**
 * Filter addresses that need fetching (not in cache or expired)
 *
 * @param addresses - Array of wallet addresses to check
 * @returns Array of addresses that need to be fetched
 */
export async function filterAddressesNeedingFetch(
  addresses: readonly string[]
): Promise<string[]> {
  const needsFetch: string[] = [];
  const now = Date.now();

  try {
    const normalizedAddresses = addresses.map(normalizeAddressForCache);
    const entries = await db.address_profiles.where('address').anyOf(normalizedAddresses).toArray();

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
  } catch (error) {
    logger.error('[addressProfilesDB] Error filtering addresses:', error);
    return [...addresses];
  }

  return needsFetch;
}

/**
 * Filter addresses that are missing profile data (no userName AND no avatarUrl)
 *
 * Even if cache exists and is valid, if it doesn't contain userName or avatarUrl,
 * the address is returned for fetching.
 *
 * @param addresses - Array of wallet addresses to check
 * @returns Array of addresses that need to be fetched (missing actual data)
 */
export async function filterAddressesMissingProfileData(
  addresses: readonly string[]
): Promise<string[]> {
  const needsFetch: string[] = [];
  const now = Date.now();

  try {
    const normalizedAddresses = addresses.map(normalizeAddressForCache);
    const entries = await db.address_profiles.where('address').anyOf(normalizedAddresses).toArray();

    const cachedWithData = new Set<string>();
    for (const entry of entries) {
      if (entry.expiresAt > now && (entry.userName || entry.avatarUrl)) {
        cachedWithData.add(entry.address);
      }
    }

    for (let i = 0; i < addresses.length; i++) {
      const normalized = normalizedAddresses[i];
      if (!cachedWithData.has(normalized)) {
        needsFetch.push(addresses[i]);
      }
    }

    logger.debug(
      `[addressProfilesDB] Addresses missing profile data: ${needsFetch.length}/${addresses.length}`
    );
  } catch (error) {
    logger.error('[addressProfilesDB] Error filtering addresses missing data:', error);
    return [...addresses];
  }

  return needsFetch;
}

/**
 * Cleanup expired profile entries
 *
 * @returns Number of entries removed
 */
export async function cleanupExpired(): Promise<number> {
  try {
    const now = Date.now();
    const expiredKeys: string[] = [];

    await db.address_profiles
      .where('expiresAt')
      .below(now)
      .each((entry) => {
        expiredKeys.push(entry.address);
      });

    if (expiredKeys.length > 0) {
      await db.address_profiles.bulkDelete(expiredKeys);
      logger.debug(`[addressProfilesDB] Cleaned up ${expiredKeys.length} expired profiles`);
    }

    return expiredKeys.length;
  } catch (error) {
    logger.error('[addressProfilesDB] Error during cleanup:', error);
    return 0;
  }
}

/**
 * Get partial profile data (userName, avatarUrl only) for backward compatibility
 *
 * @param address - Wallet address to fetch from cache
 * @returns Partial profile data if cache is valid, null otherwise
 */
export async function getPartialProfile(address: string): Promise<PartialProfileData | null> {
  try {
    const normalized = normalizeAddressForCache(address);
    const entry = await db.address_profiles.get(normalized);

    if (!entry) {
      return null;
    }

    // Check expiration
    const now = Date.now();
    if (entry.expiresAt < now) {
      await db.address_profiles.delete(normalized);
      return null;
    }

    return {
      userName: entry.userName,
      avatarUrl: entry.avatarUrl,
    };
  } catch (error) {
    logger.error('[addressProfilesDB] Error reading partial profile:', error);
    return null;
  }
}

/**
 * Batch get partial profile data for backward compatibility
 *
 * @param addresses - Array of wallet addresses to fetch
 * @returns Map of address to partial profile data (only cached addresses included)
 */
export async function getBatchPartialProfiles(
  addresses: readonly string[]
): Promise<Map<string, PartialProfileData>> {
  const result = new Map<string, PartialProfileData>();
  const now = Date.now();

  if (addresses.length === 0) {
    return result;
  }

  try {
    const normalizedAddresses = addresses.map(normalizeAddressForCache);
    const entries = await db.address_profiles.where('address').anyOf(normalizedAddresses).toArray();

    const expiredKeys: string[] = [];
    for (const entry of entries) {
      if (entry.expiresAt > now) {
        const originalAddress = addresses.find(
          (addr) => normalizeAddressForCache(addr) === entry.address
        );
        if (originalAddress) {
          result.set(originalAddress.toLowerCase(), {
            userName: entry.userName,
            avatarUrl: entry.avatarUrl,
          });
        }
      } else {
        expiredKeys.push(entry.address);
      }
    }

    if (expiredKeys.length > 0) {
      await db.address_profiles.bulkDelete(expiredKeys);
    }

    logger.debug(`[addressProfilesDB] Batch partial profile hit: ${result.size}/${addresses.length}`);
  } catch (error) {
    logger.error('[addressProfilesDB] Error in batch partial get:', error);
  }

  return result;
}
