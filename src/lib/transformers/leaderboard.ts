/**
 * Leaderboard Transformers
 * Transform leaderboard API responses to frontend types
 */

import { logger } from '@/lib/logger';
import type {
  LeaderboardEntry,
  AddressProfile,
  EthAddress,
  Platform,
  SmartMoneyTag,
} from '@/types';
import type { LeaderboardApiEntry, SmartWalletApiEntry, SmartWalletsResponse } from '@/lib/api';
import { getPolymarketProfileUrl, getOpinionProfileUrl } from '../api-config';
import { toNumber, MISSING_STRING } from './common';
import { generateUserPlaceholder } from '@/lib/utils';

// ============================================================
// Constants
// ============================================================

/** 默认平台 (远程 API 基于 Opinion/BNB Chain) */
const DEFAULT_PLATFORM: Platform = 'opinion';

// ============================================================
// Types
// ============================================================

export type RawLeaderboardResponse =
  | LeaderboardApiEntry[]
  | {
      items?: LeaderboardApiEntry[];
      list?: LeaderboardApiEntry[];
      result?: { list?: LeaderboardApiEntry[] } | null;
      [key: string]: unknown;
    };

/**
 * 显示用的个人资料格式
 */
export interface DisplayProfile {
  rank: number;
  address: EthAddress;
  ensName?: string;
  twitterHandle?: string;
  userName?: string;
  avatarUrl?: string;
  isWhale: boolean;
  totalPnl: number;
  roi: number;
  winRate: number | null;
  smartScore: number | null;
  tradesCount: number;
  totalVolume: number;
  tags: string[];
  lastActive: string;
  /** 用户操作时间（关注/标注的时间），用于个人数据管理页面排序 */
  userActionAt?: string;
  platform: Platform;
  polymarketLink: string;
  opinionLink?: string;
}

// ============================================================
// API Response Transformers
// ============================================================

/**
 * 转换单个 LeaderboardApiEntry 为 LeaderboardEntry
 */
export function transformLeaderboardApiEntry(
  entry: LeaderboardApiEntry,
  index: number
): LeaderboardEntry {
  // Check if this is a mock entry that already has the full profile
  if (entry.profile && typeof entry.profile === 'object') {
    const mockEntry = entry as unknown as LeaderboardEntry;
    return {
      rank: mockEntry.rank,
      address: mockEntry.address,
      platform: mockEntry.platform,
      value: mockEntry.value,
      profile: mockEntry.profile,
    };
  }

  const rawAddress =
    entry.walletAddress ??
    (entry as { address?: string }).address ??
    '0x0000000000000000000000000000000000000000';
  const address = rawAddress as EthAddress;
  const rawUserName = typeof entry.userName === 'string' ? entry.userName.trim() : '';
  const userName = rawUserName.length > 0 ? rawUserName : generateUserPlaceholder(address);
  const avatarUrl = typeof entry.avatar === 'string' ? entry.avatar.trim() : undefined;
  const profit = toNumber((entry as { rankingValue?: unknown }).rankingValue ?? entry.profit);
  const volume = toNumber(entry.volume);
  const tradeCount = Math.trunc(toNumber(entry.tradeCount));
  const winRate = toNumber(entry.winRate);

  const profile: AddressProfile = {
    userName,
    address,
    platform: DEFAULT_PLATFORM,
    totalPnl: profit,
    totalVolume: volume,
    tradeCount,
    winRate,
    totalRoi: volume > 0 ? profit / volume : 0,
    smartScore: 0,
    tags: [] as SmartMoneyTag[],
    specializations: {},
    ensName: rawUserName.length > 0 ? rawUserName : MISSING_STRING,
    twitterHandle: undefined,
    avatarUrl,
    polymarketUrl: getPolymarketProfileUrl(address),
    opinionUrl: getOpinionProfileUrl(address),
    lastActiveAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    rank: entry.rank ?? (entry as { id?: number }).id ?? index + 1,
    address,
    platform: DEFAULT_PLATFORM,
    value: profit,
    profile,
  };
}

/**
 * 批量转换 LeaderboardApiEntry 数组
 */
export function transformLeaderboardApiResponse(
  apiResponse: RawLeaderboardResponse
): LeaderboardEntry[] {
  const apiEntries = Array.isArray(apiResponse)
    ? apiResponse
    : apiResponse.items ??
      apiResponse.list ??
      ((apiResponse.result &&
        typeof apiResponse.result === 'object' &&
        Array.isArray(apiResponse.result.list)
          ? apiResponse.result.list
          : []) as LeaderboardApiEntry[]);

  return apiEntries.map((entry, index) => transformLeaderboardApiEntry(entry, index));
}

