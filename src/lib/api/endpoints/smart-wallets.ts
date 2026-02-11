/**
 * Smart Wallets API Endpoint
 * /smart-wallets/
 */

import { fetchApi } from '../client';
import type {
  SmartWalletsResponse,
  SmartWalletsOptions,
  SmartWalletDetailResponse,
} from '../types';

/**
 * Build query string from options
 */
function buildQueryParams(options: SmartWalletsOptions): string {
  const params = new URLSearchParams();

  if (options.page !== undefined) params.append('page', String(options.page));
  if (options.pageSize !== undefined) params.append('pageSize', String(options.pageSize));
  if (options.sortBy) params.append('sortBy', options.sortBy);
  if (options.sortOrder) params.append('sortOrder', options.sortOrder);
  if (options.minSmartScore !== undefined) params.append('minSmartScore', String(options.minSmartScore));
  if (options.minRoi !== undefined) params.append('minRoi', String(options.minRoi));
  if (options.minWinRate !== undefined) params.append('minWinRate', String(options.minWinRate));
  if (options.hasSmartScore !== undefined) params.append('hasSmartScore', String(options.hasSmartScore));
  if (options.search) params.append('search', options.search);

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Get smart wallets list with pagination and filtering
 */
export async function getSmartWallets(
  options: SmartWalletsOptions = {}
): Promise<SmartWalletsResponse> {
  const query = buildQueryParams(options);
  return fetchApi<SmartWalletsResponse>(`/smart-wallets/${query}`);
}

/**
 * Get single smart wallet details by address
 * Returns the wrapped response format: { error: "", wallet: {...} }
 * Note: API expects address WITH 0x prefix
 *
 * 404 is treated as "wallet not found" and returns { wallet: null } instead of throwing,
 * allowing the caller to implement fallback logic (e.g., to leaderboard API).
 */
export async function getSmartWallet(address: string): Promise<SmartWalletDetailResponse> {
  const normalizedAddress = address.startsWith('0x')
    ? address.toLowerCase()
    : `0x${address.toLowerCase()}`;

  try {
    return await fetchApi<SmartWalletDetailResponse>(`/smart-wallets/${normalizedAddress}`);
  } catch (error: any) {
    // 404 means the address is not in the smart-wallets database
    // Return null to allow fallback to other APIs (e.g., leaderboard)
    if (error?.status === 404) {
      return {
        error: '',
        wallet: null,
      };
    }
    // Re-throw other errors (5xx, network errors, etc.)
    throw error;
  }
}

/**
 * Get smart wallets statistics overview
 */
export async function getSmartWalletsStatsOverview(): Promise<{
  error: string;
  stats: {
    total: number | string;
    withSmartScore: number | string;
    avgSmartScore: number;
    avgRoi: number;
    avgWinRate: number;
    avgPnl: number;
  };
}> {
  return fetchApi(`/smart-wallets/stats/overview`);
}

export const smartWalletsApi = {
  getSmartWallets,
  getSmartWallet,
  getSmartWalletsStatsOverview,
} as const;
