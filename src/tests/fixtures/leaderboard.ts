import type { AddressProfile, LeaderboardEntry } from '@/types';
import { getPolymarketProfileUrl } from '../../lib/api-config';

const DEFAULT_LAST_ACTIVE = '2024-01-01T00:00:00.000Z';
const DEFAULT_UPDATED_AT = '2024-01-02T00:00:00.000Z';

function createMockProfile(overrides?: Partial<AddressProfile>): AddressProfile {
  return {
    userName: overrides?.userName ?? 'MockUser',
    address: overrides?.address ?? '0x1234567890abcdef1234567890abcdef12345678',
    platform: overrides?.platform ?? 'polymarket',
    totalPnl: 150000,
    totalRoi: 1.5,
    winRate: 0.78,
    smartScore: 88,
    totalVolume: 450000,
    tradeCount: 128,
    tags: ['god_level'],
    specializations: { politics: 0.72 },
    lastActiveAt: new Date(DEFAULT_LAST_ACTIVE),
    updatedAt: new Date(DEFAULT_UPDATED_AT),
    ensName: 'oracle.eth',
    twitterHandle: '@oracle',
    polymarketUrl: getPolymarketProfileUrl('0x1234567890abcdef1234567890abcdef12345678'),
    opinionUrl: undefined,
    ...overrides,
  };
}

export function createMockLeaderboardEntry(
  entryOverrides: Partial<LeaderboardEntry> = {},
  profileOverrides: Partial<AddressProfile> = {}
): LeaderboardEntry {
  const profile =
    entryOverrides.profile ?? createMockProfile(profileOverrides);

  return {
    rank: entryOverrides.rank ?? 1,
    address: entryOverrides.address ?? profile.address,
    platform: entryOverrides.platform ?? profile.platform,
    value: entryOverrides.value ?? (profile.smartScore ?? 0),
    profile,
    ...entryOverrides,
  };
}

