/**
 * Profile Transformers
 * Utilities for address profile data transformation and mock data generation
 */

import type { AddressProfile, TradeSide, EthAddress, SmartMoneyTag } from '@/types';
import type { UserPosition, UserTrade } from '@/lib/api';
import { getPolymarketProfileUrl, getOpinionProfileUrl } from '../api-config';
import { createSeededRandom, normalizePercentages, formatRelativeTime, formatRelativeTimeFromDate } from './common';
import { generateUserPlaceholder } from '@/lib/utils';

// ============================================================
// Types
// ============================================================

export type DataSourceType = 'api' | 'leaderboard' | 'mock';

export interface DataSourceMeta {
  source: DataSourceType;
  reason?: string;
  timestamp: string;
}

export interface ProfitDistributionApiSegment {
  key?: string;
  label: string;
  value: number;
}

export interface ProfitDistributionSegment {
  key: ProfitSegmentKey;
  label: string;
  value: number;
  indicatorClass: string;
}

export interface ProfitDistributionData {
  segments: ProfitDistributionSegment[];
  meta: DataSourceMeta;
}

export interface HoldingApiRow {
  id?: string;
  market?: string;
  marketCode?: string;
  side?: TradeSide;
  value?: number;
  amount?: number;
  avgPrice?: number;
  pnl?: number;
  updatedAt?: string | Date;
}

export interface HoldingRow {
  id: string;
  side: TradeSide;
  market: string;
  marketCode: string;
  value: number;
  amount: number;
  avgPrice: number;
  pnl: number;
  updatedLabel: string;
}

export interface HoldingsData {
  rows: HoldingRow[];
  meta: DataSourceMeta;
}

export interface ExtendedAddressProfile extends AddressProfile {
  profitDistribution?: ProfitDistributionApiSegment[];
  openPositions?: HoldingApiRow[];
}

// ============================================================
// Constants
// ============================================================

export const PROFIT_SEGMENT_TEMPLATES = [
  { key: 'gt500', label: '> 500%', indicatorClass: 'bg-profit' },
  { key: '200to500', label: '200% ~ 500%', indicatorClass: 'bg-profit/60' },
  { key: '0to200', label: '0% ~ 200%', indicatorClass: 'bg-surface2 border border-border' },
  { key: 'lt50', label: '< -50%', indicatorClass: 'bg-down' },
] as const;

export type ProfitSegmentKey = (typeof PROFIT_SEGMENT_TEMPLATES)[number]['key'];

export const PROFIT_SEGMENT_BAR_CLASSES: Record<ProfitSegmentKey, string> = {
  gt500: 'bg-profit',
  '200to500': 'bg-profit/60',
  '0to200': 'bg-surface2',
  lt50: 'bg-down',
};

export const HOLDING_MARKETS = [
  { code: 'TRUMP', name: 'Trump 2024 Winner' },
  { code: 'FED', name: 'Fed Rate Cut 25bps' },
  { code: 'BTC', name: 'Bitcoin Above 100K' },
  { code: 'ETH', name: 'Ethereum ETF Approval' },
  { code: 'AI', name: 'AI Regulation Bill' },
] as const;

export const SOURCE_LABELS: Record<DataSourceType, string> = {
  api: 'Live',
  leaderboard: 'Snapshot',
  mock: 'Mock',
};

export const SOURCE_STYLES: Record<DataSourceType, string> = {
  api: 'border-brand/40 text-brand',
  leaderboard: 'border-accent/30 text-accent',
  mock: 'border-border text-txt-secondary',
};

const DEFAULT_PLATFORM = 'opinion' as const;
const MISSING_STRING = '/';

function toNumber(value: string | number | null | undefined): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

// ============================================================
// Profile Utilities
// ============================================================

/**
 * Normalize AddressProfile with proper Date objects
 */
export function normalizeProfile(profile?: AddressProfile | null): ExtendedAddressProfile | null {
  if (!profile) {
    return null;
  }

  const extendedProfile = profile as ExtendedAddressProfile;
  return {
    ...extendedProfile,
    lastActiveAt: new Date(profile.lastActiveAt),
    updatedAt: new Date(profile.updatedAt),
  };
}

/**
 * 从交易和持仓数据构建 AddressProfile
 */
export function buildAddressProfileFromData(
  address: string,
  trades: UserTrade[],
  positions: UserPosition[]
): AddressProfile {
  const tradeCount = trades.length;
  const totalVolume = trades.reduce(
    (sum, t) => sum + toNumber(t.amount ?? t.usdAmount ?? t.shares),
    0
  );
  const totalPnl = positions.reduce(
    (sum, p) => sum + toNumber((p as { pnl?: string | number }).pnl ?? p.unrealizedPnl),
    0
  );

  const profitablePositions = positions.filter(
    (p) => toNumber((p as { pnl?: string | number }).pnl ?? p.unrealizedPnl) > 0
  ).length;
  const winRate = positions.length > 0 ? profitablePositions / positions.length : 0;

  return {
    userName: generateUserPlaceholder(address),
    address: address as EthAddress,
    platform: DEFAULT_PLATFORM,
    totalPnl,
    totalVolume,
    tradeCount,
    winRate,
    totalRoi: totalVolume > 0 ? totalPnl / totalVolume : 0,
    smartScore: 0,
    tags: [] as SmartMoneyTag[],
    specializations: {},
    ensName: MISSING_STRING,
    twitterHandle: undefined,
    polymarketUrl: getPolymarketProfileUrl(address),
    opinionUrl: getOpinionProfileUrl(address),
    lastActiveAt: trades.length > 0 ? new Date(trades[0].createdAt) : new Date(),
    updatedAt: new Date(),
  };
}

