/**
 * Address Signals Hook with Priority-Based Polling
 *
 * Fetches trades for multiple addresses and converts them to signals.
 * Implements 5-tier priority-based polling based on smartScore:
 * - Tier 1 (>60): 5s interval
 * - Tier 2 (50-60): 10s interval
 * - Tier 3 (40-50): 20s interval
 * - Tier 4 (30-40): 30s interval
 * - Tier 5 (<30): 60s interval
 */

import { useMemo } from 'react';
import { useQueries, keepPreviousData } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import type { EthAddress, Signal } from '@/types';
import { apiClient, type UserTrade } from '@/lib/api-client';
import { tradeToSignal } from '@/lib/signal-transformers';

// ============================================================
// Types
// ============================================================

interface UseAddressSignalsOptions {
  lookbackMinutes?: number;
  limitPerAddress?: number;
  batchSize?: number; // 批次大小，默认5
  batchDelayMs?: number; // 批次间延迟（毫秒），默认100ms
  addressSmartScores?: Record<string, number>; // 地址 -> smartScore 映射
}

interface UseAddressSignalsResult {
  signals: Signal[];
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
}

interface PriorityTier {
  name: string;
  addresses: string[];
  pollInterval: number;
}

// ============================================================
// Constants
// ============================================================

const DEFAULT_LOOKBACK_MINUTES = 60;
const DEFAULT_LIMIT_PER_ADDRESS = 50;
const DEFAULT_BATCH_SIZE = 5;
const DEFAULT_BATCH_DELAY_MS = 100;

// 5-tier priority thresholds and intervals
const TIER1_THRESHOLD = 60;  // > 60
const TIER2_THRESHOLD = 50;  // 50-60
const TIER3_THRESHOLD = 40;  // 40-50
const TIER4_THRESHOLD = 30;  // 30-40
// < 30

// 轮询间隔（降低请求速率以符合 15 TPS 限制）
// 20个钱包最坏情况：20 / 15秒 ≈ 1.33 TPS
const TIER1_INTERVAL_MS = 15_000;   // 15 seconds
const TIER2_INTERVAL_MS = 30_000;   // 30 seconds
const TIER3_INTERVAL_MS = 60_000;   // 1 minute
const TIER4_INTERVAL_MS = 90_000;   // 1.5 minutes
const TIER5_INTERVAL_MS = 150_000;  // 2.5 minutes

// ============================================================
// Helper Functions
// ============================================================

/**
 * Group addresses into 5 priority tiers based on smartScore
 */
function groupAddressesByPriority(
  addresses: string[],
  smartScores: Record<string, number>
): PriorityTier[] {
  const tier1: string[] = [];  // > 60
  const tier2: string[] = [];  // 50-60
  const tier3: string[] = [];  // 40-50
  const tier4: string[] = [];  // 30-40
  const tier5: string[] = [];  // < 30

  addresses.forEach((addr) => {
    const normalizedAddr = addr.toLowerCase();
    const score = smartScores[normalizedAddr] ?? 0;

    if (score > TIER1_THRESHOLD) {
      tier1.push(normalizedAddr);
    } else if (score > TIER2_THRESHOLD) {
      tier2.push(normalizedAddr);
    } else if (score > TIER3_THRESHOLD) {
      tier3.push(normalizedAddr);
    } else if (score > TIER4_THRESHOLD) {
      tier4.push(normalizedAddr);
    } else {
      tier5.push(normalizedAddr);
    }
  });

  return [
    { name: 'tier1', addresses: tier1, pollInterval: TIER1_INTERVAL_MS },
    { name: 'tier2', addresses: tier2, pollInterval: TIER2_INTERVAL_MS },
    { name: 'tier3', addresses: tier3, pollInterval: TIER3_INTERVAL_MS },
    { name: 'tier4', addresses: tier4, pollInterval: TIER4_INTERVAL_MS },
    { name: 'tier5', addresses: tier5, pollInterval: TIER5_INTERVAL_MS },
  ];
}

/**
 * Fetch trades for a batch of addresses with smartScore mapping
 */
