/**
 * Centralized Mock Database
 *
 * Single source of truth for all mock data in the application.
 * Contains 30 diverse, realistic trader profiles with full 42-character Ethereum addresses.
 *
 * Distribution:
 * - Tags: 3 god_level, 4 bcp_king, 5 alpha_hunter, 4 sports_whale, 3 counter_staker,
 *         2 event_insider, 2 arb_hunter, 2 consecutive_wins, 5 mixed
 * - Platforms: 18 Polymarket only, 6 Opinion only, 6 both platforms
 * - Performance: 5 top (80-95), 8 high (65-80), 10 mid (50-65), 7 low (30-50)
 */

import type {
  EthAddress,
  Platform,
  SmartMoneyTag,
  AddressProfile,
  LeaderboardEntry,
  ApiResponse,
} from '@/types';

// TraderPerformancePoint for mock data (extended version with additional fields)
export interface TraderPerformancePoint {
  timestamp: string;
  cumulativePnl: number;
  roi?: number;
  tradeCount?: number;
}
import { getPolymarketProfileUrl, getOpinionProfileUrlPath } from './api-config';
import { generateUUID } from './transformers/common';
import { generateUserPlaceholder } from '@/lib/utils';

// ============================================================
// Internal Mock Profile Structure
// ============================================================

interface MockTraderProfile {
  address: EthAddress;
  ensName?: string;
  twitterHandle?: string;
  platforms: Platform[];
  totalPnl: number;
  totalRoi: number;
  winRate: number;
  bcpScore: number;
  smartScore: number;
  totalVolume: number;
  tradeCount: number;
  tags: SmartMoneyTag[];
  specializations: Record<string, number>;
  isMM: boolean;
  lastActiveAt: Date;
  updatedAt: Date;
}

// ============================================================
// Mock Trader Profiles (30 total)
// ============================================================

