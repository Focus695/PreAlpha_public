/**
 * Trader performance hook
 *
 * Fetches PnL time-series data for a given trader with API fallback handling
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { TimeRange } from '@/types';
import { apiClient } from '@/lib/api-client';

export type TraderPerformanceRange = '1D' | '1W' | '1M' | 'All';

export interface TraderPerformancePoint {
  date: Date;
  pnl: number;
}

interface TraderPerformanceApiPoint {
  timestamp: string;
  pnl: number;
  cumulativePnl?: number;
}

const RANGE_TO_API_RANGE: Record<TraderPerformanceRange, TimeRange> = {
  '1D': '24h',
  '1W': '7d',
  '1M': '30d',
  All: 'all',
};

function normalizeApiPoints(points?: TraderPerformanceApiPoint[]): TraderPerformancePoint[] {
  if (!points?.length) {
    return [];
  }

  return points
    .map((point) => {
      const date = new Date(point.timestamp);
      if (Number.isNaN(date.getTime())) {
        return null;
      }

      return {
        date,
        pnl: Number.isFinite(point.pnl) ? point.pnl : 0,
      };
    })
    .filter((point): point is TraderPerformancePoint => Boolean(point))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function useTraderPerformance(address?: string, range: TraderPerformanceRange = '1M') {
  return useQuery<TraderPerformancePoint[]>({
    queryKey: ['trader-performance', address, range],
    enabled: Boolean(address),
    queryFn: async () => {
      if (!address) {
        return [];
      }

      const response = await apiClient.getTraderPerformance(address, {
        range: RANGE_TO_API_RANGE[range],
      });

      if (!response.success) {
        throw new Error('Failed to fetch trader performance');
      }

      return normalizeApiPoints(response.data);
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

