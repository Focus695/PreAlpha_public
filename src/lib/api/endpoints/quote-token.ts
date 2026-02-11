/**
 * Quote Token API Endpoints
 */

import { fetchApi } from '../client';
import type { QuoteToken, PaginatedApiResponse } from '../types';

export const quoteTokenApi = {
  /**
   * Get quote token list
   * GET /quoteToken/
   */
  async getQuoteTokens(
    options: {
      page?: number;
      limit?: number;
      quoteTokenName?: string;
      chainId?: string;
    } = {}
  ): Promise<PaginatedApiResponse<QuoteToken>> {
    const params = new URLSearchParams();
    if (options.page !== undefined) params.set('page', String(options.page));
    if (options.limit !== undefined) params.set('limit', String(options.limit));
    if (options.quoteTokenName) params.set('quoteTokenName', options.quoteTokenName);
    if (options.chainId) params.set('chainId', options.chainId);

    const query = params.toString();
    return fetchApi(`/quoteToken/${query ? `?${query}` : ''}`);
  },
};