// ============================================================
// Display Transformers
// ============================================================

/**
 * 将 LeaderboardEntry 转换为 DisplayProfile
 */
export function leaderboardEntryToDisplayProfile(
  entry: LeaderboardEntry
): DisplayProfile {
  const { profile, rank, platform } = entry;

  const isWhale = profile.tags.includes('sports_whale');

  return {
    rank,
    address: profile.address,
    ensName: profile.ensName,
    twitterHandle: profile.twitterHandle,
    userName: profile.userName,
    avatarUrl: profile.avatarUrl,
    isWhale,
    totalPnl: profile.totalPnl,
    roi: profile.totalRoi * 100,
    winRate: profile.winRate != null ? profile.winRate * 100 : null,
    smartScore: profile.smartScore,
    tradesCount: profile.tradeCount,
    totalVolume: profile.totalVolume,
    tags: profile.tags,
    lastActive: profile.lastActiveAt.toISOString(),
    platform,
    polymarketLink: profile.polymarketUrl ||
      getPolymarketProfileUrl(profile.address),
    opinionLink: platform === 'opinion'
      ? (profile.opinionUrl || getOpinionProfileUrl(profile.address))
      : undefined,
  };
}

/**
 * 批量转换 LeaderboardEntry 数组
 */
export function leaderboardEntriesToDisplayProfiles(
  entries: LeaderboardEntry[]
): DisplayProfile[] {
  return entries.map(leaderboardEntryToDisplayProfile);
}

/**
 * 将 AddressProfile 转换为 DisplayProfile
 */
export function addressProfileToDisplayProfile(
  profile: AddressProfile,
  rank = 0
): DisplayProfile {
  const isWhale = profile.tags.includes('sports_whale');

  return {
    rank,
    address: profile.address,
    ensName: profile.ensName,
    twitterHandle: profile.twitterHandle,
    userName: profile.userName,
    avatarUrl: profile.avatarUrl,
    isWhale,
    totalPnl: profile.totalPnl,
    roi: profile.totalRoi * 100,
    winRate: profile.winRate != null ? profile.winRate * 100 : null,
    smartScore: profile.smartScore,
    tradesCount: profile.tradeCount,
    totalVolume: profile.totalVolume,
    tags: profile.tags,
    lastActive: profile.lastActiveAt.toISOString(),
    platform: profile.platform,
    polymarketLink: profile.polymarketUrl ||
      getPolymarketProfileUrl(profile.address),
    opinionLink: profile.platform === 'opinion'
      ? (profile.opinionUrl || getOpinionProfileUrl(profile.address))
      : undefined,
  };
}

// ============================================================
// Enriched Leaderboard Transformers
// ============================================================

/**
 * 转换单个 EnrichedLeaderboardApiEntry 为 LeaderboardEntry
 * 重新计算 ROI 使用公式: ROI = 2P/(V-P)
 */
export function transformEnrichedLeaderboardEntry(
  entry: import('@/lib/api/types').EnrichedLeaderboardApiEntry,
  _index: number
): LeaderboardEntry {
  const address = entry.walletAddress as EthAddress;

  // Parse string numbers to floats
  const pnl = parseFloat(entry.pnlValue) || 0;
  const volume = parseFloat(entry.volumeValue) || 0;
  const smartScore = parseFloat(entry.smartScoreValue) || 0;
  const winRate = parseFloat(entry.winRateValue) / 100 || 0; // Convert % to 0-1

  // Recalculate ROI: ROI = 2P/(V-P)
  // Edge case: If V-P = 0 or very close, set ROI to 0
  const denominator = volume - pnl;
  const roi = Math.abs(denominator) > 0.000001 ? (2 * pnl) / denominator : 0;

  // Parse system tags (comma-separated string)
  const tags = entry.systemTag
    ? (entry.systemTag.split(',').map((t) => t.trim()).filter(Boolean) as SmartMoneyTag[])
    : [];

  const profile: AddressProfile = {
    userName: entry.userName || generateUserPlaceholder(address),
    address,
    platform: DEFAULT_PLATFORM,
    totalPnl: pnl,
    totalVolume: volume,
    totalRoi: Number.isFinite(roi) ? roi : 0,
    winRate,
    smartScore,
    tradeCount: 0, // Not provided
    tags,
    specializations: {},
    avatarUrl: entry.avatar || undefined,
    polymarketUrl: getPolymarketProfileUrl(address),
    opinionUrl: getOpinionProfileUrl(address),
    lastActiveAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    rank: entry.id,
    address,
    platform: DEFAULT_PLATFORM,
    value: pnl,
    profile,
  };
}

