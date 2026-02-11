/**
 * Token API Endpoints
 */

import { fetchApi } from '../client';
import type {
  TokenLatestPrice,
  OrderBook,
  PriceHistoryPoint,
  PriceHistoryInterval,
} from '../types';

export const tokenApi = {
  /**
   * Get latest price for a token
   * GET /token/latest-price
   */
  async getTokenLatestPrice(tokenId: string): Promise<TokenLatestPrice> {
    const params = new URLSearchParams({ token_id: tokenId });
    return fetchApi(`/token/latest-price?${params}`);
  },

  /**
   * Get order book for a token
   * GET /token/orderbook
   */
  async getTokenOrderbook(tokenId: string): Promise<OrderBook> {
    const params = new URLSearchParams({ token_id: tokenId });
    return fetchApi(`/token/orderbook?${params}`);
  },

  /**
   * Get price history for a token
   * GET /token/price-history
   */
  async getTokenPriceHistory(
    tokenId: string,
    options: {
      interval?: PriceHistoryInterval;
      startAt?: number;
      endAt?: number;
    } = {}
  ): Promise<{ history: PriceHistoryPoint[] }> {
    const params = new URLSearchParams({ token_id: tokenId });
    if (options.interval) params.set('interval', options.interval);
    if (options.startAt !== undefined) params.set('start_at', String(options.startAt));
    if (options.endAt !== undefined) params.set('end_at', String(options.endAt));

    return fetchApi(`/token/price-history?${params}`);
  },
};
