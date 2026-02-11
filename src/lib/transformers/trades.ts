/**
 * Trade Transformers
 * Transform trade API responses to frontend display types
 */

import type { MarketItem, UserTrade } from '@/lib/api';
import { formatTimeAgo, MISSING_STRING } from './common';

// ============================================================
// Types
// ============================================================

/**
 * 交易动作类型
 */
export type TradeAction = 'BUY' | 'SELL' | 'SPLIT' | 'MERGE';

/**
 * 交易历史显示格式
 */
export interface DisplayTrade {
  id: string;
  ticker: string;
  market: string;
  outcomeLabel?: string;
  outcome?: 'YES' | 'NO'; // 预测结果（YES/NO）
  side: TradeAction; // 交易动作（BUY/SELL/SPLIT/MERGE）
  exitPrice: number;
  size: number;
  pnl: number;
  fee?: number;
  usdAmount?: number;
  status?: number;
  statusEnum?: string;
  chainId?: string;
  settledAgo: string;
  txHash: string;
  marketId?: number;      // Market ID for external links
  rootMarketId?: number;  // Root market ID (0 for binary, non-zero for multi-option)
}

// ============================================================
// Transformers
// ============================================================

/**
 * 转换 UserTrade 为显示格式
 */
export function transformUserTrade(trade: UserTrade): DisplayTrade {
  const market = trade.market as MarketItem | undefined;
  const profitField = (trade as unknown as { profit?: string | number }).profit;
  const pnl = typeof profitField === 'number'
    ? profitField
    : typeof profitField === 'string'
      ? parseFloat(profitField)
      : 0;
  const exitPrice = typeof trade.price === 'number'
    ? trade.price
    : parseFloat(trade.price ?? '0');
  const sizeRaw = (trade as unknown as { amount?: number | string, shares?: string });
  let size = 0;
  if (typeof sizeRaw.amount === 'number') {
    size = sizeRaw.amount;
  } else if (typeof sizeRaw.shares === 'string') {
    size = parseFloat(sizeRaw.shares);
  }
  const outcomeLabel = (trade as { outcomeLabel?: string }).outcomeLabel;
  const outcome = (trade as { outcome?: 'YES' | 'NO' }).outcome;

  // Parse additional fields from API responses
  const feeRaw = (trade as unknown as { fee?: string }).fee;
  const fee = feeRaw ? parseFloat(feeRaw) : undefined;
  const usdAmountRaw = (trade as unknown as { usdAmount?: string }).usdAmount;
  const usdAmount = usdAmountRaw ? parseFloat(usdAmountRaw) : undefined;
  const status = (trade as unknown as { status?: number }).status;
  const statusEnum = (trade as unknown as { statusEnum?: string }).statusEnum;
  const chainId = (trade as unknown as { chainId?: string }).chainId;

  // side 直接使用 API 返回的值（BUY/SELL/SPLIT/MERGE）
  const side = (trade as { side?: TradeAction }).side ?? 'BUY';

  // Handle createdAt as number (milliseconds) or string
  const createdAt = typeof trade.createdAt === 'number'
    ? new Date(trade.createdAt).toISOString()
    : trade.createdAt;

  return {
    id: String(trade.id),
    ticker: market?.title?.substring(0, 6).toUpperCase() ?? MISSING_STRING,
    market: market?.title ?? (trade as unknown as { marketTitle?: string }).marketTitle ?? MISSING_STRING,
    outcomeLabel,
    outcome,
    side,
    exitPrice,
    size,
    pnl,
    fee,
    usdAmount,
    status,
    statusEnum,
    chainId,
    settledAgo: createdAt ? formatTimeAgo(createdAt) : MISSING_STRING,
    txHash: trade.txHash,
    marketId: trade.marketId,
    rootMarketId: trade.rootMarketId,
  };
}

/**
 * 批量转换交易记录
 */
export function transformUserTrades(trades: UserTrade[]): DisplayTrade[] {
  return trades.map(transformUserTrade);
}
