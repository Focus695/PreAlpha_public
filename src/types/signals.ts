/**
 * Signal-related type definitions for the SignalsPage
 */

import type { SignalType, MarketCategory } from '@/types';

export type SignalTab = 'all' | 'followed';
export type SignalViewMode = 'card' | 'table';
export type SignalTimeRange = '15m' | '1h' | '4h' | '1d';

export interface SignalFilters {
  types: SignalType[];
  strengthRange: [number, number];
  timeRange: SignalTimeRange;
  category: MarketCategory | 'all';
}

export interface SignalStats {
  totalToday: number;
  avgSmartScore: number;
  highScoreCount: number;
  followedCount: number;
}

export interface SignalUserPreferences {
  followedAddresses: string[];
  bookmarkedSignals: string[];
  mutedAddresses: string[];
}