const MOCK_PROFILES: MockTraderProfile[] = [
  // ========== God Level (3) ==========
  {
    address: '0x7a2091b2f4c8d9e1a3b5c6d8e9f0a1b2c3d4e5f6' as EthAddress,
    ensName: 'oracle.eth',
    twitterHandle: '@predict_alpha',
    platforms: ['polymarket'],
    totalPnl: 1245000,
    totalRoi: 4.205,
    winRate: 0.882,
    bcpScore: 0.72,
    smartScore: 92,
    totalVolume: 2500000,
    tradeCount: 142,
    tags: ['god_level', 'alpha_hunter'],
    specializations: { politics: 0.92, sports: 0.75 },
    isMM: false,
    lastActiveAt: new Date('2025-12-30T10:00:00Z'),
    updatedAt: new Date(),
  },
  {
    address: '0x3f482c1a7e9b3d5f2a8c4e6b1d9f7a3c5e8b0d2f' as EthAddress,
    ensName: 'prediction-god.eth',
    twitterHandle: '@alpha_god',
    platforms: ['polymarket', 'opinion'],
    totalPnl: 980000,
    totalRoi: 5.12,
    winRate: 0.845,
    bcpScore: 0.78,
    smartScore: 94,
    totalVolume: 1800000,
    tradeCount: 98,
    tags: ['god_level', 'bcp_king'],
    specializations: { crypto: 0.95, politics: 0.82 },
    isMM: false,
    lastActiveAt: new Date('2025-12-31T08:30:00Z'),
    updatedAt: new Date(),
  },
  {
    address: '0x9b1a4d9c2e8f7b5a3d6c9e1f4a7b2d5c8e0f3a6b' as EthAddress,
    ensName: 'whale-hunter.eth',
    platforms: ['opinion'],
    totalPnl: 750000,
    totalRoi: 3.85,
    winRate: 0.812,
    bcpScore: 0.68,
    smartScore: 89,
    totalVolume: 1950000,
    tradeCount: 156,
    tags: ['god_level', 'counter_staker'],
    specializations: { entertainment: 0.89, sports: 0.78 },
    isMM: false,
    lastActiveAt: new Date('2025-12-29T15:20:00Z'),
    updatedAt: new Date(),
  },

  // ========== BCP King (4) ==========
  {
    address: '0x1c2e5f6a8b3d7c9e4f1a5b8d2c6e9f3a7b0d4c5e' as EthAddress,
    twitterHandle: '@timing_master',
    platforms: ['polymarket'],
    totalPnl: 620000,
    totalRoi: 2.95,
    winRate: 0.742,
    bcpScore: 0.85,
    smartScore: 86,
    totalVolume: 2100000,
    tradeCount: 203,
    tags: ['bcp_king', 'alpha_hunter'],
    specializations: { politics: 0.88, crypto: 0.71 },
    isMM: false,
    lastActiveAt: new Date('2025-12-30T12:45:00Z'),
    updatedAt: new Date(),
  },
  {
    address: '0x8d311f2c5a9b7e4d1f6a8c3e5b9d2f7a4c6e0b1d' as EthAddress,
    ensName: 'perfect-timing.eth',
    platforms: ['polymarket', 'opinion'],
    totalPnl: 485000,
    totalRoi: 3.42,
    winRate: 0.698,
    bcpScore: 0.82,
    smartScore: 84,
    totalVolume: 1420000,
    tradeCount: 167,
    tags: ['bcp_king', 'arb_hunter'],
    specializations: { sports: 0.85, crypto: 0.79 },
    isMM: false,
    lastActiveAt: new Date('2025-12-31T09:15:00Z'),
    updatedAt: new Date(),
  },
  {
    address: '0x4a7b3c9d2e5f8a1b6c9e3d7f0a4b8c2e6d9f1a5b' as EthAddress,
    twitterHandle: '@entry_expert',
    platforms: ['polymarket'],
    totalPnl: 390000,
    totalRoi: 2.78,
    winRate: 0.685,
    bcpScore: 0.79,
    smartScore: 81,
    totalVolume: 1400000,
    tradeCount: 189,
    tags: ['bcp_king'],
    specializations: { politics: 0.82, entertainment: 0.68 },
    isMM: false,
    lastActiveAt: new Date('2025-12-28T14:30:00Z'),
    updatedAt: new Date(),
  },
  {
    address: '0x2d9f4a6b8c1e5d7a3f9b2c6e8d0f4a7b1c5e9d3a' as EthAddress,
    platforms: ['opinion'],
    totalPnl: 320000,
    totalRoi: 2.45,
    winRate: 0.672,
    bcpScore: 0.76,
    smartScore: 79,
    totalVolume: 1305000,
    tradeCount: 145,
    tags: ['bcp_king', 'sports_whale'],
    specializations: { sports: 0.91, politics: 0.62 },
    isMM: false,
    lastActiveAt: new Date('2025-12-30T07:20:00Z'),
    updatedAt: new Date(),
  },

  // ========== Alpha Hunter (5) ==========
  {
    address: '0x5e8a3b7c9d2f6a1e4b8c3d7f9a2e5b8c1d6f0a4b' as EthAddress,
    ensName: 'low-odds-king.eth',
    twitterHandle: '@alpha_sniper',
    platforms: ['polymarket'],
    totalPnl: 580000,
    totalRoi: 4.12,
    winRate: 0.789,
    bcpScore: 0.65,
    smartScore: 87,
    totalVolume: 1410000,
    tradeCount: 124,
    tags: ['alpha_hunter', 'event_insider'],
    specializations: { crypto: 0.87, politics: 0.76 },
    isMM: false,
    lastActiveAt: new Date('2025-12-31T11:00:00Z'),
    updatedAt: new Date(),
  },
  {
    address: '0x7c4e9a2b5d8f1a6c3e9b7d2f5a8c4e1b9d6f3a0c' as EthAddress,
    twitterHandle: '@underdog_pro',
    platforms: ['polymarket', 'opinion'],
    totalPnl: 445000,
    totalRoi: 3.67,
    winRate: 0.755,
    bcpScore: 0.58,
    smartScore: 83,
    totalVolume: 1215000,
    tradeCount: 98,
    tags: ['alpha_hunter'],
    specializations: { sports: 0.84, entertainment: 0.72 },
    isMM: false,
    lastActiveAt: new Date('2025-12-30T16:45:00Z'),
    updatedAt: new Date(),
  },
  {
    address: '0x9f3a7b1c5e8d2a6f4b9c3e7d1f5a8b4c2e9d0f6a' as EthAddress,
    ensName: 'value-finder.eth',
    platforms: ['polymarket'],
    totalPnl: 370000,
    totalRoi: 3.28,
    winRate: 0.732,
    bcpScore: 0.62,
    smartScore: 80,
    totalVolume: 1130000,
    tradeCount: 115,
    tags: ['alpha_hunter', 'consecutive_wins'],
    specializations: { politics: 0.79, crypto: 0.68 },
    isMM: false,
    lastActiveAt: new Date('2025-12-29T13:20:00Z'),
    updatedAt: new Date(),
  },
  {
    address: '0x6b2d9f4a7c1e8b3d5f9a2c6e4d8f0a3b7c1e5d9f' as EthAddress,
    platforms: ['opinion'],
    totalPnl: 285000,
    totalRoi: 2.89,
    winRate: 0.708,
    bcpScore: 0.55,
    smartScore: 76,
    totalVolume: 985000,
    tradeCount: 102,
    tags: ['alpha_hunter'],
    specializations: { entertainment: 0.81, sports: 0.65 },
    isMM: false,
    lastActiveAt: new Date('2025-12-27T10:30:00Z'),
    updatedAt: new Date(),
  },
  {
    address: '0x3a8c5e9b2d7f4a1c6e9b3d8f2a5c7e0b4d9f1a6c' as EthAddress,
    twitterHandle: '@value_hunter',
    platforms: ['polymarket'],
    totalPnl: 215000,
    totalRoi: 2.54,
    winRate: 0.685,
    bcpScore: 0.51,
    smartScore: 73,
    totalVolume: 845000,
    tradeCount: 89,
    tags: ['alpha_hunter'],
    specializations: { crypto: 0.76, politics: 0.64 },
    isMM: false,
    lastActiveAt: new Date('2025-12-31T06:15:00Z'),
    updatedAt: new Date(),
  },

  // ========== Sports Whale (4) ==========
  {
    address: '0x1f6a8c3e9b2d5f7a4c8e1b6d9f3a7c2e5b8d0f4a' as EthAddress,
    ensName: 'sports-god.eth',
    twitterHandle: '@nba_whale',
    platforms: ['polymarket'],
    totalPnl: 450000,
    totalRoi: 1.258,
    winRate: 0.654,
    bcpScore: 0.58,
    smartScore: 75,
    totalVolume: 3575000,
    tradeCount: 89,
    tags: ['sports_whale'],
    specializations: { sports: 0.88, entertainment: 0.52 },
    isMM: false,
    lastActiveAt: new Date('2025-12-26T15:20:00Z'),
    updatedAt: new Date(),
  },
  {
    address: '0x8e2a7b4c9d1f6a3e5b8c2d7f0a4b9c3e6d1f5a8b' as EthAddress,
    twitterHandle: '@sports_insider',
    platforms: ['polymarket', 'opinion'],
    totalPnl: 385000,
    totalRoi: 1.45,
    winRate: 0.698,
    bcpScore: 0.54,
    smartScore: 77,
    totalVolume: 2655000,
    tradeCount: 112,
    tags: ['sports_whale', 'counter_staker'],
    specializations: { sports: 0.93, politics: 0.48 },
    isMM: false,
    lastActiveAt: new Date('2025-12-30T18:40:00Z'),
    updatedAt: new Date(),
  },
  {
    address: '0x4c9e2a7b5d8f3a1c6e9b4d7f2a5c8e1b9d3f0a6c' as EthAddress,
    ensName: 'soccer-whale.eth',
    platforms: ['opinion'],
    totalPnl: 295000,
    totalRoi: 1.12,
    winRate: 0.642,
    bcpScore: 0.49,
    smartScore: 71,
    totalVolume: 2635000,
    tradeCount: 78,
    tags: ['sports_whale'],
    specializations: { sports: 0.91, crypto: 0.45 },
    isMM: false,
    lastActiveAt: new Date('2025-12-28T12:10:00Z'),
    updatedAt: new Date(),
  },
  {
    address: '0x7d3f9a2b6c8e4d1f7a3c9e5b2d8f0a4c7e1b6d9f' as EthAddress,
    platforms: ['polymarket'],
    totalPnl: 180000,
    totalRoi: 0.95,
    winRate: 0.625,
    bcpScore: 0.45,
    smartScore: 68,
    totalVolume: 1895000,
    tradeCount: 67,
    tags: ['sports_whale'],
    specializations: { sports: 0.86, entertainment: 0.51 },
    isMM: false,
    lastActiveAt: new Date('2025-12-29T09:25:00Z'),
    updatedAt: new Date(),
  },

  // ========== Counter Staker (3) ==========
  {
    address: '0x2a7c9e4b1d6f8a3c5e9b2d7f4a8c1e6b9d3f5a0c' as EthAddress,
    ensName: 'contrarian.eth',
    twitterHandle: '@fade_the_public',
    platforms: ['polymarket'],
    totalPnl: 520000,
    totalRoi: 3.15,
    winRate: 0.725,
    bcpScore: 0.64,
    smartScore: 82,
    totalVolume: 1650000,
    tradeCount: 134,
    tags: ['counter_staker', 'consecutive_wins'],
    specializations: { politics: 0.83, crypto: 0.72 },
    isMM: false,
    lastActiveAt: new Date('2025-12-31T14:55:00Z'),
    updatedAt: new Date(),
  },
  {
    address: '0x9b5e3a7c2d8f1a6c4e9b3d7f5a2c8e0b6d1f4a9c' as EthAddress,
    twitterHandle: '@opposite_trade',
    platforms: ['polymarket', 'opinion'],
    totalPnl: 405000,
    totalRoi: 2.82,
    winRate: 0.712,
    bcpScore: 0.59,
    smartScore: 78,
    totalVolume: 1435000,
    tradeCount: 119,
    tags: ['counter_staker'],
    specializations: { crypto: 0.81, sports: 0.68 },
    isMM: false,
    lastActiveAt: new Date('2025-12-30T11:30:00Z'),
    updatedAt: new Date(),
  },
  {
    address: '0x5f8a2b7c9e3d6a1f4c8e2b9d5f7a3c0e6b4d1f8a' as EthAddress,
    platforms: ['opinion'],
    totalPnl: 290000,
    totalRoi: 2.35,
    winRate: 0.698,
    bcpScore: 0.56,
    smartScore: 74,
    totalVolume: 1235000,
    tradeCount: 95,
    tags: ['counter_staker'],
    specializations: { politics: 0.79, entertainment: 0.65 },
    isMM: false,
    lastActiveAt: new Date('2025-12-27T16:45:00Z'),
    updatedAt: new Date(),
  },

  // ========== Event Insider (2) ==========
  {
    address: '0x3c7e9a4b2d5f8a1c6e9b4d7f2a5c8e0b3d9f1a6c' as EthAddress,
    ensName: 'early-bird.eth',
    twitterHandle: '@event_sniper',
    platforms: ['polymarket'],
    totalPnl: 12500,
    totalRoi: 0.85,
    winRate: 0.92,
    bcpScore: 0.78,
    smartScore: 82,
    totalVolume: 145000,
    tradeCount: 12,
    tags: ['event_insider', 'god_level'],
    specializations: { entertainment: 0.95, politics: 0.88 },
    isMM: false,
    lastActiveAt: new Date('2025-12-31T08:00:00Z'),
    updatedAt: new Date(),
  },
  {
    address: '0x6d1f8a3c9e2b5d7a4f8c1e6b9d3f7a2c5e0b8d4a' as EthAddress,
    platforms: ['polymarket'],
    totalPnl: 85000,
    totalRoi: 1.68,
    winRate: 0.785,
    bcpScore: 0.71,
    smartScore: 77,
    totalVolume: 505000,
    tradeCount: 34,
    tags: ['event_insider'],
    specializations: { politics: 0.89, crypto: 0.73 },
    isMM: false,
    lastActiveAt: new Date('2025-12-29T19:20:00Z'),
    updatedAt: new Date(),
  },

  // ========== Arb Hunter (2) ==========
  {
    address: '0x8a4c9e2b7d5f1a3c6e9b4d8f2a7c5e0b1d9f3a6c' as EthAddress,
    twitterHandle: '@arb_machine',
    platforms: ['polymarket', 'opinion'],
    totalPnl: 892000,
    totalRoi: 12.502,
    winRate: 0.765,
    bcpScore: 0.85,
    smartScore: 88,
    totalVolume: 8000000,
    tradeCount: 3500,
    tags: ['arb_hunter', 'bcp_king'],
    specializations: { crypto: 0.82, sports: 0.71 },
    isMM: true,
    lastActiveAt: new Date('2025-12-31T09:45:00Z'),
    updatedAt: new Date(),
  },
  {
    address: '0x1e9a4b7c3d8f2a5c6e9b1d7f4a8c2e5b9d0f3a6c' as EthAddress,
    platforms: ['polymarket', 'opinion'],
    totalPnl: 635000,
    totalRoi: 8.45,
    winRate: 0.732,
    bcpScore: 0.79,
    smartScore: 85,
    totalVolume: 5200000,
    tradeCount: 2100,
    tags: ['arb_hunter'],
    specializations: { crypto: 0.78, politics: 0.68 },
    isMM: true,
    lastActiveAt: new Date('2025-12-30T20:15:00Z'),
    updatedAt: new Date(),
  },

  // ========== Mixed Tags / Mid-Tier (5) ==========
  {
    address: '0x4b8c2e7a9d3f5a1c6e9b4d8f2a7c0e5b3d1f9a6c' as EthAddress,
    ensName: 'diverse-trader.eth',
    twitterHandle: '@jack_of_trades',
    platforms: ['polymarket'],
    totalPnl: 175000,
    totalRoi: 1.85,
    winRate: 0.628,
    bcpScore: 0.52,
    smartScore: 69,
    totalVolume: 945000,
    tradeCount: 86,
    tags: ['alpha_hunter', 'sports_whale'],
    specializations: { sports: 0.72, crypto: 0.61, politics: 0.58 },
    isMM: false,
    lastActiveAt: new Date('2025-12-28T07:40:00Z'),
    updatedAt: new Date(),
  },
  {
    address: '0x7f3a9c2e5d8b1a4c6e9b3d7f2a5c8e0b4d9f1a6c' as EthAddress,
    platforms: ['opinion'],
    totalPnl: 125000,
    totalRoi: 1.42,
    winRate: 0.598,
    bcpScore: 0.48,
    smartScore: 65,
    totalVolume: 880000,
    tradeCount: 74,
    tags: [],
    specializations: { entertainment: 0.68, politics: 0.55 },
    isMM: false,
    lastActiveAt: new Date('2025-12-25T14:20:00Z'),
    updatedAt: new Date(),
  },
  {
    address: '0x2c9e5a7b4d8f1a3c6e9b2d7f5a8c0e4b1d9f3a6c' as EthAddress,
    twitterHandle: '@steady_eddie',
    platforms: ['polymarket'],
    totalPnl: 95000,
    totalRoi: 1.15,
    winRate: 0.565,
    bcpScore: 0.44,
    smartScore: 62,
    totalVolume: 825000,
    tradeCount: 65,
    tags: [],
    specializations: { politics: 0.64, crypto: 0.52 },
    isMM: false,
    lastActiveAt: new Date('2025-12-29T10:50:00Z'),
    updatedAt: new Date(),
  },
  {
    address: '0x9d3f7a2c5e8b4a1d6f9c2e7b5d0f3a8c1e6b4d9f' as EthAddress,
    platforms: ['polymarket'],
    totalPnl: 45000,
    totalRoi: 0.68,
    winRate: 0.525,
    bcpScore: 0.38,
    smartScore: 55,
    totalVolume: 660000,
    tradeCount: 52,
    tags: [],
    specializations: { sports: 0.58, entertainment: 0.48 },
    isMM: false,
    lastActiveAt: new Date('2025-12-30T13:15:00Z'),
    updatedAt: new Date(),
  },
  {
    address: '0x5a8c3e9b1d7f4a2c6e9b5d8f3a7c2e0b4d1f9a6c' as EthAddress,
    platforms: ['opinion'],
    totalPnl: 18000,
    totalRoi: 0.42,
    winRate: 0.498,
    bcpScore: 0.32,
    smartScore: 51,
    totalVolume: 428000,
    tradeCount: 41,
    tags: [],
    specializations: { crypto: 0.54, politics: 0.45 },
    isMM: false,
    lastActiveAt: new Date('2025-12-26T11:30:00Z'),
    updatedAt: new Date(),
  },

  // ========== Low Performers (7) ==========
  {
    address: '0x6e9a2b7c4d8f3a1c5e9b6d7f2a8c5e0b3d1f4a9c' as EthAddress,
    twitterHandle: '@learning_curve',
    platforms: ['polymarket'],
    totalPnl: -2400,
    totalRoi: -0.052,
    winRate: 0.48,
    bcpScore: 0.35,
    smartScore: 48,
    totalVolume: 461000,
    tradeCount: 34,
    tags: [],
    specializations: { crypto: 0.45, politics: 0.38 },
    isMM: false,
    lastActiveAt: new Date('2025-12-25T11:00:00Z'),
    updatedAt: new Date(),
  },
  {
    address: '0x3d7f2a9c5e8b1a4c6e9b3d7f5a2c8e0b4d9f6a1c' as EthAddress,
    platforms: ['polymarket'],
    totalPnl: -8500,
    totalRoi: -0.095,
    winRate: 0.442,
    bcpScore: 0.28,
    smartScore: 44,
    totalVolume: 895000,
    tradeCount: 48,
    tags: [],
    specializations: { sports: 0.41, entertainment: 0.35 },
    isMM: false,
    lastActiveAt: new Date('2025-12-24T16:20:00Z'),
    updatedAt: new Date(),
  },
  {
    address: '0x8c4e9a2b7d5f3a1c6e9b4d8f2a5c7e0b1d9f3a6c' as EthAddress,
    platforms: ['opinion'],
    totalPnl: -15000,
    totalRoi: -0.128,
    winRate: 0.425,
    bcpScore: 0.24,
    smartScore: 41,
    totalVolume: 1170000,
    tradeCount: 56,
    tags: [],
    specializations: { crypto: 0.38, politics: 0.32 },
    isMM: false,
    lastActiveAt: new Date('2025-12-23T09:40:00Z'),
    updatedAt: new Date(),
  },
  {
    address: '0x1a9c5e7b3d8f2a4c6e9b1d7f5a8c2e0b4d9f3a6c' as EthAddress,
    platforms: ['polymarket'],
    totalPnl: -22000,
    totalRoi: -0.156,
    winRate: 0.405,
    bcpScore: 0.19,
    smartScore: 38,
    totalVolume: 1410000,
    tradeCount: 63,
    tags: [],
    specializations: { politics: 0.36, sports: 0.29 },
    isMM: false,
    lastActiveAt: new Date('2025-12-22T14:55:00Z'),
    updatedAt: new Date(),
  },
  {
    address: '0x7b3d9a2c5e8f4a1c6e9b7d3f2a5c8e0b4d1f9a6c' as EthAddress,
    platforms: ['opinion'],
    totalPnl: -35000,
    totalRoi: -0.189,
    winRate: 0.385,
    bcpScore: 0.15,
    smartScore: 35,
    totalVolume: 1852000,
    tradeCount: 71,
    tags: [],
    specializations: { entertainment: 0.33, crypto: 0.28 },
    isMM: false,
    lastActiveAt: new Date('2025-12-21T10:15:00Z'),
    updatedAt: new Date(),
  },
  {
    address: '0x4c8e2a7b9d5f1a3c6e9b4d8f2a7c5e0b3d9f1a6c' as EthAddress,
    platforms: ['polymarket'],
    totalPnl: -48000,
    totalRoi: -0.201,
    winRate: 0.368,
    bcpScore: 0.11,
    smartScore: 32,
    totalVolume: 2388000,
    tradeCount: 79,
    tags: [],
    specializations: { sports: 0.31, politics: 0.25 },
    isMM: false,
    lastActiveAt: new Date('2025-12-20T08:30:00Z'),
    updatedAt: new Date(),
  },
  {
    address: '0x9f2a7c5e8b3d6a1c4e9b2d7f5a8c0e4b1d9f3a6c' as EthAddress,
    twitterHandle: '@crypto_degen',
    platforms: ['polymarket'],
    totalPnl: -62000,
    totalRoi: -0.215,
    winRate: 0.352,
    bcpScore: 0.08,
    smartScore: 30,
    totalVolume: 2882000,
    tradeCount: 88,
    tags: [],
    specializations: { crypto: 0.29, entertainment: 0.22 },
    isMM: false,
    lastActiveAt: new Date('2025-12-19T15:45:00Z'),
    updatedAt: new Date(),
  },
];

