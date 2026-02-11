/**
 * Smart Wallets Stats Hook
 *
 * 获取聪明钱包统计数据
 */

import { useQuery } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { apiClient } from '@/lib/api-client';
import type { SmartWalletsStats } from '@/lib/api';

/**
 * 获取聪明钱包统计概览数据
 */
export function useSmartWalletsStats() {
  return useQuery<SmartWalletsStats>({
    queryKey: ['smart-wallets-stats'],
    queryFn: async () => {
      try {
        const response = await apiClient.getSmartWalletsStats();

        // Handle error in response
        if (response.error && typeof response.error === 'string' && response.error.length > 0) {
          logger.error('[useSmartWalletsStats] API error:', response.error);
          throw new Error(response.error);
        }

        return response.stats;
      } catch (error) {
        logger.error('[useSmartWalletsStats] Failed to fetch stats:', error);
        throw error;
      }
    },
    // Cache for 5 minutes
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000 + 60000,
  });
}
