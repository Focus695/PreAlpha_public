/**
 * API Types
 * Types specific to API responses (not domain types)
 */

import type { EthAddress } from '@/types';

// ============================================================
// Filter and Query Types
// ============================================================

/** Market status filter */
export type MarketStatusFilter = 'activated' | 'resolved';

/** Market type filter: 0 = all, 1 = binary, 2 = categorical */
export type MarketTypeFilter = '0' | '1' | '2';

/** Sort options for market list */
export type MarketSortBy = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';

/** Price history interval */
export type PriceHistoryInterval = '1m' | '1h' | '1d' | '1w' | 'max';

/** Leaderboard data type */
export type LeaderboardDataType = 'profit' | 'volume';

/** Leaderboard period: 0 = all-time, 1 = 24h, 7 = 7d, 30 = 30d */
export type LeaderboardPeriod = '0' | '1' | '7' | '30';

// ============================================================
// API Response Types
// ============================================================

/** Market item from API */
export interface MarketItem {
  id: number;
  title: string;
  description?: string;
  status: string;
  marketType: number;
  yesPrice?: number;
  noPrice?: number;
  volume?: number;
  liquidity?: number;
  createdAt?: string;
  endDate?: string;
  resolvedAt?: string;
  resolution?: string;
  chainId?: number;
  imageUrl?: string;
  [key: string]: unknown;
}

/** Binary market detail */
export interface BinaryMarketDetail extends MarketItem {
  yesTokenId?: string;
  noTokenId?: string;
}

/** Categorical market detail with sub-markets */
export interface CategoricalMarketDetail extends MarketItem {
  subMarkets: MarketItem[];
}

/** Token latest price response */
export interface TokenLatestPrice {
  tokenId: string;
  price: number;
  timestamp: string;
  marketId?: number;
  side?: string;
  [key: string]: unknown;
}

/** Order book entry */
export interface OrderBookEntry {
  price: number;
  size: number;
}

/** Order book response */
export interface OrderBook {
  tokenId: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  timestamp: string;
}

/** Price history point */
export interface PriceHistoryPoint {
  t: number; // timestamp
  p: number; // price
}

/** User trade record from API */
export interface UserTrade {
  id: number;
  txHash: string;
  walletAddress?: string;
  marketId: number;
  marketTitle?: string;
  rootMarketId?: number;
  rootMarketTitle?: string;
  tokenId: string;
  side: 'BUY' | 'SELL' | 'SPLIT' | 'MERGE';
  outcome?: string; // "YES" or "NO"
  outcomeSide?: number;
  outcomeSideEnum?: string;
  shares: string; // API returns as string, needs conversion to number
  price: string; // API returns as string, needs conversion to number
  amount?: string;
  fee?: string;
  profit?: string;
  quoteToken?: string;
  quoteTokenUsdPrice?: string;
  usdAmount?: string;
  status?: number;
  statusEnum?: string;
  chainId?: string;
  createdAt: number; // API returns timestamp as number (milliseconds)
  // Legacy fields (for backward compatibility)
  market?: MarketItem;
  outcomeLabel?: string;
  [key: string]: unknown;
}

/** User position from API */
export interface UserPosition {
  id: number;
  walletAddress: string;
  marketId: number;
  marketTitle?: string;
  marketStatus?: number;
  marketStatusEnum?: string;
  marketCutoffAt?: number;
  rootMarketId?: number;
  rootMarketTitle?: string;
  tokenId: string;
  conditionId?: string;
  sharesOwned: string; // API returns as string, needs conversion to number
  sharesFrozen?: string;
  avgEntryPrice: string; // API returns as string, needs conversion to number
  currentPrice?: number;
  currentValueInQuoteToken?: string;
  unrealizedPnl: string; // API returns as string, needs conversion to number
  unrealizedPnlPercent?: string;
  dailyPnlChange?: string;
  dailyPnlChangePercent?: string;
  outcome?: string; // "YES" or "NO"
  outcomeSide?: number;
  outcomeSideEnum?: string;
  claimStatus?: number;
  claimStatusEnum?: string;
  quoteToken?: string;
  // Legacy fields (for backward compatibility)
  market?: MarketItem;
  outcomeLabel?: string;
  [key: string]: unknown;
}

/** Quote token */
export interface QuoteToken {
  id: number;
  name: string;
  symbol: string;
  address: string;
  decimals: number;
  chainId: number;
  [key: string]: unknown;
}

