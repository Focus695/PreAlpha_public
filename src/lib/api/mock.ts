/**
 * Mock Data Generators
 * Generate sample data for development and fallback scenarios
 */

import type { MarketItem, UserPosition, UserTrade, LeaderboardApiEntry } from './types';
import {
  getMockLeaderboard,
  getMockAddressProfile,
  getMockTraderPerformance,
} from '../mock-database';
import { generateUserPlaceholder } from '@/lib/utils';

// ============================================================
// Seeded Random Generator
// ============================================================

function createSeededRandom(seedSource: string) {
  let seed = 0;
  for (let i = 0; i < seedSource.length; i++) {
    seed = (seed << 5) - seed + seedSource.charCodeAt(i);
    seed |= 0;
  }
  if (seed === 0) seed = 1;

  return () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };
}

// ============================================================
// Sample Data
// ============================================================

const SAMPLE_MARKET_TITLES = [
  'US Election 2028 Winner',
  'Bitcoin above $100K by 2026',
  'Will ETH ETF launch by Q3',
  'Taiwan Presidential Outcome',
  'S&P500 closes green this week',
  'Premier League Champion',
  'Global CPI below 2.5%',
  'Fed cuts rates this year',
];

// ============================================================
// Mock Generators
// ============================================================

function buildSampleMarket(random: () => number): MarketItem {
  const title = SAMPLE_MARKET_TITLES[Math.floor(random() * SAMPLE_MARKET_TITLES.length)];
  const id = Math.floor(random() * 10_000) + 1_000;
  const yesPrice = Number((random() * 0.8 + 0.1).toFixed(2));
  const noPrice = Number((1 - yesPrice).toFixed(2));

  return {
    id,
    title,
    status: 'activated',
    marketType: 1,
    yesPrice,
    noPrice,
    volume: Math.round(random() * 1_000_000),
    liquidity: Math.round(random() * 100_000),
    createdAt: new Date(Date.now() - random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

export function generateMockUserPositions(address: string, count = 5): UserPosition[] {
  const random = createSeededRandom(`positions:${address}`);

  return Array.from({ length: count }).map((_, index) => {
    const market = buildSampleMarket(random);
    const avgPrice = Number((random() * 0.8 + 0.1).toFixed(3));
    const size = Number((random() * 800 + 50).toFixed(2));
    const pnl = Number(((random() - 0.45) * 1500).toFixed(2));
    const currentPrice = Number((avgPrice + (random() - 0.5) * 0.2).toFixed(3));

    return {
      id: Number(`${market.id}${index}`),
      walletAddress: address,
      marketId: market.id,
      tokenId: `token-${market.id}-${index}`,
      sharesOwned: String(size),
      avgEntryPrice: String(avgPrice),
      unrealizedPnl: String(pnl),
      // Required fields from API types
      size,
      avgPrice,
      currentPrice,
      pnl,
      market,
    } as UserPosition;
  });
}

export function generateMockUserTrades(address: string, count = 6): UserTrade[] {
  const random = createSeededRandom(`trades:${address}`);

  // 支持四种交易动作类型
  const sideOptions: Array<'BUY' | 'SELL' | 'SPLIT' | 'MERGE'> = ['BUY', 'SELL', 'SPLIT', 'MERGE'];

  return Array.from({ length: count }).map((_, index) => {
    const market = buildSampleMarket(random);
    const price = Number((random() * 0.8 + 0.1).toFixed(3));
    const shares = String(Number((random() * 1000 + 20).toFixed(2)));
    const createdAtTimestamp = Date.now() - random() * 30 * 24 * 60 * 60 * 1000;

    const txHash = `0x${Math.floor(random() * Number.MAX_SAFE_INTEGER)
      .toString(16)
      .padStart(16, '0')}`;

    // 随机选择一种交易动作
    const sideIndex = Math.floor(random() * sideOptions.length);
    const side = sideOptions[sideIndex];

    return {
      id: Number(`${index + 1}${market.id}`),
      txHash,
      walletAddress: address,
      marketId: market.id,
      tokenId: `token-${market.id}-${index}`,
      side,
      shares,
      price: String(price),
      createdAt: createdAtTimestamp,
      market,
      amount: String(parseFloat(shares)), // Convert to string to match API type
    } as UserTrade;
  });
}

export function getMockLeaderboardEntries(limit?: number): LeaderboardApiEntry[] {
  const mockData = getMockLeaderboard({ limit });
  return mockData as unknown as LeaderboardApiEntry[];
}

/**
 * Generate mock enriched leaderboard response
 */
export function getMockEnrichedLeaderboard(
  timeRange: '1d' | '7d' | '30d' | 'all',
  limit = 100
): import('./types').EnrichedLeaderboardResponse {
  const mockData = getMockLeaderboard({ timeRange, limit });

  return {
    errno: 0,
    errmsg: '',
    result: {
      list: mockData.map((entry) => {
        const profile = entry.profile;
        return {
          id: entry.rank,
          avatar: profile.avatarUrl || '',
          rankingChange: Math.floor(Math.random() * 10) - 5, // Random change -5 to +5
          rankingType: 1,
          userName: profile.userName || generateUserPlaceholder(profile.address),
          walletAddress: profile.address,
          smartScoreValue: (profile.smartScore ?? 0).toFixed(2),
          pnlValue: profile.totalPnl.toFixed(8),
          volumeValue: profile.totalVolume.toFixed(8),
          roiValue: (profile.totalRoi * 100).toFixed(2),
          winRateValue: ((profile.winRate ?? 0) * 100).toFixed(2),
          systemTag: profile.tags.join(','),
        };
      }),
    },
  };
}

// Re-export from mock-database for convenience
export { getMockAddressProfile, getMockTraderPerformance };