// ============================================================
// Helper Functions
// ============================================================

/**
 * Convert MockTraderProfile to AddressProfile for a specific platform
 */
function toAddressProfile(
  mock: MockTraderProfile,
  platform: Platform
): AddressProfile {
  return {
    userName: mock.ensName || generateUserPlaceholder(mock.address),
    address: mock.address,
    platform,
    totalPnl: mock.totalPnl,
    totalRoi: mock.totalRoi,
    winRate: mock.winRate,
    smartScore: mock.smartScore,
    totalVolume: mock.totalVolume,
    tradeCount: mock.tradeCount,
    tags: mock.tags,
    specializations: mock.specializations,
    lastActiveAt: mock.lastActiveAt,
    updatedAt: mock.updatedAt,
    ensName: mock.ensName,
    twitterHandle: mock.twitterHandle,
    polymarketUrl: mock.platforms.includes('polymarket')
      ? getPolymarketProfileUrl(mock.address)
      : undefined,
    opinionUrl: mock.platforms.includes('opinion')
      ? getOpinionProfileUrlPath(mock.address)
      : undefined,
  };
}

/**
 * Aggregate multiple platform profiles into a single multi-platform profile
 */
function aggregateMultiPlatformProfile(
  profiles: MockTraderProfile[]
): AddressProfile {
  if (profiles.length === 0) {
    throw new Error('Cannot aggregate empty profiles array');
  }

  if (profiles.length === 1) {
    const platform = profiles[0].platforms[0];
    return toAddressProfile(profiles[0], platform);
  }

  // Use the first profile as base
  const base = profiles[0];

  // Sum metrics
  const totalPnl = profiles.reduce((sum, p) => sum + p.totalPnl, 0);
  const totalVolume = profiles.reduce((sum, p) => sum + p.totalVolume, 0);
  const tradeCount = profiles.reduce((sum, p) => sum + p.tradeCount, 0);

  // Weighted averages by trade count
  const totalTrades = tradeCount;
  const winRate =
    profiles.reduce((sum, p) => sum + p.winRate * p.tradeCount, 0) /
    totalTrades;
  const totalRoi =
    profiles.reduce((sum, p) => sum + p.totalRoi * p.tradeCount, 0) /
    totalTrades;

  // Max smart score
  const smartScore = Math.max(...profiles.map((p) => p.smartScore));

  // Union of tags (deduplicate)
  const tags = Array.from(
    new Set(profiles.flatMap((p) => p.tags))
  ) as SmartMoneyTag[];

  // Merge specializations (weighted average by trade count)
  const specializations: Record<string, number> = {};
  const specializationCounts: Record<string, number> = {};

  profiles.forEach((profile) => {
    Object.entries(profile.specializations).forEach(([key, value]) => {
      if (!specializations[key]) {
        specializations[key] = 0;
        specializationCounts[key] = 0;
      }
      specializations[key] += value * profile.tradeCount;
      specializationCounts[key] += profile.tradeCount;
    });
  });

  Object.keys(specializations).forEach((key) => {
    specializations[key] = specializations[key] / specializationCounts[key];
  });

  // Combine platforms
  const platforms = Array.from(
    new Set(profiles.flatMap((p) => p.platforms))
  ) as Platform[];

  // Most recent activity
  const lastActiveAt = new Date(
    Math.max(...profiles.map((p) => p.lastActiveAt.getTime()))
  );

  return {
    userName: base.ensName || generateUserPlaceholder(base.address),
    address: base.address,
    platform: platforms[0], // Primary platform (required field)
    totalPnl,
    totalRoi,
    winRate,
    smartScore,
    totalVolume,
    tradeCount,
    tags,
    specializations,
    lastActiveAt,
    updatedAt: new Date(),
    ensName: base.ensName,
    twitterHandle: base.twitterHandle,
    polymarketUrl: platforms.includes('polymarket')
      ? getPolymarketProfileUrl(base.address)
      : undefined,
    opinionUrl: platforms.includes('opinion')
      ? getOpinionProfileUrlPath(base.address)
      : undefined,
  };
}

