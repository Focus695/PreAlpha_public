/**
 * Trade API Endpoints
 */

import { fetchApi, convertOpinionTrade, normalizeListResponse, buildMockPaginatedResponse } from '../client';
import { withMockFallback } from '../health';
import { generateMockUserTrades } from '../mock';
import type { UserTrade, PaginatedApiResponse } from '../types';

export const tradesApi = {
  /**
   * Get user trade history
   * GET /trade/user/{walletAddress}
   */
  async getUserTrades(
    walletAddress: string,
    options: {
      page?: number;
      limit?: number;
      marketId?: number;
      chainId?: string;
    } = {}
  ): Promise<PaginatedApiResponse<UserTrade>> {
    return withMockFallback(
      'userTrades',
      async () => {
        const params = new URLSearchParams();
        if (options.page !== undefined) params.set('page', String(options.page));
        if (options.limit !== undefined) params.set('limit', String(options.limit));
        if (options.marketId !== undefined) params.set('marketId', String(options.marketId));
        if (options.chainId) params.set('chainId', options.chainId);

        const query = params.toString();
        const response = await fetchApi<unknown>(
          `/trade/user/${walletAddress}${query ? `?${query}` : ''}`
        );
        return normalizeListResponse<UserTrade>(response, (item, index) =>
          convertOpinionTrade(item, walletAddress, index)
        );
      },
      () => {
        const count = options.limit && options.limit > 0 ? options.limit : 6;
        const items = generateMockUserTrades(walletAddress, count);
        return buildMockPaginatedResponse(items);
      }
    );
  },
};
