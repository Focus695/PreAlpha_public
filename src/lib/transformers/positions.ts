/**
 * Position Transformers
 * Transform position API responses to frontend display types
 */

import type { MarketItem, UserPosition } from '@/lib/api';
import { formatTimeAgo, MISSING_STRING } from './common';

// ============================================================
// Types
// ============================================================

/**
 * 持仓显示格式
 */
export interface DisplayPosition {
  id: string;
  ticker: string;
  market: string;
  outcomeLabel?: string;
  outcome?: string; // "YES" or "NO" from API
  side: 'YES' | 'NO';
  avgPrice: number;
  size: number;
  pnl: number;
  pnlPercent?: number;
  dailyPnlChange?: number;
  dailyPnlChangePercent?: number;
  timeAgo: string;
  currentPrice?: number;
  currentValue?: number;
  quoteSymbol?: string;
  claimStatus?: number;
  claimStatusEnum?: string;
  sharesFrozen?: number;
  marketId?: number;      // Market ID for external links
  rootMarketId?: number;  // Root market ID (0 for binary, non-zero for multi-option)
}

// ============================================================
// Transformers
// ============================================================

/**
 * 转换 UserPosition 为显示格式
 */
export function transformUserPosition(position: UserPosition): DisplayPosition {
  const positionExt = position as unknown as {
    marketTitle?: string;
    outcomeLabel?: string;
    outcome?: string;
    currentValue?: number;
    unrealizedPnlPercent?: string;
    dailyPnlChange?: string;
    dailyPnlChangePercent?: string;
    sharesFrozen?: string | number;
    quoteSymbol?: string;
    ticker?: string;
    updatedAt?: string | number;
    claimStatus?: number;
    claimStatusEnum?: string;
    // Legacy fields from index signature
    size?: number;
    avgPrice?: number;
    pnl?: number;
  };

  const market = position.market as MarketItem | undefined;
  const marketTitle = market?.title ?? positionExt.marketTitle ?? MISSING_STRING;
  const outcomeLabel = positionExt.outcomeLabel;
  const outcome = positionExt.outcome;

  // Get values with fallbacks
  const extAvgPrice = positionExt.avgPrice;
  const extSize = positionExt.size;
  const extPnl = positionExt.pnl;

  const avgPrice = (extAvgPrice ?? position.avgPrice) as number | undefined ?? 0;
  const size = (extSize ?? position.size) as number | undefined ?? 0;
  const pnl = (extPnl ?? position.pnl) as number | undefined ?? 0;
  const currentPrice = (position.currentPrice ?? avgPrice) as number;

  // Calculate current value properly
  const currentValue = (positionExt.currentValue ?? currentPrice * size) as number;

  // Parse additional numeric fields from string API responses
  const pnlPercent = positionExt.unrealizedPnlPercent
    ? parseFloat(positionExt.unrealizedPnlPercent)
    : undefined;
  const dailyPnlChange = positionExt.dailyPnlChange
    ? parseFloat(positionExt.dailyPnlChange)
    : undefined;
  const dailyPnlChangePercent = positionExt.dailyPnlChangePercent
    ? parseFloat(positionExt.dailyPnlChangePercent)
    : undefined;
  const sharesFrozen = positionExt.sharesFrozen
    ? typeof positionExt.sharesFrozen === 'string'
      ? parseFloat(positionExt.sharesFrozen)
      : positionExt.sharesFrozen
    : undefined;

  const quoteSymbol =
    positionExt.quoteSymbol ??
    (typeof (position as unknown as { quoteToken?: string }).quoteToken === 'string'
      ? 'USDT'
      : undefined);
  const sideCandidate = positionExt as { side?: 'YES' | 'NO' };
  const side: 'YES' | 'NO' = sideCandidate.side ?? 'YES';
  const ticker = positionExt.ticker ?? marketTitle.substring(0, 6).toUpperCase();
  const updatedAt = positionExt.updatedAt;
  const claimStatus = positionExt.claimStatus;
  const claimStatusEnum = positionExt.claimStatusEnum;

  return {
    id: String(position.id),
    ticker,
    market: marketTitle,
    outcomeLabel,
    outcome,
    side,
    avgPrice,
    size,
    pnl,
    pnlPercent,
    dailyPnlChange,
    dailyPnlChangePercent,
    currentPrice,
    currentValue,
    quoteSymbol,
    claimStatus,
    claimStatusEnum,
    sharesFrozen,
    timeAgo: updatedAt ? formatTimeAgo(updatedAt) : MISSING_STRING,
    marketId: position.marketId,
    rootMarketId: position.rootMarketId,
  };
}

/**
 * 批量转换持仓
 */
export function transformUserPositions(
  positions: UserPosition[]
): DisplayPosition[] {
  return positions.map(transformUserPosition);
}