// ============================================================
// Export Functions
// ============================================================

/**
 * Get mock leaderboard data with optional filtering
 *
 * @param options - Filter options
 * @returns Array of leaderboard entries
 */
export function getMockLeaderboard(options?: {
  platform?: Platform;
  type?: string;
  timeRange?: string;
  limit?: number;
}): LeaderboardEntry[] {
  let filtered = [...MOCK_PROFILES];

  // Filter by platform
  if (options?.platform) {
    filtered = filtered.filter((p) => p.platforms.includes(options.platform!));
  }

  // Sort by totalPnl (descending)
  filtered.sort((a, b) => b.totalPnl - a.totalPnl);

  // Apply limit
  if (options?.limit) {
    filtered = filtered.slice(0, options.limit);
  }

  // Convert to LeaderboardEntry format
  return filtered.map((profile, index) => ({
    rank: index + 1,
    address: profile.address,
    platform: profile.platforms[0], // Use primary platform
    value: profile.totalPnl,
    profile: toAddressProfile(profile, profile.platforms[0]),
  }));
}

/**
 * Get mock address profile (supports multi-platform aggregation)
 *
 * @param address - Ethereum address (case-insensitive)
 * @param platform - Optional platform filter
 * @returns AddressProfile or null if not found
 */
export function getMockAddressProfile(
  address: string,
  platform?: Platform
): AddressProfile | null {
  const normalized = address.toLowerCase();
  const profiles = MOCK_PROFILES.filter(
    (p) => p.address.toLowerCase() === normalized
  );

  if (profiles.length === 0) {
    return null;
  }

  // If platform specified, return single-platform profile
  if (platform) {
    const platformProfile = profiles.find((p) => p.platforms.includes(platform));
    return platformProfile ? toAddressProfile(platformProfile, platform) : null;
  }

  // Multi-platform aggregation
  return aggregateMultiPlatformProfile(profiles);
}

