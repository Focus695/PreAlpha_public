/**
 * Signals API Endpoints
 */

import type { Signal, ApiResponse } from '@/types';
import { fetchApi } from '../client';

export const signalsApi = {
  /**
   * Get signals
   */
  async getSignals(
    options: {
      platform?: string;
      type?: string;
      minStrength?: number;
      limit?: number;
    } = {}
  ): Promise<ApiResponse<Signal[]>> {
    const params = new URLSearchParams();
    if (options.platform) params.set('platform', options.platform);
    if (options.type) params.set('type', options.type);
    if (options.minStrength) params.set('minStrength', String(options.minStrength));
    if (options.limit) params.set('limit', String(options.limit));

    const query = params.toString();
    return fetchApi(`/signals${query ? `?${query}` : ''}`);
  },
};
