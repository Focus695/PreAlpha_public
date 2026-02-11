/**
 * Address Profile Hook
 *
 * Fetches address profile data with fallback logic:
 * 1. Try /smart-wallets/{address} first (enriched data)
 * 2. Fallback to /leaderboard/user/{walletAddress}/profile if wallet is null
 *
 * Returns both the transformed AddressProfile and the raw extra fields.
 */

import { useQuery } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import type { AddressProfile, ApiResponse } from '@/types';
import { apiClient } from '@/lib/api-client';
import { wrapAsApiResponse } from '@/lib/api-transformers';

interface UseAddressProfileResult {
  data: ApiResponse<AddressProfile | null> | undefined;
  extraFields: {
    userName?: string;
    avatarUrl?: string;
    netWorth?: number;
    follower?: number;
    following?: number;
    followed?: boolean;
  } | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useAddressProfile(
  address: string,
  platform?: 'polymarket' | 'opinion'
): UseAddressProfileResult {
  const query = useQuery<ApiResponse<AddressProfile | null>>({
    queryKey: ['address', address, platform],
    queryFn: async () => {
      if (!address) {
        return wrapAsApiResponse<AddressProfile | null>(null);
      }

      try {
        // Use the centralized apiClient method which handles Mock/Real switching
        const response = await apiClient.getAddressProfile(address, platform);
        return response;
      } catch (error) {
        // API errors are already logged in fetchApi with appropriate log levels
        // 404 errors are expected when address doesn't exist in database
        // and will be handled gracefully by returning null
        logger.debug(`[useAddressProfile] Fallback to null for ${address}`);
        return wrapAsApiResponse<AddressProfile | null>(null);
      }
    },
    enabled: !!address,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Extract extra fields from meta if available (from smart-wallets API)
  const extraFields = query.data?.meta?.extraFields as
    | {
        userName?: string;
        avatarUrl?: string;
        netWorth?: number;
        follower?: number;
        following?: number;
        followed?: boolean;
      }
    | null;

  return {
    data: query.data,
    extraFields: extraFields ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
