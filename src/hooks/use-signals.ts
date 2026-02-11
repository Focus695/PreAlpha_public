/**
 * Signals Hook
 */

import { useQuery } from '@tanstack/react-query';
import type { Signal, ApiResponse } from '@/types';
import { apiClient } from '@/lib/api-client';

interface UseSignalsOptions {
  platform?: 'polymarket' | 'opinion';
  type?: string;
  minStrength?: number;
  limit?: number;
}

export function useSignals(options: UseSignalsOptions = {}) {
  return useQuery<ApiResponse<Signal[]>>({
    queryKey: ['signals', options],
    queryFn: () => apiClient.getSignals(options),
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}
