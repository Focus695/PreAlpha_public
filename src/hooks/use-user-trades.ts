/**
 * User Trades Hook
 *
 * 获取用户交易历史，用于 TraderDrawer 的 History tab
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient, type UserTrade } from '@/lib/api-client';
import {
  transformUserTrades,
  type DisplayTrade,
} from '@/lib/api-transformers';
import type { DataSourceType } from '@/lib/address-profile-utils';

interface UseUserTradesOptions {
  page?: number;
  limit?: number;
  marketId?: number;
  chainId?: string;
  enabled?: boolean; // 是否启用查询，用于延迟加载
}

interface UseUserTradesResult {
  trades: DisplayTrade[];
  rawTrades: UserTrade[];
  total: number;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  dataSource: DataSourceType;
  hasMore: boolean;
}

/**
 * 获取用户交易历史
 *
 * @param walletAddress - 钱包地址
 * @param options - 查询选项
 * @returns 交易数据和状态
 */
export function useUserTrades(
  walletAddress: string | undefined,
  options: UseUserTradesOptions = {}
): UseUserTradesResult {
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const marketId = options.marketId;
  const chainId = options.chainId;

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['user-trades', walletAddress, page, limit, marketId, chainId],
    queryFn: async () => {
      if (!walletAddress) {
        return { items: [], total: 0, page: 1, limit, hasMore: false };
      }
      return apiClient.getUserTrades(walletAddress, {
        page,
        limit,
        marketId,
        chainId,
      });
    },
    enabled: (options.enabled !== false) && !!walletAddress, // 默认启用，除非明确设置为 false
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: keepPreviousData,
  });

  const rawTrades = data?.items ?? [];
  const trades = transformUserTrades(rawTrades);
  const dataSource =
    ((data as { __source?: DataSourceType })?.__source as DataSourceType | undefined) ?? 'api';

  return {
    trades,
    rawTrades,
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    isError,
    error: error as Error | null,
    refetch,
    dataSource,
    hasMore: data?.hasMore ?? false,
  };
}
