/**
 * Signal Transformers
 * Transform trades to signals for the signal feed
 */

import type {
  EthAddress,
  Market,
  MarketCategory,
  Platform,
  Signal,
  SignalType,
} from '@/types';
import type { MarketItem, UserTrade } from '@/lib/api';

// ============================================================
// Constants
// ============================================================

const DEFAULT_PLATFORM: Platform = 'polymarket';

function toNumber(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

// ============================================================
// Helper Functions
// ============================================================

function normalizeCategory(category?: string): MarketCategory {
  switch (category) {
    case 'sports':
    case 'politics':
    case 'crypto':
    case 'economics':
    case 'entertainment':
    case 'science':
      return category;
    default:
      return 'other';
  }
}

function normalizePlatform(chainId?: number): Platform {
  if (typeof chainId === 'number') {
    if (chainId === 137 || chainId === 80001) {
      return 'polymarket';
    }

    if (chainId === 1 || chainId === 11155111) {
      return 'opinion';
    }
  }

  return DEFAULT_PLATFORM;
}

function adaptMarket(item?: MarketItem): Market {
  const platform = normalizePlatform(item?.chainId);
  const status = item?.status === 'resolved' ? 'resolved' : item?.status === 'cancelled' ? 'cancelled' : 'active';
  const yesPrice = typeof item?.yesPrice === 'number' ? item.yesPrice : 0;
  const noPrice = typeof item?.noPrice === 'number' ? item.noPrice : 0;
  const volume = typeof item?.volume === 'number' ? item.volume : 0;
  const liquidity = typeof item?.liquidity === 'number' ? item.liquidity : 0;
  const title = item?.title ?? 'Unknown Market';
  const description = item?.description ?? '';
  const createdAt = item?.createdAt ? new Date(item.createdAt) : new Date();
  const endDate = item?.endDate ? new Date(item.endDate) : createdAt;
  const resolvedAt = item?.resolvedAt ? new Date(item.resolvedAt) : undefined;
  const resolution =
    item?.resolution === 'YES' || item?.resolution === 'NO'
      ? (item.resolution as 'YES' | 'NO')
      : undefined;

  return {
    id: String(item?.id ?? title),
    platform,
    title,
    description,
    category: normalizeCategory(typeof item?.category === 'string' ? item.category : undefined),
    status,
    yesPrice,
    noPrice,
    volume,
    liquidity,
    resolvedAt,
    resolution,
    createdAt,
    endDate,
  };
}

function deriveSignalType(trade: UserTrade): SignalType {
  return trade.side === 'BUY' ? 'smart_money_entry' : 'exit_warning';
}

function buildDescription(trade: UserTrade): string {
  const action = trade.side === 'BUY' ? 'Buy' : 'Sell';
  const outcome = trade.outcomeLabel ? ` (${trade.outcomeLabel})` : '';
  const marketTitle = trade.market?.title ?? `Market ${trade.marketId}`;
  const priceValue = toNumber(trade.price);
  const amountValue = toNumber(trade.amount ?? trade.shares);
  const price = priceValue !== null ? priceValue.toFixed(4) : '—';
  const size = amountValue !== null ? amountValue.toLocaleString() : trade.amount ?? trade.shares ?? '—';
  return `${action}${outcome} ${marketTitle} @ $${price} · ${size} shares`;
}

// ============================================================
// Transformers
// ============================================================

/**
 * Convert a trade to a signal
 * @param trade - The trade to convert
 * @param smartScore - The smart score of the wallet that made this trade
 */
export function tradeToSignal(
  trade: UserTrade,
  smartScore?: number | null
): Signal {
  const addresses: EthAddress[] = [trade.walletAddress as EthAddress];

  return {
    id: trade.txHash ?? `trade-${trade.id}`,
    type: deriveSignalType(trade),
    market: adaptMarket(trade.market),
    addresses,
    smartScore: smartScore ?? null,
    description: buildDescription(trade),
    createdAt: new Date(trade.createdAt),
    metadata: {
      tradeId: trade.id,
      txHash: trade.txHash,
      marketId: trade.marketId,
      rootMarketId: trade.rootMarketId,
      tokenId: trade.tokenId,
      price: trade.price,
      amount: trade.amount,
      pnl: (trade as { profit?: number }).profit ?? null,
      action: trade.side,
      outcomeLabel: trade.outcomeLabel,
    },
  };
}

/**
 * Convert multiple trades to signals
 * @param trades - The trades to convert
 * @param smartScore - The smart score to apply to all signals (if all from same wallet)
 */
export function tradesToSignals(
  trades: UserTrade[],
  smartScore?: number | null
): Signal[] {
  return trades.map(trade => tradeToSignal(trade, smartScore));
}
