/**
 * Leaderboard Hook
 *
 * 从远程 API 获取聪明钱包排行榜数据，并转换为前端内部类型
 * 使用新的 /smart-wallets/ API，支持服务端分页和排序
 */

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { logger } from '@/lib/logger';
import type { LeaderboardEntry } from '@/types';
import type { SmartWalletSortBy } from '@/lib/api';
import { apiClient } from '@/lib/api-client';
import { getMockLeaderboardResponse } from '@/lib/mock-database';
import { transformSmartWalletsResponse } from '@/lib/transformers/leaderboard';
import { preloadImageUrls } from '@/lib/image-preloader';

interface UseLeaderboardOptions {
  platform?: 'polymarket' | 'opinion';
  timeRange?: '1d' | '7d' | '30d' | 'all';
  limit?: number;
  // Smart Wallets API options
  page?: number;
  pageSize?: number;
  sortBy?: SmartWalletSortBy;
  sortOrder?: 'asc' | 'desc';
}

/** Data source tag for tracking where data came from */
type DataSourceTag = 'api' | 'mock';

/** Response with pagination metadata */
export interface LeaderboardResponseWithMeta {
  data: LeaderboardEntry[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  __source?: DataSourceTag;
}

export function useLeaderboard(options: UseLeaderboardOptions = {}) {
  const queryResult = useQuery<LeaderboardResponseWithMeta>({
    queryKey: ['leaderboard', 'smart-wallets', options],
    queryFn: async () => {
      const requestPage = options.page ?? 1;
      const requestPageSize = options.pageSize ?? 100;
      const requestSortBy = options.sortBy ?? 'total_profit';
      const requestSortOrder = options.sortOrder ?? 'desc';

      // Fetch from Smart Wallets API
      try {
        logger.debug(
          `[useLeaderboard] Fetching from Smart Wallets API (page=${requestPage}, pageSize=${requestPageSize}, sortBy=${requestSortBy})`
        );

        const apiResponse = await apiClient.getSmartWallets({
          page: requestPage,
          pageSize: requestPageSize,
          sortBy: requestSortBy,
          sortOrder: requestSortOrder,
        });

        const entries = transformSmartWalletsResponse(apiResponse);

        // Extract pagination metadata
        const total = typeof apiResponse.total === 'string'
          ? parseInt(apiResponse.total, 10)
          : apiResponse.total ?? 0;
        const page = apiResponse.page ?? requestPage;
        const pageSize = apiResponse.pageSize ?? requestPageSize;
        const hasMore = page * pageSize < total;

        logger.debug(`[useLeaderboard] Fetched ${entries.length} entries (total: ${total}, page: ${page}/${Math.ceil(total / pageSize)})`);

        return {
          data: entries,
          total,
          page,
          pageSize,
          hasMore,
          __source: 'api' as DataSourceTag,
        };
      } catch (error) {
        logger.error('[useLeaderboard] API failed, using mock data:', error);

        // Fallback to mock data
        const mockResponse = getMockLeaderboardResponse({
          platform: options.platform,
          timeRange: options.timeRange,
          limit: requestPageSize,
        });
        const entries = mockResponse.data ?? [];

        return {
          data: entries,
          total: entries.length,
          page: 1,
          pageSize: requestPageSize,
          hasMore: false,
          __source: 'mock' as DataSourceTag,
        };
      }
    },

    // Cache configuration: 5 minutes
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000 + 60000,
  });

  // Preload avatar images when data is fetched
  useEffect(() => {
    if (queryResult.data?.data) {
      const avatarUrls = queryResult.data.data
        .map((entry) => entry.profile.avatarUrl)
        .filter((url): url is string => Boolean(url));

      if (avatarUrls.length > 0) {
        // Preload avatars in background without blocking
        preloadImageUrls(avatarUrls).catch((error) => {
          // Silently fail - avatars will load normally on render
          logger.debug('[useLeaderboard] Avatar preloading failed (non-critical):', error);
        });
      }
    }
  }, [queryResult.data?.data]);

  return queryResult;
}
