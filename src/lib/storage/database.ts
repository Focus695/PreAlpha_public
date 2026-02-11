/**
 * PreAlpha IndexedDB Database
 *
 * Uses Dexie.js to wrap IndexedDB for structured data storage.
 *
 * Version 4 Structure:
 * - address_profiles: Full address profile cache (DisplayProfile) with 24-hour expiration
 * - user_follows: Follow relationships (userAddress, targetAddress, followedAt) - no expiration
 * - user_annotations: User's notes and custom tags per address - no expiration
 * - leaderboard_cache: Leaderboard data with 24-hour expiration (stored only on search)
 * - followed_signal_profiles: Followed wallet profiles in signals with 30-day expiration
 *
 * Version history:
 * - v1: Initial schema with profiles, leaderboard_cache, user_data (following in user_data)
 * - v2: Moved following to dedicated follows table, user_data only has annotations
 * - v3: Renamed tables, expanded address_profiles to full DisplayProfile, 24h cache duration
 * - v4: Added followed_signal_profiles table for 30-day cache of followed wallets in signals
 */

import Dexie, { Table } from 'dexie';
import { logger } from '@/lib/logger';
import type { AddressAnnotation } from '@/types/user';
import type { EnrichedLeaderboardApiEntry } from '@/lib/api/types';
import type { AddressProfileEntry } from './db/address-profiles-db';
import type { FollowedSignalProfileEntry } from './db/followed-signal-profiles-db';

// ============================================================
// Database Table Types
// ============================================================

/**
 * Follow relationship entry
 * Stores who follows whom
 */
export interface FollowEntry {
  /** Current user's wallet address (lowercase) - Part of compound key */
  userAddress: string;
  /** Address being followed (lowercase) - Part of compound key */
  targetAddress: string;
  /** Unix timestamp when followed */
  followedAt: number;
}

/**
 * Leaderboard cache entry
 * Stores enriched leaderboard data per time range
 */
export interface LeaderboardCacheEntry {
  /** Auto-increment primary key */
  id?: number;
  /** Time range: '1d', '7d', '30d', or 'all' */
  timeRange: '1d' | '7d' | '30d' | 'all';
  /** Enriched leaderboard entries array */
  data: EnrichedLeaderboardApiEntry[];
  /** Unix timestamp when created */
  createdAt: number;
  /** Unix timestamp when expires (24 hours) */
  expiresAt: number;
}

/**
 * User annotations entry
 * Stores user's notes and custom tags for addresses
 */
export interface UserAnnotationEntry {
  /** User's wallet address (lowercase) - Primary Key */
  userAddress: string;
  /** Data structure version */
  version: number;
  /** Per-address annotations (notes and tags) */
  annotations: Record<string, AddressAnnotation>;
}

// Re-export types from address-profiles-db for convenience
export type { AddressProfileEntry };

// Re-export types from followed-signal-profiles-db for convenience
export type { FollowedSignalProfileEntry };

/**
 * Legacy user data entry (v1, v2)
 * @deprecated Use UserAnnotationEntry (v3) instead
 */
export interface UserDataEntryV1 {
  /** User's wallet address (lowercase) - Primary Key */
  address: string;
  /** Data structure version */
  version: number;
  /** Per-address annotations (notes and tags) */
  annotations: Record<string, AddressAnnotation>;
  /** List of followed addresses (moved to user_follows table in v2) */
  following: Array<{
    address: string;
    userName?: string;
    avatarUrl?: string;
    createdAt: string;
    updatedAt: string;
  }>;
  /** Last sync timestamp (ISO 8601) - removed in v2 */
  lastSyncedAt?: string;
}

/**
 * Legacy follow entry (v2)
 * @deprecated Use FollowEntry (v3) instead
 */
export interface FollowEntryV2 {
  userAddress: string;
  followingAddress: string;
  followedAt: number;
}

// ============================================================
// Database Class
// ============================================================

class PreAlphaDatabase extends Dexie {
  /** Address profile cache table (v3) - full DisplayProfile with 24h expiry */
  address_profiles!: Table<AddressProfileEntry>;

  /** Follow relationships table (v3) - renamed from follows */
  user_follows!: Table<FollowEntry>;

  /** Leaderboard cache table (v3) - 24h expiry */
  leaderboard_cache!: Table<LeaderboardCacheEntry>;

  /** User annotations table (v3) - renamed from user_data */
  user_annotations!: Table<UserAnnotationEntry>;

  /** Followed signal profiles table (v4) - 30-day cache for followed wallets in signals */
  followed_signal_profiles!: Table<FollowedSignalProfileEntry>;