/** Leaderboard entry from API */
export interface LeaderboardApiEntry {
  rank: number;
  walletAddress: string;
  profit?: number;
  volume?: number;
  roi?: number;
  winRate?: number;
  tradeCount?: number;
  userName?: string;
  avatar?: string;
  [key: string]: unknown;
}

/** Wallet label */
export interface WalletLabel {
  id: number;
  walletAddress: string;
  labelName: string;
  creatorAddress: string;
  createdAt: string;
}

/** Popular label stats */
export interface PopularLabel {
  labelName: string;
  count: number;
}

/** User profile from /leaderboard/user/{walletAddress}/profile */
export interface UserProfileResponse {
  errno: number;
  errmsg: string;
  result: {
    walletAddress: string;
    userName?: string;
    avatarUrl?: string;
    email?: string;
    introduction?: string;
    location?: string;
    xUsername?: string;
    xUserId?: string;
    totalProfit: string;
    profitIncRate: string;
    Volume: string;
    VolumeIncRate: string;
    netWorth: string;
    portfolio: string;
    score: string;
    rankTheWeek: number;
    follower: number;
    following: number;
    followed: boolean;
    alert: boolean;
    balance: Array<{
      chainId: string;
      currencyAddress: string;
      balance: string;
      totalBalance: string;
      netWorth: string;
    }>;
    multiSignedWalletAddress?: Record<string, string>;
  };
}

/** User labels from /labels/{walletAddress} */
export interface UserLabelsResponse {
  code: number;
  msg: string;
  result: string[];
}

/** Volume distribution item */
export interface VolumeDistributionItem {
  chainId: string;
  label: string;
  labelId: number;
  volume: number;
}

/** Volume distribution response */
export interface VolumeDistributionResponse {
  errno: number;
  errmsg: string;
  result: {
    volumeDistribution: VolumeDistributionItem[];
  };
}

/** Auth payload for label operations */
export interface LabelAuth {
  address: EthAddress;
  signature: string;
  message: string;
}

/** Paginated response */
export interface PaginatedApiResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/** Address performance point */
export interface AddressPerformancePoint {
  timestamp: string;
  pnl: number;
  cumulativePnl?: number;
}

// ============================================================
// Enriched Leaderboard Types
// ============================================================

/** Enriched leaderboard entry from /leaderboard/leaderboard-enriched */
export interface EnrichedLeaderboardApiEntry {
  id: number;
  avatar: string;
  rankingChange: number;
  rankingType: number;
  userName: string;
  walletAddress: string;
  smartScoreValue: string; // e.g., "63.70"
  pnlValue: string; // e.g., "999811.32829669921"
  volumeValue: string; // e.g., "144487.19295369001"
  roiValue: string; // Will be recalculated on frontend
  winRateValue: string; // e.g., "100.00"
  systemTag: string; // Comma-separated tags
}

/** Enriched API response wrapper */
export interface EnrichedLeaderboardResponse {
  errno: number;
  errmsg: string;
  result: {
    list: EnrichedLeaderboardApiEntry[];
  };
}

/** Cache storage structure for enriched leaderboard */
export interface LeaderboardCacheEntry {
  data: EnrichedLeaderboardApiEntry[];
  timestamp: number;
  expiresAt: number;
  timeRange: '1d' | '7d' | '30d' | 'all';
}

// ============================================================
// Smart Wallets API Types
// ============================================================

/** Smart wallets sort options */
export type SmartWalletSortBy =
  | 'total_profit'
  | 'volume'
  | 'smart_score'
  | 'roi_value'
  | 'win_rate_value'
  | 'follower_count'
  | 'last_sync_at';

/** Smart wallet API entry */
export interface SmartWalletApiEntry {
  wallet_address: string;
  user_name: string | null;
  avatar_url: string | null;
  introduction: string | null;
  x_username: string | null;
  x_user_id: string | null;
  location: string | null;
  email: string | null;
  total_profit: string;
  volume: string;
  volume_inc_rate: string;
  profit_inc_rate: string;
  net_worth: string;
  portfolio: string;
  score: string | null;
  rank_the_week: string | null;
  follower_count: number;
  following_count: number;
  followed: boolean;
  smart_score: number;
  roi_value: number;
  win_rate_value: number;
  system_tags?: string[];
  balance: Array<{
    balance: string;
    chainId: string;
    netWorth: string;
    totalBalance: string;
    currencyAddress: string;
  }>;
  multi_signed_wallet_address: Record<string, string> | null;
  first_seen_at: string;
  last_sync_at: string;
  created_at: string;
  updated_at: string;
}

