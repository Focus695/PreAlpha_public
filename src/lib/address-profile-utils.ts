/**
 * Address Profile Utilities
 *
 * This file re-exports from the modular transformers structure for backwards compatibility.
 * New code should import directly from '@/lib/transformers' instead.
 *
 * @deprecated Import from '@/lib/transformers' instead
 */

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
  createSeededRandom,
  normalizeProfile,
  normalizePercentages,
  formatRelativeTime,
  formatRelativeTimeFromDate,
  generateMockProfitDistribution,
  normalizeApiProfitDistribution,
  resolveProfitDistribution,
  generateMockHoldings,
  resolveHoldingsData,
} from './transformers/index';
