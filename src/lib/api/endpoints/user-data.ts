/**
 * User Data API Endpoints
 *
 * API endpoints for managing user's private data:
 * - Following list (wallets user is following)
 * - Address annotations (notes and custom tags per address)
 */

import { getApiBaseUrl } from '@/lib/api-config';
import { getAuthToken } from '@/lib/auth/authentication-adapter';
import { logger } from '@/lib/logger';
import type { EthAddress } from '@/types';
import type { UserData, FollowedAddress, AddressAnnotation } from '@/types/user';
import { EMPTY_USER_DATA } from '@/types/user';
import { getAllRemarks, setRemark, deleteRemark } from './remarks';
import { labelsApi } from './labels';

// ============================================================
// Type Definitions for API Responses
// ============================================================

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get Authorization header with JWT token
 */
function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No authentication token');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Handle API response
 */
async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    // Clear invalid token
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_address');
    throw new Error('Authentication token invalid or expired');
  }

  if (!res.ok) {
    const errorText = await res.text();
    logger.error('[API Error]', res.status, errorText);
    throw new Error(`API Error (${res.status}): ${errorText}`);
  }

  const responseData = await res.json();

  // Backend returns: { errno: 0, errmsg: "success", result: ... }
  if (responseData.errno === 0 && responseData.result !== undefined) {
    return responseData.result;
  }

  // If data is at top level
  return responseData;
}

// ============================================================
// Following API (per OpenAPI spec: /user/profile, /user/following)
// ============================================================

/**
 * Get all followed addresses
 * GET /user/profile
 *
 * Returns the user's profile data including followed wallets list.
 *
 * API response format: { followingWallets: ["0x123...", "0x456..."], followingCount: 0 }
 */
export async function getFollowingList(): Promise<FollowedAddress[]> {
  try {
    console.log('[getFollowingList] Fetching following list...');
    const res = await fetch(`${getApiBaseUrl()}/user/profile`, {
      headers: getAuthHeaders(),
    });

    const result = await handleResponse<{ followingWallets: string[]; followingCount: number }>(res);
    console.log('[getFollowingList] Raw result from API:', result);

    // The API returns { followingWallets: ["0x...", ...], followingCount: 0 }
    if (result && Array.isArray(result.followingWallets)) {
      console.log('[getFollowingList] Found followingWallets format:', result.followingWallets);
      return result.followingWallets.map((addr) => ({
        address: addr as EthAddress,
        userName: undefined,
        avatarUrl: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }

    // No valid following data found
    console.warn('[getFollowingList] No following data in response, returning empty array. Result was:', result);
    return [];
  } catch (error) {
    console.error('[getFollowingList] Failed to fetch following list:', error);
    return [];
  }
}

/**
 * Update the entire following list
 * PUT /user/following
 *
 * This replaces the entire following list with the provided addresses.
 *
 * Request body: { "followingWallets": ["0x123...", "0x456..."] }
 */
export async function updateFollowing(followingWallets: EthAddress[]): Promise<void> {
  const url = `${getApiBaseUrl()}/user/following`;
  const body = JSON.stringify({ followingWallets });

  logger.debug('[updateFollowing] Request:', {
    url,
    body,
    walletCount: followingWallets.length,
  });

  const res = await fetch(url, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body,
  });

  logger.debug('[updateFollowing] Response status:', res.status);

  await handleResponse(res);

  logger.debug('[updateFollowing] Request completed successfully');
}

/**
 * Follow a single wallet
 * POST /user/following/follow
 */
export async function followAddress(targetAddress: EthAddress): Promise<void> {
  const url = `${getApiBaseUrl()}/user/following/follow`;
  const body = JSON.stringify({ targetAddress });

  logger.debug('[followAddress] Request:', { url, body });

  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body,
  });

  await handleResponse(res);

  logger.debug('[followAddress] Request completed successfully');
}

/**
 * Unfollow a single wallet
 * POST /user/following/unfollow
 */
export async function unfollowAddress(targetAddress: EthAddress): Promise<void> {
  const url = `${getApiBaseUrl()}/user/following/unfollow`;
  const body = JSON.stringify({ targetAddress });

  logger.debug('[unfollowAddress] Request:', { url, body });

  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body,
  });

  await handleResponse(res);

  logger.debug('[unfollowAddress] Request completed successfully');
}

// ============================================================
// Labels/Annotations API
// ============================================================

/**
 * Get all address labels/annotations
 *
 * Combines data from:
 * - GET /user/remarks (for notes)
 * - GET /user/labels (for custom tags)
 *
 * Filters out empty entries (no note AND no tags) to prevent displaying useless annotations.
 */