// ============================================================
// Mock Data Generators
// ============================================================

/**
 * Generate mock profit distribution data
 */
export function generateMockProfitDistribution(
  profile?: ExtendedAddressProfile | null
): ProfitDistributionSegment[] {
  const random = createSeededRandom(`pnl-${profile?.address ?? 'default'}`);
  const roi = Math.max(-1, Math.min(profile?.totalRoi ?? 0.4, 2));
  const isProfitable = (profile?.totalPnl ?? 0) >= 0;

  const rawSegments = PROFIT_SEGMENT_TEMPLATES.map((template) => {
    let weight = 1;

    if (template.key === 'gt500') {
      weight = roi > 1 ? 1.4 : 0.9;
    } else if (template.key === '200to500') {
      weight = roi > 0.5 ? 1.2 : 0.8;
    } else if (template.key === 'lt50') {
      weight = isProfitable ? 0.5 : 1.3;
    }

    return {
      ...template,
      value: random() * weight + 0.2,
    };
  });

  return normalizePercentages(rawSegments);
}

/**
 * Normalize API profit distribution to standard format
 */
export function normalizeApiProfitDistribution(
  segments: ProfitDistributionApiSegment[]
): ProfitDistributionSegment[] {
  if (!segments.length) {
    return [];
  }

  const normalized = segments.map((segment, index) => {
    const template =
      PROFIT_SEGMENT_TEMPLATES.find(
        (tpl) =>
          tpl.key === segment.key ||
          tpl.label.toLowerCase() === segment.label.toLowerCase()
      ) ?? PROFIT_SEGMENT_TEMPLATES[index % PROFIT_SEGMENT_TEMPLATES.length];

    return {
      key: template.key,
      label: segment.label || template.label,
      indicatorClass: template.indicatorClass,
      value: Number(segment.value) || 0,
    };
  });

  return normalizePercentages(normalized);
}

/**
 * Resolve profit distribution data (API or mock fallback)
 */
export function resolveProfitDistribution(
  profile?: ExtendedAddressProfile | null
): ProfitDistributionData {
  const timestamp = profile?.updatedAt?.toISOString?.() ?? new Date().toISOString();
  const apiSegments = profile?.profitDistribution;

  if (apiSegments?.length) {
    return {
      segments: normalizeApiProfitDistribution(apiSegments),
      meta: {
        source: 'api',
        timestamp,
      },
    };
  }

  return {
    segments: generateMockProfitDistribution(profile),
    meta: {
      source: 'mock',
      reason: apiSegments ? 'profitDistribution:empty' : 'profitDistribution:not-provided',
      timestamp,
    },
  };
}

/**
 * Generate mock holdings data
 */
export function generateMockHoldings(address: string, count = 5): HoldingRow[] {
  const random = createSeededRandom(`holdings-${address}`);

  return Array.from({ length: count }).map((_, index) => {
    const market = HOLDING_MARKETS[Math.floor(random() * HOLDING_MARKETS.length)];
    const side: TradeSide = random() > 0.45 ? 'BUY' : 'SELL';
    const value = Math.round((random() * 8000 + 500) / 10) * 10;
    const amount = Number((random() * 25 + 5).toFixed(1));
    const avgPrice = Number((random() * 0.7 + 0.1).toFixed(3));
    const pnl = Number(((random() - 0.45) * 900).toFixed(2));
    const minutesAgo = Math.floor(random() * 360) + 5;

    return {
      id: `${market.code}-${index}`,
      side,
      market: market.name,
      marketCode: market.code,
      value,
      amount,
      avgPrice,
      pnl,
      updatedLabel: formatRelativeTime(minutesAgo),
    };
  });
}

/**
 * Resolve holdings data (API or mock fallback)
 */
export function resolveHoldingsData(profile?: ExtendedAddressProfile | null): HoldingsData {
  const timestamp = profile?.updatedAt?.toISOString?.() ?? new Date().toISOString();
  const positions = profile?.openPositions;

  if (positions?.length) {
    const rows = positions.map((position, index) => ({
      id: position.id ?? `${profile?.address ?? 'position'}-${index}`,
      side: position.side ?? 'BUY',
      market: position.market ?? `Market ${index + 1}`,
      marketCode: position.marketCode ?? 'MKT',
      value: position.value ?? 0,
      amount: position.amount ?? 0,
      avgPrice: position.avgPrice ?? 0,
      pnl: position.pnl ?? 0,
      updatedLabel: formatRelativeTimeFromDate(position.updatedAt ?? profile?.updatedAt),
    }));

    return {
      rows,
      meta: {
        source: 'api',
        timestamp,
      },
    };
  }

  return {
    rows: generateMockHoldings(profile?.address ?? 'mock'),
    meta: {
      source: 'mock',
      reason: positions ? 'openPositions:empty' : 'openPositions:not-provided',
      timestamp,
    },
  };
}
