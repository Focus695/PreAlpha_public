/**
 * Wallet Search Filter and Sort Utilities
 *
 * Provides fuzzy search functionality across multiple wallet fields
 * with relevance-based result sorting.
 */

import type { LeaderboardEntry } from '@/types';
import type { SearchField } from './constants';

/**
 * Filter options for wallet search
 */
export interface FilterOptions {
  query: string;
  fields?: SearchField[];
}

/**
 * Calculate relevance score for a wallet entry
 * Higher score = more relevant match
 *
 * Scoring:
 * - Exact address match: 100
 * - Address starts with query: 90
 * - Address contains query: 70
 * - Exact username match: 80
 * - Username contains query: 50
 * - Twitter contains query: 40
 * - ENS contains query: 60
 */
function getRelevanceScore(entry: LeaderboardEntry, lowerQuery: string): number {
  const profile = entry.profile;
  let score = 0;

  // Address matching (highest priority)
  if (profile.address.toLowerCase() === lowerQuery) return 100;
  if (profile.address.toLowerCase().startsWith(lowerQuery)) score += 90;
  else if (profile.address.toLowerCase().includes(lowerQuery)) score += 70;

  // Username matching
  if (profile.userName) {
    const userName = profile.userName.toLowerCase();
    if (userName === lowerQuery) score += 80;
    else if (userName.startsWith(lowerQuery)) score += 55;
    else if (userName.includes(lowerQuery)) score += 50;
  }

  // Twitter handle matching
  if (profile.twitterHandle) {
    const twitter = profile.twitterHandle.toLowerCase();
    if (twitter === lowerQuery) score += 75;
    else if (twitter.startsWith(lowerQuery)) score += 45;
    else if (twitter.includes(lowerQuery)) score += 40;
  }

  // ENS name matching
  if (profile.ensName) {
    const ens = profile.ensName.toLowerCase();
    if (ens === lowerQuery) score += 70;
    else if (ens.startsWith(lowerQuery)) score += 50;
    else if (ens.includes(lowerQuery)) score += 45;
  }

  return score;
}

/**
 * Filter wallets by search query across multiple fields
 *
 * @param wallets - Wallet entries to filter
 * @param options - Filter options including query and fields to search
 * @returns Filtered wallet entries
 */
export function filterWallets(
  wallets: LeaderboardEntry[],
  options: FilterOptions
): LeaderboardEntry[] {
  const { query, fields = ['address', 'userName', 'twitterHandle', 'ensName'] } = options;

  if (!query.trim()) {
    return wallets;
  }

  const lowerQuery = query.toLowerCase();

  return wallets.filter((entry) => {
    const profile = entry.profile;

    // Check each field if included in search fields
    for (const field of fields) {
      switch (field) {
        case 'address':
          if (profile.address.toLowerCase().includes(lowerQuery)) {
            return true;
          }
          break;

        case 'userName':
          if (profile.userName && profile.userName.toLowerCase().includes(lowerQuery)) {
            return true;
          }
          break;

        case 'twitterHandle':
          if (profile.twitterHandle && profile.twitterHandle.toLowerCase().includes(lowerQuery)) {
            return true;
          }
          break;

        case 'ensName':
          if (profile.ensName && profile.ensName.toLowerCase().includes(lowerQuery)) {
            return true;
          }
          break;
      }
    }

    return false;
  });
}

/**
 * Sort wallet entries by relevance to search query
 *
 * @param results - Wallet entries to sort
 * @param query - Search query for relevance calculation
 * @returns Sorted wallet entries (most relevant first)
 */
export function sortByRelevance(
  results: LeaderboardEntry[],
  query: string
): LeaderboardEntry[] {
  if (!query.trim()) {
    return results;
  }

  const lowerQuery = query.toLowerCase();

  return [...results].sort((a, b) => {
    const aScore = getRelevanceScore(a, lowerQuery);
    const bScore = getRelevanceScore(b, lowerQuery);

    // Sort by relevance score descending
    if (aScore !== bScore) {
      return bScore - aScore;
    }

    // Tiebreaker: sort by rank ascending
    return a.rank - b.rank;
  });
}

/**
 * Filter and sort in one operation for better performance
 *
 * @param wallets - All wallet entries to search through
 * @param options - Filter options
 * @param limit - Maximum number of results to return
 * @returns Filtered, sorted, and limited wallet entries
 */
export function searchWallets(
  wallets: LeaderboardEntry[],
  options: FilterOptions,
  limit?: number
): LeaderboardEntry[] {
  let results = filterWallets(wallets, options);

  if (options.query) {
    results = sortByRelevance(results, options.query);
  }

  if (limit && limit > 0) {
    results = results.slice(0, limit);
  }

  return results;
}
