/**
 * API Response Transformers
 *
 * This file re-exports from the modular transformers structure for backwards compatibility.
 * New code should import directly from '@/lib/transformers' instead.
 *
 * @deprecated Import from '@/lib/transformers' instead
 */

export {
  type RawLeaderboardResponse,
  type DisplayPosition,
  type DisplayTrade,
  type TradeAction,
  transformLeaderboardApiEntry,
  transformLeaderboardApiResponse,
  transformUserPosition,
  transformUserPositions,
  transformUserTrade,
  transformUserTrades,
  wrapAsApiResponse,
  buildAddressProfileFromData,
} from './transformers/index';