export async function getAddressLabels(): Promise<Record<string, AddressAnnotation>> {
  try {
    // Fetch both endpoints in parallel
    const [remarks, userLabels] = await Promise.all([
      getAllRemarks().catch((err) => {
        logger.warn('[getAddressLabels] Failed to fetch remarks, using empty array:', err);
        return [];
      }),
      labelsApi.getAllUserLabels().catch((err) => {
        logger.warn('[getAddressLabels] Failed to fetch labels, using empty array:', err);
        return [];
      }),
    ]);

    // Ensure both are arrays
    const remarksArray = Array.isArray(remarks) ? remarks : [];
    const labelsArray = Array.isArray(userLabels) ? userLabels : [];

    // Build annotations map from both sources
    const annotations: Record<string, AddressAnnotation> = {};

    // Add remarks (notes) - skip empty remarks
    for (const remark of remarksArray) {
      if (!remark.targetAddress) continue;
      // Skip empty remarks (after trimming whitespace)
      if (!remark.remark || remark.remark.trim() === '') continue;

      const normalized = remark.targetAddress.toLowerCase();
      annotations[normalized] = {
        note: remark.remark,
        customTags: [],
        updatedAt: remark.updatedAt ? new Date(remark.updatedAt).toISOString() : new Date().toISOString(),
      };
    }

    // Add labels (custom tags) - skip empty label arrays
    for (const labelEntry of labelsArray) {
      if (!labelEntry.targetAddress) continue;
      // Skip entries with no labels
      if (!labelEntry.labels || labelEntry.labels.length === 0) continue;

      const normalized = labelEntry.targetAddress.toLowerCase();

      if (annotations[normalized]) {
        // Merge with existing remark entry
        annotations[normalized].customTags = labelEntry.labels ?? [];
        // Use the latest updatedAt
        if (labelEntry.updatedAt) {
          const existingTime = new Date(annotations[normalized].updatedAt).getTime();
          const newTime = new Date(labelEntry.updatedAt).getTime();
          if (newTime > existingTime) {
            annotations[normalized].updatedAt = new Date(labelEntry.updatedAt).toISOString();
          }
        }
      } else {
        // Create new entry
        annotations[normalized] = {
          note: undefined,
          customTags: labelEntry.labels ?? [],
          updatedAt: labelEntry.updatedAt ? new Date(labelEntry.updatedAt).toISOString() : new Date().toISOString(),
        };
      }
    }

    return annotations;
  } catch (error) {
    logger.error('[getAddressLabels] Failed to fetch annotations:', error);
    return {};
  }
}

/**
 * Set note and custom tags for an address
 *
 * Uses separate APIs:
 * - POST /user/remarks for note
 * - PUT /user/labels for custom tags
 */
export async function setAddressLabel(
  targetAddress: EthAddress,
  note?: string,
  customTags?: string[]
): Promise<void> {
  // Execute both API calls in parallel
  await Promise.all([
    // Set note via remarks API
    setRemark(targetAddress, note ?? ''),

    // Set labels via labels API
    labelsApi.setLabels(targetAddress, customTags ?? []),
  ]);
}

/**
 * Delete labels for an address
 *
 * Uses separate APIs:
 * - DELETE /user/remarks/{targetAddress} for note
 * - DELETE /user/labels/{targetAddress} for custom tags
 */
export async function deleteAddressLabel(targetAddress: EthAddress): Promise<void> {
  // Execute both API calls in parallel
  await Promise.all([
    // Delete note via remarks API
    deleteRemark(targetAddress),

    // Delete labels via labels API
    labelsApi.clearAllLabels(targetAddress),
  ]);
}

// ============================================================
// Combined API
// ============================================================

/**
 * Fetch complete user data (following + labels + remarks)
 *
 * This combines data from:
 * - GET /user/profile (for following list)
 * - GET /user/remarks (for notes)
 * - GET /user/labels (for custom tags)
 */
export async function getUserData(): Promise<UserData> {
  try {
    // Fetch both endpoints in parallel
    const [following, annotations] = await Promise.all([
      getFollowingList(),
      getAddressLabels(),
    ]);

    return {
      version: 1,
      following,
      annotations,
      lastSyncedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('[getUserData] Failed to fetch user data:', error);

    // If token is invalid, return empty data
    if (error instanceof Error && error.message.includes('Authentication')) {
      return EMPTY_USER_DATA;
    }

    throw error;
  }
}