/**
 * 转换 EnrichedLeaderboardResponse 为 LeaderboardEntry 数组
 */
export function transformEnrichedLeaderboardResponse(
  response: import('@/lib/api/types').EnrichedLeaderboardResponse
): LeaderboardEntry[] {
  // Validate response structure
  if (!response || typeof response !== 'object') {
    logger.error('[transformer] Invalid response structure');
    return [];
  }

  if (response.errno !== 0) {
    logger.error(`[transformer] API error: ${response.errmsg} (errno: ${response.errno})`);
    return [];
  }

  if (!response.result?.list || !Array.isArray(response.result.list)) {
    logger.error('[transformer] Missing or invalid result.list');
    return [];
  }

  // Transform each entry with error handling
  return response.result.list
    .map((entry, index) => {
      try {
        return transformEnrichedLeaderboardEntry(entry, index);
      } catch (error) {
        logger.error('[transformer] Failed to transform entry:', entry, error);
        return null;
      }
    })
    .filter((entry): entry is LeaderboardEntry => entry !== null);
}

// ============================================================
// Smart Wallets Transformers
// ============================================================

/**
 * 转换单个 SmartWalletApiEntry 为 LeaderboardEntry
 */
export function transformSmartWalletEntry(
  entry: SmartWalletApiEntry,
  index: number
): LeaderboardEntry {
  const address = entry.wallet_address as EthAddress;

  // Parse values
  const totalPnl = parseFloat(entry.total_profit) || 0;
  const volume = parseFloat(entry.volume) || 0;
  const smartScore = entry.smart_score ?? 0;
  const roi = entry.roi_value ?? 0; // API returns decimal (0.7232), will be *100 for display
  const winRate = (entry.win_rate_value ?? 0) / 100; // API returns percentage (72.32), convert to decimal

  // Parse timestamps
  const lastSyncAt = entry.last_sync_at ? new Date(entry.last_sync_at) : new Date();
  const updatedAt = entry.updated_at ? new Date(entry.updated_at) : new Date();

  // Parse system tags from API response
  const tags = entry.system_tags && Array.isArray(entry.system_tags)
    ? (entry.system_tags as SmartMoneyTag[])
    : [] as SmartMoneyTag[];

  const profile: AddressProfile = {
    userName: entry.user_name || generateUserPlaceholder(address),
    address,
    platform: DEFAULT_PLATFORM,
    totalPnl,
    totalVolume: volume,
    totalRoi: roi,
    winRate,
    smartScore,
    tradeCount: 0, // Not provided
    tags,
    specializations: {},
    avatarUrl: entry.avatar_url || undefined,
    twitterHandle: entry.x_username || undefined,
    polymarketUrl: getPolymarketProfileUrl(address),
    opinionUrl: getOpinionProfileUrl(address),
    lastActiveAt: lastSyncAt,
    updatedAt,
  };

  // Calculate value for sorting based on smart_score
  const value = smartScore;

  return {
    rank: index + 1,
    address,
    platform: DEFAULT_PLATFORM,
    value,
    profile,
  };
}

/**
 * 转换 SmartWalletsResponse 为 LeaderboardEntry 数组
 */
export function transformSmartWalletsResponse(
  response: SmartWalletsResponse
): LeaderboardEntry[] {
  // Validate response structure
  if (!response || typeof response !== 'object') {
    logger.error('[transformSmartWallets] Invalid response structure');
    return [];
  }

  // Check for error message
  if (response.error && typeof response.error === 'string' && response.error.length > 0) {
    logger.error(`[transformSmartWallets] API error: ${response.error}`);
    return [];
  }

  if (!response.wallets || !Array.isArray(response.wallets)) {
    logger.error('[transformSmartWallets] Missing or invalid wallets array');
    return [];
  }

  // Transform each entry with error handling
  return response.wallets
    .map((entry, index) => {
      try {
        return transformSmartWalletEntry(entry, index);
      } catch (error) {
        logger.error('[transformSmartWallets] Failed to transform entry:', entry, error);
        return null;
      }
    })
    .filter((entry): entry is LeaderboardEntry => entry !== null);
}
