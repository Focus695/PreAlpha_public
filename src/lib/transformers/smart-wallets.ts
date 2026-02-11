/**
 * Smart Wallets Transformers
 *
 * Transform smart wallet API responses to AddressProfile domain type.
 * Supports two data sources:
 * 1. /smart-wallets/{address} - Primary data source with enriched fields
 * 2. /leaderboard/user/{walletAddress}/profile - Fallback data source
 */

import type { AddressProfile, SmartMoneyTag, EthAddress } from '@/types';
import type { SmartWalletApiEntry, UserProfileResponse } from '@/lib/api/types';
import { getPolymarketProfileUrl, getOpinionProfileUrl } from '@/lib/api-config';
import { generateUserPlaceholder } from '@/lib/utils';

// ============================================================
// Constants
// ============================================================

const DEFAULT_PLATFORM = 'opinion' as const;

/** Valid SmartMoneyTag values for filtering */
const VALID_SMART_MONEY_TAGS: SmartMoneyTag[] = [
  'god_level',
  'sports_whale',
  'counter_staker',
  'event_insider',
  'bcp_king',
  'alpha_hunter',
  'arb_hunter',
  'consecutive_wins',
  'bot',
];

// ============================================================
// Transformers
// ============================================================

/**
 * Update AddressProfile's lastActiveAt with actual trade time
 * @param profile - The profile to update
 * @param latestTradeTime - The latest trade timestamp (from trades API)
 * @returns Updated profile with accurate lastActiveAt
 */
export function updateLastActiveFromTrades(
  profile: AddressProfile,
  latestTradeTime: Date | null
): AddressProfile {
  if (latestTradeTime) {
    return { ...profile, lastActiveAt: latestTradeTime };
  }
  return profile;
}

/**
 * Transform /smart-wallets/{address} response to AddressProfile
 */
export function smartWalletToAddressProfile(
  data: SmartWalletApiEntry
): AddressProfile {
  // Filter and validate system_tags
  const tags = (data.system_tags ?? [])
    .filter((tag): tag is SmartMoneyTag => VALID_SMART_MONEY_TAGS.includes(tag as SmartMoneyTag));

  return {
    userName: data.user_name ?? generateUserPlaceholder(data.wallet_address),
    address: data.wallet_address as EthAddress,
    platform: DEFAULT_PLATFORM,
    totalPnl: parseFloat(data.total_profit),
    totalVolume: parseFloat(data.volume),
    tradeCount: 0, // Will be populated from separate API
    winRate: data.win_rate_value / 100, // API returns percentage (72.32), convert to decimal
    totalRoi: data.roi_value, // API returns decimal (0.7232), will be *100 for display
    smartScore: data.smart_score,
    tags,
    specializations: {}, // TODO: Implement if API provides this data
    lastActiveAt: new Date(data.last_sync_at),
    updatedAt: new Date(data.updated_at),
    avatarUrl: data.avatar_url ?? undefined,
    ensName: undefined,
    twitterHandle: data.x_username ?? undefined,
    polymarketUrl: getPolymarketProfileUrl(data.wallet_address),
    opinionUrl: getOpinionProfileUrl(data.wallet_address),
  };
}

/**
 * Transform /leaderboard/user/{walletAddress}/profile response to AddressProfile
 * This is a fallback when smart-wallets API returns 404
 *
 * ROI formula: 2P/(V-P)
 * Fields not provided by API: winRate, smartScore, tags (set to null/empty)
 */
export function leaderboardProfileToAddressProfile(
  data: UserProfileResponse['result']
): AddressProfile {
  const totalPnl = parseFloat(data.totalProfit);
  const totalVolume = parseFloat(data.Volume);

  // Calculate ROI using formula: ROI = 2P/(V-P)
  const denominator = totalVolume - totalPnl;
  const roi = Math.abs(denominator) > 0.000001 ? (2 * totalPnl) / denominator : 0;

  return {
    userName: data.userName ?? data.walletAddress,
    address: data.walletAddress as EthAddress,
    platform: DEFAULT_PLATFORM,
    totalPnl,
    totalVolume,
    tradeCount: 0, // Not provided by this API
    winRate: null as unknown as number, // Not provided - null for UI to display "/"
    totalRoi: Number.isFinite(roi) ? roi : 0,
    smartScore: null as unknown as number, // Not provided - null for UI to display "/"
    tags: [], // Not provided by this API
    specializations: {},
    lastActiveAt: new Date(),
    updatedAt: new Date(),
    avatarUrl: data.avatarUrl,
    ensName: undefined,
    twitterHandle: undefined,
    polymarketUrl: getPolymarketProfileUrl(data.walletAddress),
    opinionUrl: getOpinionProfileUrl(data.walletAddress),
  };
}
