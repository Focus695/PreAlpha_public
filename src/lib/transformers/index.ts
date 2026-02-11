/**
 * Transformers Module
 * Unified exports for all data transformation utilities
 */

// Common utilities
export {
  MISSING_STRING,
  toNumber,
  formatTimeAgo,
  formatRelativeTime,
  formatRelativeTimeFromDate,
  createSeededRandom,
  normalizePercentages,
  generateUUID,
} from './common';

// Leaderboard transformers
export {
  type RawLeaderboardResponse,
  type DisplayProfile,
  transformLeaderboardApiEntry,
  transformLeaderboardApiResponse,
  leaderboardEntryToDisplayProfile,
  leaderboardEntriesToDisplayProfiles,
  addressProfileToDisplayProfile,
} from './leaderboard';

// Position transformers
export {
  type DisplayPosition,
  transformUserPosition,
  transformUserPositions,
} from './positions';

// Trade transformers
export {
  type DisplayTrade,
  type TradeAction,
  transformUserTrade,
  transformUserTrades,
} from './trades';

// Signal transformers
export {
  tradeToSignal,
  tradesToSignals,
} from './signals';

// Profile utilities
export {
  type DataSourceType,
  type DataSourceMeta,
  type ProfitDistributionApiSegment,
  type ProfitDistributionSegment,
  type ProfitDistributionData,
  type HoldingApiRow,
  type HoldingRow,
  type HoldingsData,
  type ExtendedAddressProfile,
  type ProfitSegmentKey,
  PROFIT_SEGMENT_TEMPLATES,
  PROFIT_SEGMENT_BAR_CLASSES,
  HOLDING_MARKETS,
  SOURCE_LABELS,
  SOURCE_STYLES,
  normalizeProfile,
  buildAddressProfileFromData,
  generateMockProfitDistribution,
  normalizeApiProfitDistribution,
  resolveProfitDistribution,
  generateMockHoldings,
  resolveHoldingsData,
} from './profile';

// Smart wallets transformers
export {
  smartWalletToAddressProfile,
  leaderboardProfileToAddressProfile,
} from './smart-wallets';

// Utility wrapper for API responses
import type { ApiResponse } from '@/types';
import { generateUUID } from './common';

/**
 * 将转换后的数据包装为 ApiResponse 格式
 */
export function wrapAsApiResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateUUID(),
    },
  };
}