async function fetchTradesForAddresses(
  addresses: string[],
  smartScores: Record<string, number>,
  options: {
    limitPerAddress: number;
    batchSize: number;
    batchDelayMs: number;
    cutoffTimestamp: number;
  }
): Promise<Signal[]> {
  if (addresses.length === 0) {
    return [];
  }

  const { limitPerAddress, batchSize, batchDelayMs, cutoffTimestamp } = options;
  const tradesArrays: Array<{ trades: UserTrade[]; smartScore: number }> = [];
  const errors: Error[] = [];

  // 将地址数组按批次大小分组，依次处理
  for (let i = 0; i < addresses.length; i += batchSize) {
    const batch = addresses.slice(i, i + batchSize);

    // 批次内并发请求
    const batchResults = await Promise.allSettled(
      batch.map(async (address) => {
        const response = await apiClient.getUserTrades(address, {
          page: 1,
          limit: limitPerAddress,
        });
        return {
          address,
          trades: response.items ?? [],
          smartScore: smartScores[address] ?? 0,
        };
      })
    );

    // 处理批次结果
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        tradesArrays.push({
          trades: result.value.trades,
          smartScore: result.value.smartScore,
        });
      } else {
        const error = result.reason instanceof Error
          ? result.reason
          : new Error(String(result.reason));
        errors.push(error);
      }
    });

    // 批次间延迟（最后一个批次不需要延迟）
    if (i + batchSize < addresses.length) {
      await new Promise((resolve) => setTimeout(resolve, batchDelayMs));
    }
  }

  // 如果有错误，在控制台记录（但不中断流程）
  if (errors.length > 0) {
    logger.warn(
      `[useAddressSignals] ${errors.length} address(es) failed to fetch trades:`,
      errors
    );
  }

  // Convert trades to signals with smartScore
  const signals: Signal[] = [];
  for (const { trades, smartScore } of tradesArrays) {
    for (const trade of trades) {
      const tradeTime = new Date(trade.createdAt).getTime();
      logger.debug('[useAddressSignals] trade:', {
        tradeTime: new Date(tradeTime).toISOString(),
        cutoffTime: new Date(cutoffTimestamp).toISOString(),
        passed: tradeTime >= cutoffTimestamp,
      });
      if (!Number.isNaN(tradeTime) && tradeTime >= cutoffTimestamp) {
        signals.push(tradeToSignal(trade, smartScore));
      }
    }
  }

  logger.debug('[useAddressSignals] fetchTradesForAddresses result:', {
    totalTradesReceived: tradesArrays.reduce((sum, t) => sum + t.trades.length, 0),
    signalsAfterFilter: signals.length,
    cutoffTimestamp: new Date(cutoffTimestamp).toISOString(),
  });

  return signals;
}

// ============================================================
// Hook
// ============================================================

export function useAddressSignals(
  addresses: (EthAddress | string)[],
  options: UseAddressSignalsOptions = {}
): UseAddressSignalsResult {
  const lookbackMinutes = options.lookbackMinutes ?? DEFAULT_LOOKBACK_MINUTES;
  const limitPerAddress = options.limitPerAddress ?? DEFAULT_LIMIT_PER_ADDRESS;
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const batchDelayMs = options.batchDelayMs ?? DEFAULT_BATCH_DELAY_MS;
  const addressSmartScores = options.addressSmartScores ?? {};

  const normalizedAddresses = useMemo(() => {
    return addresses
      .filter(Boolean)
      .map((addr) => addr.toLowerCase())
      .sort();
  }, [addresses]);

  const cutoffTimestamp = Date.now() - lookbackMinutes * 60 * 1000;

  // Group addresses by priority tier
  const priorityTiers = useMemo(() => {
    return groupAddressesByPriority(normalizedAddresses, addressSmartScores);
  }, [normalizedAddresses, addressSmartScores]);

  // Create separate queries for each priority tier
  const queries = useQueries({
    queries: priorityTiers.map((tier) => ({
      queryKey: [
        'address-signals',
        tier.name,
        tier.addresses.sort().join(','),
        lookbackMinutes,
        limitPerAddress,
      ],
      queryFn: () =>
        fetchTradesForAddresses(tier.addresses, addressSmartScores, {
          limitPerAddress,
          batchSize,
          batchDelayMs,
          cutoffTimestamp,
        }),
      enabled: tier.addresses.length > 0,
      refetchInterval: tier.pollInterval,
      refetchIntervalInBackground: true,
      staleTime: tier.pollInterval / 2,
      gcTime: 5 * 60 * 1000,
      placeholderData: keepPreviousData,
    })),
  });

  // Merge results from all tiers
  const signals = useMemo(() => {
    const allSignals = queries.flatMap((q) => q.data ?? []);

    // Debug: log query data
    queries.forEach((q, i) => {
      logger.debug(`[useAddressSignals] query ${i}:`, {
        dataLength: q.data?.length ?? 0,
        isLoading: q.isLoading,
        isFetching: q.isFetching,
        hasError: !!q.error,
      });
    });

    const dedupedMap = new Map<string, Signal>();

    allSignals
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .forEach((signal) => {
        if (!dedupedMap.has(signal.id)) {
          dedupedMap.set(signal.id, signal);
        }
      });

    const result = Array.from(dedupedMap.values());
    logger.debug('[useAddressSignals] merged signals:', {
      totalBeforeDedupe: allSignals.length,
      totalAfterDedupe: result.length,
      lookbackMinutes,
      cutoffTimestamp: new Date(cutoffTimestamp).toISOString(),
    });

    return result;
  }, [queries, cutoffTimestamp, lookbackMinutes]);

  const isLoading = queries.some((q) => q.isLoading);
  const isFetching = queries.some((q) => q.isFetching);
  const errors = queries.map((q) => q.error).filter(Boolean);
  const error = errors.length > 0 ? errors : undefined;

  const refetch = async () => {
    await Promise.all(queries.map((q) => q.refetch()));
  };

  return {
    signals,
    isLoading,
    isFetching,
    error,
    refetch,
  };
}