  constructor() {
    super('PreAlphaDB');

    // ============================================================
    // Version 4: Add followed signal profiles cache
    // ============================================================
    this.version(4).stores({
      address_profiles: 'address, expiresAt',
      user_follows: '[userAddress+targetAddress], userAddress, targetAddress',
      leaderboard_cache: '++id, timeRange, expiresAt',
      user_annotations: 'userAddress',
      followed_signal_profiles: 'address, expiresAt',
    }).upgrade(async () => {
      logger.info('[PreAlphaDB] Upgrading to v4 - added followed_signal_profiles table...');
      // No data migration needed, just adding a new table
      logger.info('[PreAlphaDB] Migration to v4 completed');
    });

    // ============================================================
    // Version 3: Complete restructure
    // ============================================================
    this.version(3).stores({
      address_profiles: 'address, expiresAt',
      user_follows: '[userAddress+targetAddress], userAddress, targetAddress',
      leaderboard_cache: '++id, timeRange, expiresAt',
      user_annotations: 'userAddress',
    }).upgrade(async (tx) => {
      logger.info('[PreAlphaDB] Upgrading to v3 - restructured schema...');

      // Migrate follows -> user_follows
      const oldFollows = await tx.table('follows').toArray() as FollowEntryV2[];
      for (const follow of oldFollows) {
        try {
          await tx.table('user_follows').put({
            userAddress: follow.userAddress,
            targetAddress: follow.followingAddress,
            followedAt: follow.followedAt,
          });
        } catch (e) {
          logger.warn('[PreAlphaDB] Failed to migrate follow entry:', e);
        }
      }
      await tx.table('follows').clear();

      // Migrate user_data -> user_annotations
      const oldUserData = await tx.table('user_data').toArray();
      for (const data of oldUserData) {
        try {
          await tx.table('user_annotations').put({
            userAddress: data.address,
            version: 3,
            annotations: data.annotations || {},
          });
        } catch (e) {
          logger.warn('[PreAlphaDB] Failed to migrate user annotations:', e);
        }
      }
      await tx.table('user_data').clear();

      // Clear old profiles table (will be replaced by address_profiles)
      await tx.table('profiles').clear();

      logger.info('[PreAlphaDB] Migration to v3 completed');
    });

    // ============================================================
    // Version 2: Follow relationships moved to dedicated table
    // ============================================================
    this.version(2).stores({
      profiles: 'address, expiresAt',
      follows: '[userAddress+followingAddress], userAddress, followingAddress',
      leaderboard_cache: '++id, timeRange, expiresAt',
      user_data: 'address, version',
    }).upgrade(async (tx) => {
      logger.info('[PreAlphaDB] Migrating from v1 to v2...');
      await migrateV1ToV2(tx);
      logger.info('[PreAlphaDB] Migration to v2 completed');
    });

    // ============================================================
    // Version 1: Initial schema
    // ============================================================
    this.version(1).stores({
      profiles: 'address, expiresAt',
      leaderboard_cache: '++id, timeRange, expiresAt',
      user_data: 'address, version',
    });
  }
}

/**
 * Migration handler from v1 to v2
 * Moves following data from user_data.following to follows table
 */
async function migrateV1ToV2(tx: any): Promise<void> {
  const oldUserData = await tx.table('user_data').toArray() as UserDataEntryV1[];
  let migratedCount = 0;

  for (const userData of oldUserData) {
    const followingList = userData.following || [];

    // For each followed address, create a follows record
    for (const followed of followingList) {
      const normalizedAddress = followed.address.toLowerCase().replace(/^0x/, '');

      try {
        await tx.table('follows').put({
          userAddress: userData.address,
          followingAddress: normalizedAddress,
          followedAt: followed.createdAt
            ? new Date(followed.createdAt).getTime()
            : Date.now(),
        });
        migratedCount++;
      } catch (error) {
        logger.warn('[PreAlphaDB] Failed to migrate follow entry:', error);
      }
    }

    // Update user_data to remove following array
    await tx.table('user_data').put({
      address: userData.address,
      version: 2,
      annotations: userData.annotations || {},
    });
  }

  logger.info(`[PreAlphaDB] Migrated ${migratedCount} follow relationships for ${oldUserData.length} users`);
}

// ============================================================
// Database Instance
// ============================================================

export const db = new PreAlphaDatabase();

// ============================================================
// Helper Functions
// ============================================================

/**
 * Initialize the database
 * Called on app startup to ensure DB is ready
 */
export async function initializeDatabase(): Promise<void> {
  try {
    await db.open();
    console.log('[PreAlphaDB] Database initialized successfully');
  } catch (error) {
    console.error('[PreAlphaDB] Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Check if database is open and ready
 */
export function isDatabaseOpen(): boolean {
  return db.isOpen();
}

/**
 * Close the database
 * Called on app cleanup (rarely needed in web apps)
 */
export async function closeDatabase(): Promise<void> {
  await db.close();
  console.log('[PreAlphaDB] Database closed');
}

/**
 * Clear all data from all tables
 * Use with caution - typically only for testing or logout
 */
export async function clearAllTables(): Promise<void> {
  await db.transaction(
    'rw',
    [db.address_profiles, db.user_follows, db.leaderboard_cache, db.user_annotations, db.followed_signal_profiles],
    async () => {
      await db.address_profiles.clear();
      await db.user_follows.clear();
      await db.leaderboard_cache.clear();
      await db.user_annotations.clear();
      await db.followed_signal_profiles.clear();
    }
  );
  console.log('[PreAlphaDB] All tables cleared');
}

/**
 * Get database info for debugging
 */
export async function getDatabaseInfo(): Promise<{
  addressProfilesCount: number;
  followsCount: number;
  leaderboardCount: number;
  annotationsCount: number;
  followedSignalProfilesCount: number;
  isOpen: boolean;
}> {
  const [addressProfilesCount, followsCount, leaderboardCount, annotationsCount, followedSignalProfilesCount] =
    await Promise.all([
      db.address_profiles.count(),
      db.user_follows.count(),
      db.leaderboard_cache.count(),
      db.user_annotations.count(),
      db.followed_signal_profiles.count(),
    ]);

  return {
    addressProfilesCount,
    followsCount,
    leaderboardCount,
    annotationsCount,
    followedSignalProfilesCount,
    isOpen: db.isOpen(),
  };
}
