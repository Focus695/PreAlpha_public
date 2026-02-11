/**
 * Address Profile API Endpoints
 */

import type { AddressProfile, ApiResponse, TimeRange } from '@/types';
import { fetchApi, normalizeAddressForApi } from '../client';
import { withMockFallback } from '../health';
import { getMockAddressProfile, getMockTraderPerformance } from '../mock';
import type { AddressPerformancePoint } from '../types';
import { smartWalletsApi } from './smart-wallets';
import { leaderboardApi } from './leaderboard';
import { tradesApi } from './trades';
import { smartWalletToAddressProfile, leaderboardProfileToAddressProfile, updateLastActiveFromTrades } from '@/lib/transformers/smart-wallets';
import { logger } from '@/lib/logger';

// ============================================================
// Helper Functions
// ============================================================

/**
 * 获取地址的最新交易时间
 * @param address - 钱包地址
 * @returns 最新交易的创建时间，如果没有交易则返回 null
 */
async function getLatestTradeTime(address: string): Promise<Date | null> {
  try {
    const response = await tradesApi.getUserTrades(address, { limit: 1 });
    if (response.items && response.items.length > 0) {
      return new Date(response.items[0].createdAt);
    }
  } catch (error) {
    logger.warn(`[profileApi] Failed to get latest trade time for ${address}:`, error);
  }
  return null;
}

export const profileApi = {
  /**
   * Get address profile with fallback logic:
   * 1. Try /smart-wallets/{address} first (enriched data)
   * 2. If wallet is null or error, fallback to /leaderboard/user/{walletAddress}/profile
   * 3. Finally fallback to mock data
   */
  async getAddressProfile(
    address: string,
    platform?: string
  ): Promise<ApiResponse<AddressProfile | null>> {
    return withMockFallback(
      'addressProfile',
      async () => {
        // Try smart-wallets API first (enriched data)
        const smartWalletResponse = await smartWalletsApi.getSmartWallet(address);

        if (smartWalletResponse.wallet) {
          const wallet = smartWalletResponse.wallet;
          let profile = smartWalletToAddressProfile(wallet);

          // 获取实际交易活跃时间（非阻塞，失败时使用 last_sync_at）
          const latestTradeTime = await getLatestTradeTime(address);
          profile = updateLastActiveFromTrades(profile, latestTradeTime);

          return {
            success: true,
            data: profile,
            meta: {
              timestamp: new Date().toISOString(),
              requestId: 'smart-wallets-api',
              // Include extra fields that are not in AddressProfile type
              extraFields: {
                userName: wallet.user_name ?? undefined,
                avatarUrl: wallet.avatar_url ?? undefined,
                netWorth: parseFloat(wallet.net_worth),
                follower: wallet.follower_count,
                following: wallet.following_count,
                followed: wallet.followed,
              },
            },
          };
        }

        // If wallet is null/undefined, try fallback to leaderboard API
        try {
          const leaderboardResponse = await leaderboardApi.getUserProfile(address);

          if (leaderboardResponse?.result) {
            const result = leaderboardResponse.result;
            let profile = leaderboardProfileToAddressProfile(result);

            // 获取实际交易活跃时间
            const latestTradeTime = await getLatestTradeTime(address);
            profile = updateLastActiveFromTrades(profile, latestTradeTime);

            return {
              success: true,
              data: profile,
              meta: {
                timestamp: new Date().toISOString(),
                requestId: 'leaderboard-api-fallback',
                // Include extra fields from leaderboard API
                extraFields: {
                  userName: result.userName ?? undefined,
                  avatarUrl: result.avatarUrl ?? undefined,
                  netWorth: result.netWorth ? parseFloat(result.netWorth) : undefined,
                  follower: result.follower ?? 0,
                  following: result.following ?? 0,
                  followed: result.followed ?? false,
                },
              },
            };
          }
        } catch (fallbackError: any) {
          // Fallback also failed, return null
          // This allows the page to build profile from positions/trades data
          return {
            success: true,
            data: null,
            meta: {
              timestamp: new Date().toISOString(),
              requestId: 'api-404',
            },
          };
        }

        // Both APIs returned null/empty, return null to allow fallback to derived profile
        return {
          success: true,
          data: null,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: 'api-empty',
          },
        };
      },
      () => {
        const profile = getMockAddressProfile(address, platform as 'polymarket' | 'opinion');
        return {
          success: true,
          data: profile,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: 'mock',
          },
        };
      }
    );
  },

  /**
   * Get address performance (PnL time series)
   * Note: API expects address WITH 0x prefix
   */
  async getTraderPerformance(
    address: string,
    options: {
      range?: TimeRange;
    } = {}
  ): Promise<ApiResponse<AddressPerformancePoint[]>> {
    return withMockFallback(
      'traderPerformance',
      async () => {
        const params = new URLSearchParams();
        if (options.range) params.set('range', options.range);

        const normalizedAddress = normalizeAddressForApi(address);
        const query = params.toString();
        return fetchApi(`/addresses/${normalizedAddress}/performance${query ? `?${query}` : ''}`);
      },
      () => {
        // Map TimeRange to mock-supported ranges (1y maps to all)
        const rangeMap: Record<string, '7d' | '30d' | '90d' | 'all'> = {
          '7d': '7d',
          '30d': '30d',
          '90d': '90d',
          '1y': 'all',
          'all': 'all',
        };
        const mockRange = rangeMap[options.range ?? '30d'] ?? '30d';
        const points = getMockTraderPerformance(address, mockRange);
        return {
          success: true,
          data: points.map((p) => ({
            timestamp: p.timestamp,
            pnl: p.cumulativePnl,
            cumulativePnl: p.cumulativePnl,
          })),
          meta: {
            timestamp: new Date().toISOString(),
            requestId: 'mock',
          },
        };
      }
    );
  },
};
