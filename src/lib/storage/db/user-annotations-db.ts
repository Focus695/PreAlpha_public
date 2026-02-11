/**
 * User Annotations Data Access Layer
 *
 * Manages user address annotations in IndexedDB.
 * Follow relationships are now managed in user-follows-db.ts.
 *
 * Data is persistent (no expiration) and synced with backend.
 */

import { logger } from '@/lib/logger';
import { db, type UserAnnotationEntry } from '../database';
import type { UserData, AddressAnnotation } from '@/types/user';
import { EMPTY_USER_DATA } from '@/types/user';
import type { EthAddress } from '@/types';

// ============================================================
// Public API
// ============================================================

/**
 * Load UserData from IndexedDB for a specific wallet address
 *
 * @param address - Wallet address to load data for
 * @returns UserData if found, null otherwise
 */
export async function loadUserData(address: EthAddress): Promise<UserData | null> {
  try {
    const normalized = address.toLowerCase();
    const entry = await db.user_annotations.get(normalized);

    if (!entry) {
      return null;
    }

    // Validate structure
    if (
      !entry ||
      typeof entry !== 'object' ||
      typeof entry.version !== 'number' ||
      typeof entry.annotations !== 'object'
    ) {
      logger.warn('[userAnnotationsDB] Corrupted data structure for', address);
      return null;
    }

    logger.debug('[userAnnotationsDB] Loaded data for', address);
    // Return in legacy format for compatibility (following is empty array)
    return {
      version: entry.version as 1 | 2 | 3,
      following: [], // Following is now managed in user_follows table
      annotations: entry.annotations,
    };
  } catch (error) {
    logger.warn('[userAnnotationsDB] Failed to load user data:', error);
    return null;
  }
}

/**
 * Save UserData to IndexedDB for a specific wallet address
 * Only saves annotations (following is ignored)
 *
 * @param address - Wallet address to save data for
 * @param data - UserData to save (only annotations will be stored)
 */
export async function saveUserData(address: EthAddress, data: UserData): Promise<void> {
  try {
    const normalized = address.toLowerCase();

    const entry: UserAnnotationEntry = {
      userAddress: normalized,
      version: data.version,
      annotations: data.annotations || {},
    };

    await db.user_annotations.put(entry);
    logger.debug('[userAnnotationsDB] Saved data for', address);
  } catch (error) {
    logger.warn('[userAnnotationsDB] Failed to save user data:', error);
  }
}

/**
 * Delete UserData for a specific wallet address
 *
 * @param address - Wallet address to delete data for
 */
export async function deleteUserData(address: EthAddress): Promise<void> {
  try {
    const normalized = address.toLowerCase();
    await db.user_annotations.delete(normalized);
    logger.debug('[userAnnotationsDB] Deleted data for', address);
  } catch (error) {
    logger.warn('[userAnnotationsDB] Failed to delete user data:', error);
  }
}

/**
 * Check if UserData exists for an address
 *
 * @param address - Wallet address to check
 * @returns true if data exists
 */
export async function hasUserData(address: EthAddress): Promise<boolean> {
  try {
    const normalized = address.toLowerCase();
    return await db.user_annotations.get(normalized) !== undefined;
  } catch {
    return false;
  }
}

/**
 * Clear all UserData (use with caution)
 *
 * @returns Number of entries removed
 */
export async function clearAllUserData(): Promise<number> {
  try {
    const count = await db.user_annotations.count();
    await db.user_annotations.clear();
    logger.debug(`[userAnnotationsDB] Cleared all user data (${count} entries)`);
    return count;
  } catch (error) {
    logger.warn('[userAnnotationsDB] Failed to clear all user data:', error);
    return 0;
  }
}

/**
 * Get all wallet addresses that have stored data
 *
 * @returns Array of wallet addresses
 */
export async function getAllUserAddresses(): Promise<string[]> {
  try {
    const entries = await db.user_annotations.toCollection().primaryKeys();
    return entries as string[];
  } catch (error) {
    logger.warn('[userAnnotationsDB] Failed to get all addresses:', error);
    return [];
  }
}

/**
 * Update annotations for a specific address
 *
 * @param userAddress - User's wallet address
 * @param targetAddress - Address being annotated
 * @param annotation - New annotation data
 */
export async function updateAnnotation(
  userAddress: EthAddress,
  targetAddress: EthAddress,
  annotation: AddressAnnotation
): Promise<void> {
  try {
    const normalizedUser = userAddress.toLowerCase();
    const normalizedTarget = targetAddress.toLowerCase();
    const existing = await db.user_annotations.get(normalizedUser);

    if (existing) {
      existing.annotations[normalizedTarget] = annotation;
      await db.user_annotations.put(existing);
    } else {
      const entry: UserAnnotationEntry = {
        userAddress: normalizedUser,
        version: 3,
        annotations: {
          [normalizedTarget]: annotation,
        },
      };
      await db.user_annotations.put(entry);
    }

    logger.debug('[userAnnotationsDB] Updated annotation for', targetAddress);
  } catch (error) {
    logger.warn('[userAnnotationsDB] Failed to update annotation:', error);
  }
}

/**
 * Remove annotation for a specific address
 *
 * @param userAddress - User's wallet address
 * @param targetAddress - Address to remove annotation from
 */
export async function removeAnnotation(
  userAddress: EthAddress,
  targetAddress: EthAddress
): Promise<void> {
  try {
    const normalizedUser = userAddress.toLowerCase();
    const normalizedTarget = targetAddress.toLowerCase();
    const existing = await db.user_annotations.get(normalizedUser);

    if (existing) {
      delete existing.annotations[normalizedTarget];
      await db.user_annotations.put(existing);
      logger.debug('[userAnnotationsDB] Removed annotation for', targetAddress);
    }
  } catch (error) {
    logger.warn('[userAnnotationsDB] Failed to remove annotation:', error);
  }
}

/**
 * Get or create UserData for an address
 *
 * @param address - Wallet address
 * @returns UserData (creates empty if not exists)
 */
export async function getOrCreateUserData(address: EthAddress): Promise<UserData> {
  const existing = await loadUserData(address);
  if (existing) {
    return existing;
  }

  // Return empty data without saving (let caller decide when to save)
  return { ...EMPTY_USER_DATA };
}

/**
 * Get annotations for a specific user
 *
 * @param userAddress - User's wallet address
 * @returns Annotations object
 */
export async function getAnnotations(
  userAddress: EthAddress
): Promise<Record<string, AddressAnnotation>> {
  try {
    const normalized = userAddress.toLowerCase();
    const entry = await db.user_annotations.get(normalized);
    return entry?.annotations || {};
  } catch (error) {
    logger.warn('[userAnnotationsDB] Failed to get annotations:', error);
    return {};
  }
}

/**
 * Get annotation for a specific target address
 *
 * @param userAddress - User's wallet address
 * @param targetAddress - Address to get annotation for
 * @returns Annotation or undefined
 */
export async function getAnnotation(
  userAddress: EthAddress,
  targetAddress: EthAddress
): Promise<AddressAnnotation | undefined> {
  try {
    const normalizedUser = userAddress.toLowerCase();
    const normalizedTarget = targetAddress.toLowerCase();
    const entry = await db.user_annotations.get(normalizedUser);
    return entry?.annotations[normalizedTarget];
  } catch (error) {
    logger.warn('[userAnnotationsDB] Failed to get annotation:', error);
    return undefined;
  }
}
