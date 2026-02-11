/**
 * Positions API Endpoints
 */

import { fetchApi, convertOpinionPosition, normalizeListResponse, buildMockPaginatedResponse } from '../client';
import { withMockFallback } from '../health';
import { generateMockUserPositions } from '../mock';
import type { UserPosition, PaginatedApiResponse } from '../types';

export const positionsApi = {
  /**
   * Get user positions (portfolio)
   * GET /positions/user/{walletAddress}
   */
  async getUserPositions(
    walletAddress: string,
    options: {
      page?: number;
      limit?: number;
      marketId?: number;
      chainId?: string;
    } = {}
  ): Promise<PaginatedApiResponse<UserPosition>> {
    return withMockFallback(
      'userPositions',
      async () => {
        const page = options.page ?? 0;
        const limit = options.limit ?? 0;
        const marketId = options.marketId ?? 0;
        const chainId = options.chainId ?? '';

        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(limit));
        params.set('marketId', String(marketId));
        params.set('chainId', chainId);

        const query = params.toString();
        const response = await fetchApi<unknown>(
          `/positions/user/${walletAddress}${query ? `?${query}` : ''}`
        );
        return normalizeListResponse<UserPosition>(response, (item, index) =>
          convertOpinionPosition(item, walletAddress, index)
        );
      },
      () => {
        const count = options.limit && options.limit > 0 ? options.limit : 5;
        const items = generateMockUserPositions(walletAddress, count);
        return buildMockPaginatedResponse(items);
      }
    );
  },
};