/**
 * Get mock trader performance data (for charts)
 *
 * @param address - Ethereum address
 * @param range - Time range ('7d', '30d', '90d', 'all')
 * @returns Array of performance data points
 */
export function getMockTraderPerformance(
  address: string,
  range: '7d' | '30d' | '90d' | 'all' = '30d'
): TraderPerformancePoint[] {
  const profile = getMockAddressProfile(address);
  if (!profile) {
    return [];
  }

  // Generate realistic performance curve based on profile stats
  const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 180;
  const points: TraderPerformancePoint[] = [];
  const seed = parseInt(address.slice(2, 10), 16); // Deterministic seed from address

  let currentPnl = 0;
  const finalPnl = profile.totalPnl;
  const dailyIncrement = finalPnl / days;

  for (let i = 0; i <= days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i));

    // Add some randomness but trend towards final PnL
    const randomFactor = ((seed + i) % 100) / 500 - 0.1; // -10% to +10%
    currentPnl += dailyIncrement * (1 + randomFactor);

    points.push({
      timestamp: date.toISOString(),
      cumulativePnl: Math.round(currentPnl),
      roi: currentPnl / (profile.totalVolume || 1),
      tradeCount: Math.floor((profile.tradeCount * i) / days),
    });
  }

  // Ensure last point matches actual profile
  points[points.length - 1].cumulativePnl = profile.totalPnl;
  points[points.length - 1].roi = profile.totalRoi;
  points[points.length - 1].tradeCount = profile.tradeCount;

  return points;
}

/**
 * Get mock leaderboard response (API format)
 *
 * @param options - Filter options
 * @returns API response with leaderboard data
 */
export function getMockLeaderboardResponse(options?: {
  platform?: Platform;
  type?: string;
  timeRange?: string;
  limit?: number;
}): ApiResponse<LeaderboardEntry[]> {
  const data = getMockLeaderboard(options);

  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateUUID(),
    },
  };
}

/**
 * Get mock address profile response (API format)
 *
 * @param address - Ethereum address
 * @param platform - Optional platform filter
 * @returns API response with address profile
 */
export function getMockAddressProfileResponse(
  address: string,
  platform?: Platform
): ApiResponse<AddressProfile | null> {
  const data = getMockAddressProfile(address, platform);

  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateUUID(),
    },
  };
}
