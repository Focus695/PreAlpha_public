/**
 * User Follow Data Access Layer
 *
 * Manages user follow relationships using IndexedDB.
 * Replaces follows-db.ts with renamed table (user_follows).
 *
 * This provides:
 * - Single source of truth for follow relationships
 * - Support for multi-user scenarios (switching wallets)
 * - Efficient querying with compound indexes
 * - No expiration (follow data persists until explicitly removed)
 */

import { logger } from '@/lib/logger';
import { db, type FollowEntry } from '../database';

// ============================================================
// Types
// ============================================================

/** Followed address with profile data */
export interface FollowedProfile {
  /** Wallet address */
  address: string;
  /** User's display name */
  userName?: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Unix timestamp when followed */
  followedAt: number;
}

/** Profile data subset */
export interface ProfileData {
  userName?: string;
  avatarUrl?: string;
}

// ============================================================
// Public API
// ============================================================

/**
 * Get all addresses followed by a user with their profiles
 *
 * @param userAddress - Current user's wallet address
 * @returns Array of followed addresses with profile data
 */
export async function getFollowedProfiles(
  userAddress: string
): Promise<FollowedProfile[]> {
  try {
    const normalizedUser = userAddress.toLowerCase().replace(/^0x/, '');

    // Get all follows for this user
    const follows = await db.user_follows
      .where('userAddress')
      .equals(normalizedUser)
      .toArray();

    if (follows.length === 0) {
      return [];
    }

    // Batch get profiles for all followed addresses
    const addresses = follows.map((f) => f.targetAddress);
    const profiles = await db.address_profiles.where('address').anyOf(addresses).toArray();

    // Merge follows with profiles
    const result: FollowedProfile[] = [];
    for (const follow of follows) {
      const profile = profiles.find((p) => p.address === follow.targetAddress);
      result.push({
        address: follow.targetAddress,
        userName: profile?.userName,
        avatarUrl: profile?.avatarUrl,
        followedAt: follow.followedAt,
      });
    }

    logger.debug(`[userFollowsDB] Retrieved ${result.length} followed profiles for ${normalizedUser}`);
    return result;
  } catch (error) {
    logger.error('[userFollowsDB] Error getting followed profiles:', error);
    return [];
  }
}

/**
 * Add a follow relationship
 *
 * @param userAddress - Current user's wallet address
 * @param targetAddress - Address to follow
 */
export async function addFollow(
  userAddress: string,
  targetAddress: string
): Promise<void> {
  try {
    const normalizedUser = userAddress.toLowerCase().replace(/^0x/, '');
    const normalizedTarget = targetAddress.toLowerCase().replace(/^0x/, '');

    await db.user_follows.put({
      userAddress: normalizedUser,
      targetAddress: normalizedTarget,
      followedAt: Date.now(),
    });

    logger.debug(`[userFollowsDB] Added follow: ${normalizedUser} -> ${normalizedTarget}`);
  } catch (error) {
    logger.error('[userFollowsDB] Error adding follow:', error);
    throw error;
  }
}

/**
 * Remove a follow relationship
 *
 * @param userAddress - Current user's wallet address
 * @param targetAddress - Address to unfollow
 */
export async function removeFollow(
  userAddress: string,
  targetAddress: string
): Promise<void> {
  try {
    const normalizedUser = userAddress.toLowerCase().replace(/^0x/, '');
    const normalizedTarget = targetAddress.toLowerCase().replace(/^0x/, '');

    await db.user_follows
      .where('[userAddress+targetAddress]')
      .equals([normalizedUser, normalizedTarget])
      .delete();

    logger.debug(`[userFollowsDB] Removed follow: ${normalizedUser} -> ${normalizedTarget}`);
  } catch (error) {
    logger.error('[userFollowsDB] Error removing follow:', error);
    throw error;
  }
}

/**
 * Check if user follows an address
 *
 * @param userAddress - Current user's wallet address
 * @param targetAddress - Address to check
 * @returns true if user follows the address
 */
export async function isFollowing(
  userAddress: string,
  targetAddress: string
): Promise<boolean> {
  try {
    const normalizedUser = userAddress.toLowerCase().replace(/^0x/, '');
    const normalizedTarget = targetAddress.toLowerCase().replace(/^0x/, '');

    const record = await db.user_follows
      .where('[userAddress+targetAddress]')
      .equals([normalizedUser, normalizedTarget])
      .first();

    return !!record;
  } catch (error) {
    logger.error('[userFollowsDB] Error checking follow status:', error);
    return false;
  }
}

/**
 * Get all follow addresses for a user (without profiles)
 *
 * @param userAddress - Current user's wallet address
 * @returns Array of followed addresses
 */
export async function getFollowedAddresses(
  userAddress: string
): Promise<string[]> {
  try {
    const normalizedUser = userAddress.toLowerCase().replace(/^0x/, '');

    const follows = await db.user_follows
      .where('userAddress')
      .equals(normalizedUser)
      .toArray();

    return follows.map((f) => f.targetAddress);
  } catch (error) {
    logger.error('[userFollowsDB] Error getting followed addresses:', error);
    return [];
  }
}

/**
 * Get follow count for a user
 *
 * @param userAddress - Current user's wallet address
 * @returns Number of followed addresses
 */
export async function getFollowCount(userAddress: string): Promise<number> {
  try {
    const normalizedUser = userAddress.toLowerCase().replace(/^0x/, '');
    return await db.user_follows.where('userAddress').equals(normalizedUser).count();
  } catch (error) {
    logger.error('[userFollowsDB] Error getting follow count:', error);
    return 0;
  }
}

/**
 * Clear all follows for a user (e.g., on logout)
 *
 * @param userAddress - Current user's wallet address
 */
export async function clearUserFollows(userAddress: string): Promise<void> {
  try {
    const normalizedUser = userAddress.toLowerCase().replace(/^0x/, '');

    await db.user_follows.where('userAddress').equals(normalizedUser).delete();
    logger.debug(`[userFollowsDB] Cleared all follows for ${normalizedUser}`);
  } catch (error) {
    logger.error('[userFollowsDB] Error clearing user follows:', error);
    throw error;
  }
}

/**
 * Bulk add follows (useful for migration/sync)
 *
 * @param userAddress - Current user's wallet address
 * @param addresses - Array of addresses to follow
 */
export async function bulkAddFollows(
  userAddress: string,
  addresses: string[]
): Promise<void> {
  try {
    const normalizedUser = userAddress.toLowerCase().replace(/^0x/, '');
    const now = Date.now();

    const entries: FollowEntry[] = addresses.map((addr) => ({
      userAddress: normalizedUser,
      targetAddress: addr.toLowerCase().replace(/^0x/, ''),
      followedAt: now,
    }));

    await db.user_follows.bulkPut(entries);
    logger.debug(`[userFollowsDB] Bulk added ${entries.length} follows for ${normalizedUser}`);
  } catch (error) {
    logger.error('[userFollowsDB] Error bulk adding follows:', error);
    throw error;
  }
}
