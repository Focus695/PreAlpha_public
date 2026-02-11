/**
 * Volume Distribution Hook
 *
 * 获取用户板块分布数据，用于 AddressDetailPage 的 SectorAllocationCard
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient, type CategoryDistributionResponse } from '@/lib/api-client';

interface UseVolumeDistributionResult {
  volumeDistribution: CategoryDistributionResponse['volumeDistribution'];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Fetch user category distribution from Smart Wallets API
 * GET /smart-wallets/{address}/category-distribution
 */
export function useVolumeDistribution(walletAddress: string | undefined): UseVolumeDistributionResult {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['category-distribution', walletAddress],
    queryFn: async () => {
      if (!walletAddress) {
        return {
          error: '',
          volumeDistribution: [],
        } as CategoryDistributionResponse;
      }
      return apiClient.getCategoryDistribution(walletAddress);
    },
    enabled: !!walletAddress,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    volumeDistribution: data?.volumeDistribution ?? [],
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}

