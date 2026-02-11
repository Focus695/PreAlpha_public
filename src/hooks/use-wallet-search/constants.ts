/**
 * Wallet Search Configuration Constants
 */

/** Default configuration for wallet search */
export const DEFAULT_SEARCH_CONFIG = {
  /** Minimum query length to trigger search */
  minQueryLength: 1,

  /** Debounce delay in milliseconds */
  debounceMs: 300,

  /** Number of wallets to fetch per page */
  pageSize: 100,

  /** Maximum number of search results to display */
  maxResults: 20,

  /** Cache expiry time in milliseconds (5 minutes) */
  cacheExpiry: 5 * 60 * 1000,

  /** Minimum number of results before loading more pages */
  minResultsThreshold: 5,
} as const;

/** Search state enum */
export type SearchState = 'idle' | 'loading' | 'loaded' | 'exhausted' | 'error';

/** Fields to search in */
export type SearchField = 'address' | 'userName' | 'twitterHandle' | 'ensName';

/** Default search fields in priority order */
export const DEFAULT_SEARCH_FIELDS: SearchField[] = ['address', 'userName', 'twitterHandle', 'ensName'];
