/**
 * User Data Migration Utilities
 *
 * Handles migration from legacy localStorage formats to the unified UserData structure.
 * Automatically migrates data from:
 * - useFollowedAddresses (prealpha:followed-addresses)
 * - useUserAnnotations (prealpha:user-annotations)
 */

import { logger } from '@/lib/logger';
import type { EthAddress } from '@/types';
import type { UserData, FollowedAddress, AddressAnnotation } from '@/types/user';
import { EMPTY_USER_DATA } from '@/types/user';

// Legacy localStorage keys
const LEGACY_FOLLOWED_KEY = 'prealpha:followed-addresses';
const LEGACY_ANNOTATIONS_KEY = 'prealpha:user-annotations';

// Legacy data structures (from old hooks)
interface LegacyFollowedAddressEntry {
  createdAt: string;
  updatedAt: string;
  userName?: string;
  avatarUrl?: string;
}

interface LegacyFollowedAddressesStore {
  version: 1;
  addresses: Record<string, LegacyFollowedAddressEntry>;
}

interface LegacyUserAddressAnnotation {
  note?: string;
  customTags: string[];
  updatedAt: string;
}

interface LegacyUserAnnotationsStore {
  version: 1;
  annotations: Record<string, LegacyUserAddressAnnotation>;
}

/**
 * Normalize Ethereum address to lowercase
 */
export function normalizeAddress(address: EthAddress | string): string {
  return address.toLowerCase();
}

/**
 * Load legacy followed addresses from localStorage
 */
function loadLegacyFollowedAddresses(): LegacyFollowedAddressesStore | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem(LEGACY_FOLLOWED_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as LegacyFollowedAddressesStore;

    // Validate structure
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      parsed.version === 1 &&
      typeof parsed.addresses === 'object' &&
      parsed.addresses !== null
    ) {
      return parsed;
    }

    return null;
  } catch (error) {
    logger.warn('[Migration] Failed to load legacy followed addresses:', error);
    return null;
  }
}

/**
 * Load legacy user annotations from localStorage
 */
function loadLegacyAnnotations(): LegacyUserAnnotationsStore | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem(LEGACY_ANNOTATIONS_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as LegacyUserAnnotationsStore;

    // Validate structure
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      parsed.version === 1 &&
      typeof parsed.annotations === 'object' &&
      parsed.annotations !== null
    ) {
      return parsed;
    }

    return null;
  } catch (error) {
    logger.warn('[Migration] Failed to load legacy annotations:', error);
    return null;
  }
}

/**
 * Migrate legacy localStorage data to new unified UserData format
 *
 * This function:
 * 1. Loads data from both legacy localStorage keys
 * 2. Converts to new unified format
 * 3. Returns merged UserData
 *
 * @returns Migrated UserData, or EMPTY_USER_DATA if no legacy data exists
 */
export function migrateLegacyUserData(): UserData {
  logger.debug('[Migration] Checking for legacy user data...');

  const legacyFollowed = loadLegacyFollowedAddresses();
  const legacyAnnotations = loadLegacyAnnotations();

  // If no legacy data exists, return empty
  if (!legacyFollowed && !legacyAnnotations) {
    logger.debug('[Migration] No legacy data found');
    return EMPTY_USER_DATA;
  }

  logger.info('[Migration] Legacy data found, migrating...');

  // Convert followed addresses
  const following: FollowedAddress[] = [];
  if (legacyFollowed) {
    for (const [address, entry] of Object.entries(legacyFollowed.addresses)) {
      following.push({
        address: address as EthAddress,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        userName: entry.userName,
        avatarUrl: entry.avatarUrl,
      });
    }
    logger.info(`[Migration] Migrated ${following.length} followed addresses`);
  }

  // Convert annotations
  const annotations: Record<string, AddressAnnotation> = {};
  if (legacyAnnotations) {
    for (const [address, annotation] of Object.entries(legacyAnnotations.annotations)) {
      annotations[normalizeAddress(address)] = {
        note: annotation.note,
        customTags: annotation.customTags,
        updatedAt: annotation.updatedAt,
      };
    }
    logger.info(`[Migration] Migrated ${Object.keys(annotations).length} annotations`);
  }

  const migratedData: UserData = {
    version: 1,
    following,
    annotations,
    lastSyncedAt: new Date().toISOString(),
  };

  logger.info('[Migration] Migration complete:', {
    followingCount: following.length,
    annotationsCount: Object.keys(annotations).length,
  });

  return migratedData;
}

/**
 * Check if legacy data exists in localStorage
 */
export function hasLegacyData(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    localStorage.getItem(LEGACY_FOLLOWED_KEY) !== null ||
    localStorage.getItem(LEGACY_ANNOTATIONS_KEY) !== null
  );
}

/**
 * Clean up legacy localStorage keys after successful migration
 *
 * IMPORTANT: Only call this after confirming the new data is successfully
 * saved to both localStorage and backend!
 */
export function cleanupLegacyData(): void {
  if (typeof window === 'undefined') {
    return;
  }

  logger.debug('[Migration] Cleaning up legacy localStorage keys...');

  localStorage.removeItem(LEGACY_FOLLOWED_KEY);
  localStorage.removeItem(LEGACY_ANNOTATIONS_KEY);

  logger.debug('[Migration] Legacy data cleanup complete');
}

/**
 * Backup legacy data to a temporary key (for rollback)
 *
 * This creates a backup before cleanup, allowing rollback if needed.
 */
export function backupLegacyData(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const followedData = localStorage.getItem(LEGACY_FOLLOWED_KEY);
  const annotationsData = localStorage.getItem(LEGACY_ANNOTATIONS_KEY);

  if (followedData) {
    localStorage.setItem(`${LEGACY_FOLLOWED_KEY}:backup`, followedData);
  }

  if (annotationsData) {
    localStorage.setItem(`${LEGACY_ANNOTATIONS_KEY}:backup`, annotationsData);
  }

  logger.debug('[Migration] Legacy data backed up');
}

/**
 * Restore legacy data from backup (for rollback)
 */
export function restoreLegacyData(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const followedBackup = localStorage.getItem(`${LEGACY_FOLLOWED_KEY}:backup`);
  const annotationsBackup = localStorage.getItem(`${LEGACY_ANNOTATIONS_KEY}:backup`);

  if (followedBackup) {
    localStorage.setItem(LEGACY_FOLLOWED_KEY, followedBackup);
    localStorage.removeItem(`${LEGACY_FOLLOWED_KEY}:backup`);
  }

  if (annotationsBackup) {
    localStorage.setItem(LEGACY_ANNOTATIONS_KEY, annotationsBackup);
    localStorage.removeItem(`${LEGACY_ANNOTATIONS_KEY}:backup`);
  }

  logger.debug('[Migration] Legacy data restored from backup');
}
