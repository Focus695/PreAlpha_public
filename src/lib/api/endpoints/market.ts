/**
 * Market API Endpoints
 */

import { fetchApi } from '../client';
import type {
  MarketItem,
  BinaryMarketDetail,
  CategoricalMarketDetail,
  PaginatedApiResponse,
  MarketStatusFilter,
  MarketTypeFilter,
  MarketSortBy,
} from '../types';

export const marketApi = {
  /**
   * Get market list with pagination and filters
   * GET /market/
   */
  async getMarkets(
    options: {
      page?: number;
      limit?: number;
      status?: MarketStatusFilter;
      marketType?: MarketTypeFilter;
      sortBy?: MarketSortBy;
      chainId?: string;
    } = {}
  ): Promise<PaginatedApiResponse<MarketItem>> {
    const params = new URLSearchParams();
    if (options.page !== undefined) params.set('page', String(options.page));
    if (options.limit !== undefined) params.set('limit', String(options.limit));
    if (options.status) params.set('status', options.status);
    if (options.marketType) params.set('marketType', options.marketType);
    if (options.sortBy) params.set('sortBy', options.sortBy);
    if (options.chainId) params.set('chainId', options.chainId);

    const query = params.toString();
    return fetchApi(`/market/${query ? `?${query}` : ''}`);
  },

  /**
   * Get binary market detail
   * GET /market/{marketId}
   */
  async getBinaryMarket(marketId: number | string): Promise<BinaryMarketDetail> {
    return fetchApi(`/market/${marketId}`);
  },

  /**
   * Get categorical market detail with sub-markets
   * GET /market/categorical/{marketId}
   */
  async getCategoricalMarket(marketId: number | string): Promise<CategoricalMarketDetail> {
    return fetchApi(`/market/categorical/${marketId}`);
  },
};
