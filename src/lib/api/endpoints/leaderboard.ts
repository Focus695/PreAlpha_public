/**
 * Leaderboard API Endpoints
 */

import { logger } from '@/lib/logger';
import { fetchApi, normalizeAddressForApi } from '../client';
import { withMockFallback } from '../health';
import { getMockLeaderboardEntries } from '../mock';
import type {
  LeaderboardApiEntry,
  PaginatedApiResponse,
  LeaderboardDataType,
  LeaderboardPeriod,
  UserProfileResponse,
  VolumeDistributionResponse,
  CategoryDistributionResponse,
} from '../types';

export const leaderboardApi = {
  /**
   * Get leaderboard data (unified endpoint)
   * GET /leaderboard/
   * Note: API may return array directly or paginated { items: [...] } format
   */
  async getLeaderboard(
    options: {
      limit?: number;
      dataType?: LeaderboardDataType;
      period?: LeaderboardPeriod;
      chainId?: number;
    } = {}
  ): Promise<LeaderboardApiEntry[] | PaginatedApiResponse<LeaderboardApiEntry>> {
    return withMockFallback(
      'leaderboard',
      async () => {
        const params = new URLSearchParams();
        if (options.limit !== undefined) params.set('limit', String(options.limit));
        if (options.dataType) params.set('dataType', options.dataType);
        if (options.period) params.set('period', options.period);
        if (options.chainId !== undefined) params.set('chainId', String(options.chainId));

        const query = params.toString();
        return fetchApi(`/leaderboard/${query ? `?${query}` : ''}`);
      },
      () => getMockLeaderboardEntries(options.limit)
    );
  },

  /**
   * Get P&L Winners 24h leaderboard
   * GET /leaderboard/profit/24h
   */
  async getProfitLeaderboard24h(limit?: number): Promise<LeaderboardApiEntry[]> {
    const params = limit !== undefined ? `?limit=${limit}` : '';
    return withMockFallback(
      'leaderboard',
      () => fetchApi(`/leaderboard/profit/24h${params}`),
      () => getMockLeaderboardEntries(limit)
    );
  },

  /**
   * Get P&L Winners 7d leaderboard
   * GET /leaderboard/profit/7d
   */
  async getProfitLeaderboard7d(limit?: number): Promise<LeaderboardApiEntry[]> {
    const params = limit !== undefined ? `?limit=${limit}` : '';
    return withMockFallback(
      'leaderboard',
      () => fetchApi(`/leaderboard/profit/7d${params}`),
      () => getMockLeaderboardEntries(limit)
    );
  },

  /**
   * Get P&L Winners 30d leaderboard
   * GET /leaderboard/profit/30d
   */
  async getProfitLeaderboard30d(limit?: number): Promise<LeaderboardApiEntry[]> {
    const params = limit !== undefined ? `?limit=${limit}` : '';
    return withMockFallback(
      'leaderboard',
      () => fetchApi(`/leaderboard/profit/30d${params}`),
      () => getMockLeaderboardEntries(limit)
    );
  },

  /**
   * Get P&L Winners all-time leaderboard
   * GET /leaderboard/profit/all-time
   */
  async getProfitLeaderboardAllTime(limit?: number): Promise<LeaderboardApiEntry[]> {
    const params = limit !== undefined ? `?limit=${limit}` : '';
    return withMockFallback(
      'leaderboard',
      () => fetchApi(`/leaderboard/profit/all-time${params}`),
      () => getMockLeaderboardEntries(limit)
    );
  },

  /**
   * Get Volume Whales 24h leaderboard
   * GET /leaderboard/volume/24h
   */
  async getVolumeLeaderboard24h(limit?: number): Promise<LeaderboardApiEntry[]> {
    const params = limit !== undefined ? `?limit=${limit}` : '';
    return withMockFallback(
      'leaderboard',
      () => fetchApi(`/leaderboard/volume/24h${params}`),
      () => getMockLeaderboardEntries(limit)
    );
  },

  /**
   * Get Volume Whales 7d leaderboard
   * GET /leaderboard/volume/7d
   */
  async getVolumeLeaderboard7d(limit?: number): Promise<LeaderboardApiEntry[]> {
    const params = limit !== undefined ? `?limit=${limit}` : '';
    return withMockFallback(
      'leaderboard',
      () => fetchApi(`/leaderboard/volume/7d${params}`),
      () => getMockLeaderboardEntries(limit)
    );
  },

  /**
   * Get Volume Whales 30d leaderboard
   * GET /leaderboard/volume/30d
   */
  async getVolumeLeaderboard30d(limit?: number): Promise<LeaderboardApiEntry[]> {
    const params = limit !== undefined ? `?limit=${limit}` : '';
    return withMockFallback(
      'leaderboard',
      () => fetchApi(`/leaderboard/volume/30d${params}`),
      () => getMockLeaderboardEntries(limit)
    );
  },

  /**
   * Get Volume Whales all-time leaderboard
   * GET /leaderboard/volume/all-time
   */
  async getVolumeLeaderboardAllTime(limit?: number): Promise<LeaderboardApiEntry[]> {
    const params = limit !== undefined ? `?limit=${limit}` : '';
    return withMockFallback(
      'leaderboard',
      () => fetchApi(`/leaderboard/volume/all-time${params}`),
      () => getMockLeaderboardEntries(limit)
    );
  },

  /**
   * Get user profile
   * GET /leaderboard/user/{walletAddress}/profile
   * Note: API expects address WITH 0x prefix
   */
  async getUserProfile(walletAddress: string): Promise<UserProfileResponse> {
    const normalizedAddress = normalizeAddressForApi(walletAddress);
    return withMockFallback(
      'userProfile',
      () => fetchApi(`/leaderboard/user/${normalizedAddress}/profile`),
      () => ({
        errno: 0,
        errmsg: '',
        result: {
          walletAddress,
          userName: 'Mock User',
          avatarUrl: 'https://images.opinion.trade/Avatar-A2.png',
          email: '',
          introduction: '',
          location: '',
          xUsername: '',
          xUserId: '',
          totalProfit: '0',
          profitIncRate: '0',
          Volume: '0',
          VolumeIncRate: '0',
          netWorth: '0',
          portfolio: '0',
          score: '',
          rankTheWeek: 0,
          follower: 0,
          following: 0,
          followed: false,
          alert: false,
          balance: [],
        },
      })
    );
  },

  /**
   * Get user volume distribution
   * GET /leaderboard/user/{walletAddress}/volume-distribution
   * Note: API expects address WITH 0x prefix
   */
  async getUserVolumeDistribution(walletAddress: string): Promise<VolumeDistributionResponse> {
    const normalizedAddress = normalizeAddressForApi(walletAddress);
    return withMockFallback(
      'volumeDistribution',
      () => fetchApi(`/leaderboard/user/${normalizedAddress}/volume-distribution`),
      () => ({
        errno: 0,
        errmsg: '',
        result: {
          volumeDistribution: [],
        },
      })
    );
  },

  /**
   * Get enriched leaderboard data with enhanced metrics
   * GET /leaderboard/leaderboard-enriched?period={period}&limit={limit}
   */
  async getLeaderboardEnriched(
    timeRange: '1d' | '7d' | '30d' | 'all',
    limit?: number
  ): Promise<import('../types').EnrichedLeaderboardResponse> {
    return withMockFallback(
      'leaderboard',
      async () => {
        // Map frontend time range to API period format
        const periodMap: Record<string, string> = {
          '1d': '1',
          '7d': '7',
          '30d': '30',
          'all': '0',
        };

        const params = new URLSearchParams();
        const period = periodMap[timeRange];
        params.set('period', period);
        params.set('dataType', 'profit'); // Required parameter
        if (limit !== undefined) params.set('limit', String(limit));

        const endpoint = `/leaderboard/leaderboard-enriched?${params.toString()}`;
        logger.debug('[getLeaderboardEnriched] Request:', {
          timeRange,
          period,
          limit,
          dataType: 'profit',
          endpoint,
        });

        return fetchApi(endpoint);
      },
      () => {
        // Import dynamically to avoid circular dependency
        const { getMockEnrichedLeaderboard } = require('../mock');
        return getMockEnrichedLeaderboard(timeRange, limit);
      }
    );
  },

  /**
   * Get user category distribution
   * GET /smart-wallets/{address}/category-distribution
   * Note: API expects address WITH 0x prefix
   */
  async getCategoryDistribution(address: string): Promise<CategoryDistributionResponse> {
    const normalizedAddress = normalizeAddressForApi(address);
    return fetchApi(`/smart-wallets/${normalizedAddress}/category-distribution`);
  },
};
