/**
 * Remarks API Endpoints
 *
 * API endpoints for managing user's wallet remarks (备注).
 */

import { getApiBaseUrl } from '@/lib/api-config';
import { getAuthToken } from '@/lib/auth/authentication-adapter';
import { logger } from '@/lib/logger';
import type { EthAddress } from '@/types';

// ============================================================
// Type Definitions for API Responses
// ============================================================

/**
 * Remark entry from API
 */
export interface ApiRemarkEntry {
  /** Target wallet address */
  targetAddress: string;
  /** Remark content (max 200 chars) */
  remark: string;
  /** Creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
}

/**
 * Single remark for a wallet
 */
export interface WalletRemark {
  targetAddress: string;
  remark: string;
  createdAt?: number;
  updatedAt?: number;
}

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
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_address');
    throw new Error('Authentication token invalid or expired');
  }

  if (!res.ok) {
    const errorText = await res.text();
    logger.error('[Remarks API Error]', res.status, errorText);
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
// Remarks API Functions
// ============================================================

/**
 * Get all remarks for the current user
 * GET /user/remarks
 *
 * Returns all user's remarks
 */
export async function getAllRemarks(): Promise<ApiRemarkEntry[]> {
  const res = await fetch(`${getApiBaseUrl()}/user/remarks`, {
    headers: getAuthHeaders(),
  });

  const result = await handleResponse<ApiRemarkEntry[]>(res);

  // Handle null, undefined, or non-array responses
  if (!Array.isArray(result)) {
    logger.warn('[getAllRemarks] Expected array, got:', typeof result, result);
    return [];
  }

  return result;
}

/**
 * Get remark for a specific wallet address
 * GET /user/remarks/{targetAddress}
 */
export async function getRemark(targetAddress: EthAddress): Promise<WalletRemark | null> {
  const res = await fetch(`${getApiBaseUrl()}/user/remarks/${targetAddress}`, {
    headers: getAuthHeaders(),
  });

  if (res.status === 404) {
    return null;
  }

  const result = await handleResponse<WalletRemark>(res);

  if (!result || !result.remark) {
    return null;
  }

  return result;
}

/**
 * Add or update a remark for a wallet
 * POST /user/remarks
 *
 * Each user can have only one remark per wallet address.
 */
export async function setRemark(
  targetAddress: EthAddress,
  remark: string
): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/user/remarks`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      targetAddress,
      remark: remark?.trim() || '',
    }),
  });

  await handleResponse(res);
}

/**
 * Delete remark for a wallet
 * DELETE /user/remarks/{targetAddress}
 */
export async function deleteRemark(targetAddress: EthAddress): Promise<boolean> {
  const res = await fetch(`${getApiBaseUrl()}/user/remarks/${targetAddress}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  const result = await handleResponse<{ deleted: boolean }>(res);
  return result.deleted;
}

/**
 * Search remarks by keyword
 * GET /user/remarks/search/{keyword}
 *
 * Searches remarks with fuzzy matching on the keyword.
 */
export async function searchRemarks(keyword: string): Promise<ApiRemarkEntry[]> {
  const res = await fetch(`${getApiBaseUrl()}/user/remarks/search/${keyword}`, {
    headers: getAuthHeaders(),
  });

  const result = await handleResponse<ApiRemarkEntry[]>(res);

  if (!Array.isArray(result)) {
    return [];
  }

  return result;
}