/** Smart wallet detail response with wrapper */
export interface SmartWalletDetailResponse {
  error: string;
  wallet: SmartWalletApiEntry | null; // null when address not found (404)
}

/** Smart wallets list response */
export interface SmartWalletsResponse {
  error: string;
  wallets: SmartWalletApiEntry[];
  total: number;
  page: number;
  pageSize: number;
}

/** Smart wallets query options */
export interface SmartWalletsOptions {
  page?: number;
  pageSize?: number;
  sortBy?: SmartWalletSortBy;
  sortOrder?: 'asc' | 'desc';
  minSmartScore?: number;
  minRoi?: number;
  minWinRate?: number;
  hasSmartScore?: boolean;
  search?: string;
}

/** Smart wallets statistics */
export interface SmartWalletsStats {
  total: number | string;
  withSmartScore: number | string;
  avgSmartScore: number;
  avgRoi: number;
  avgWinRate: number;
  avgPnl: number;
}

/** Smart wallets stats response */
export interface SmartWalletsStatsResponse {
  error: string;
  stats: SmartWalletsStats;
}

// ============================================================
// Category Distribution API Types
// ============================================================

/** Category distribution item */
export interface CategoryDistributionItem {
  chainId: string;
  label: string;
  labelId: number;
  volume: number;
}

/** Category distribution response from /smart-wallets/{address}/category-distribution */
export interface CategoryDistributionResponse {
  error: string;
  volumeDistribution: CategoryDistributionItem[];
}

// ============================================================
// Authentication API Types
// ============================================================

/** Response from /auth/nonce endpoint */
export interface AuthNonceResponse {
  errno: number;
  errmsg: string;
  result: {
    nonce: string;
  } | null;
}

/** Response from /auth/verify endpoint */
export interface AuthVerifyResponse {
  errno: number;
  errmsg: string;
  result: {
    token: string;
    address: string;
  } | null;
}

/** Request payload for /auth/verify */
export interface AuthVerifyRequest {
  message: string;
  signature: string;
}

// ============================================================
// User Management API Types
// ============================================================

/** Response from /user/profile endpoint */
export interface UserProfileDataResponse {
  errno: number;
  errmsg: string;
  result: {
    followingWallets: string[];
    followingCount: number;
  } | null;
}

/** Request payload for updating following list */
export interface UpdateFollowingRequest {
  followingWallets: string[];
}

/** Response from following update endpoints */
export interface FollowingUpdateDataResponse {
  errno: number;
  errmsg: string;
  result: {
    followingWallets: string[];
    followingCount: number;
  } | null;
}

/** Request payload for follow/unfollow single wallet */
export interface FollowTargetRequest {
  targetAddress: string;
}

/** Label data with timestamps */
export interface LabelData {
  targetAddress: string;
  labels: string[];
  createdAt: number;
  updatedAt: number;
}

/** Request payload for label operations */
export interface LabelsRequest {
  targetAddress: string;
  labels: string[];
}

/** Response from label endpoints */
export interface LabelsDataResponse {
  errno: number;
  errmsg: string;
  result: LabelData | null;
}

/** Response from GET /user/labels (all labels) */
export interface AllLabelsDataResponse {
  errno: number;
  errmsg: string;
  result: LabelData[] | null;
}

/** Response from GET /user/labels/unique */
export interface UniqueLabelsDataResponse {
  errno: number;
  errmsg: string;
  result: string[] | null;
}

/** Remark data with timestamps */
export interface RemarkData {
  targetAddress: string;
  remark: string;
  createdAt: number;
  updatedAt: number;
}

/** Request payload for remark operations */
export interface RemarkRequest {
  targetAddress: string;
  remark: string;
}

/** Response from remark endpoints */
export interface RemarkDataResponse {
  errno: number;
  errmsg: string;
  result: RemarkData | null;
}

/** Response from GET /user/remarks (all remarks) */
export interface AllRemarksDataResponse {
  errno: number;
  errmsg: string;
  result: RemarkData[] | null;
}

/** Response from remark deletion */
export interface RemarkDeleteDataResponse {
  errno: number;
  errmsg: string;
  result: {
    deleted: boolean;
  } | null;
}

/** Response from GET /user/labels/search/{label} */
export interface SearchLabelsDataResponse {
  errno: number;
  errmsg: string;
  result: LabelData[] | null;
}

/** Response from GET /user/remarks/search/{keyword} */
export interface SearchRemarksDataResponse {
  errno: number;
  errmsg: string;
  result: RemarkData[] | null;
}
