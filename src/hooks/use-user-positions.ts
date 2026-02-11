/**
 * User Positions Hook
 *
 * 获取用户持仓数据，用于 TraderDrawer 和 HoldingsTable
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient, type UserPosition } from '@/lib/api-client';
import {
  transformUserPositions,
  type DisplayPosition,
} from '@/lib/api-transformers';
import type { DataSourceType } from '@/lib/address-profile-utils';

interface UseUserPositionsOptions {
  page?: number;
  limit?: number;
  marketId?: number;
  chainId?: string;
}

interface UseUserPositionsResult {
  positions: DisplayPosition[];
  rawPositions: UserPosition[];
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
 * 获取用户持仓
 *
 * @param walletAddress - 钱包地址
 * @param options - 查询选项
 * @returns 持仓数据和状态
 */
export function useUserPositions(
  walletAddress: string | undefined,
  options: UseUserPositionsOptions = {}
): UseUserPositionsResult {
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const marketId = options.marketId ?? 0;
  const chainId = options.chainId ?? '';

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['user-positions', walletAddress, page, limit, marketId, chainId],
    queryFn: async () => {
      if (!walletAddress) {
        return { items: [], total: 0, page: 1, limit, hasMore: false };
      }
      return apiClient.getUserPositions(walletAddress, {
        page,
        limit,
        marketId,
        chainId,
      });
    },
    enabled: !!walletAddress,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: keepPreviousData,
  });

  const rawPositions = data?.items ?? [];
  const positions = transformUserPositions(rawPositions);
  const dataSource =
    ((data as { __source?: DataSourceType })?.__source as DataSourceType | undefined) ?? 'api';

  return {
    positions,
    rawPositions,
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
