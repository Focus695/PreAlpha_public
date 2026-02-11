/**
 * Wallet Search Hook
 *
 * Progressive loading + fuzzy search for wallet discovery.
 * Searches across address, username, twitter handle, and ENS name.
 *
 * Lazy loading: Only fetches data when user starts searching, not on mount.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { logger } from '@/lib/logger';
import type { LeaderboardEntry } from '@/types';
import { apiClient } from '@/lib/api-client';
import { transformSmartWalletsResponse } from '@/lib/transformers/leaderboard';
import { DEFAULT_SEARCH_CONFIG } from './constants';
import { filterWallets, sortByRelevance } from './filter';

/**
 * Configuration options for useWalletSearch
 */
export interface UseWalletSearchOptions {
  /** Minimum query length to trigger search */
  minQueryLength?: number;
  /** Debounce delay in milliseconds */
  debounceMs?: number;
  /** Number of wallets to fetch per page */
  pageSize?: number;
  /** Maximum number of search results to display */
  maxResults?: number;
  /** Cache expiry time in milliseconds */
  cacheExpiry?: number;
}

/**
 * Loading progress information
 */
export interface LoadingProgress {
  loadedPages: number;
  loadedWallets: number;
  totalWallets: number;
  percentage: number;
  foundMatches: number;
}

/**
 * Return type for useWalletSearch
 */
export interface UseWalletSearchReturn {
  // All loaded wallets
  results: LeaderboardEntry[];

  // Filtered search results
  filteredResults: LeaderboardEntry[];

  // Loading states
  isLoading: boolean; // Initial loading
  isSearching: boolean; // Active search in progress
  isLoadingMore: boolean; // Loading more pages

  // Progress tracking
  loadingProgress: LoadingProgress;

  // Search query
  searchQuery: string;

  // Actions
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  refetch: () => void;

  // Error state
  error: Error | null;
}

/**
 * Main wallet search hook with progressive loading
 */
export function useWalletSearch(
  options: UseWalletSearchOptions = {}
): UseWalletSearchReturn {
  const config = { ...DEFAULT_SEARCH_CONFIG, ...options };

  // State
  const [searchQuery, setSearchQueryState] = useState('');
  const [allWallets, setAllWallets] = useState<LeaderboardEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalWallets, setTotalWallets] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress>({
    loadedPages: 0,
    loadedWallets: 0,
    totalWallets: 0,
    percentage: 0,
    foundMatches: 0,
  });

  // Refs for debounce and abort control
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchInProgressRef = useRef<string | null>(null);

  // Track if data has been initialized
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch a single page of wallet data
   */
  const fetchPage = useCallback(
    async (page: number, signal?: AbortSignal) => {
      logger.debug(`[useWalletSearch] Fetching page ${page + 1} (pageSize=${config.pageSize})`);

      const apiResponse = await apiClient.getSmartWallets({
        page: page + 1, // API uses 1-based indexing
        pageSize: config.pageSize,
        sortBy: 'total_profit',
        sortOrder: 'desc',
      });

      // Check if aborted
      if (signal?.aborted) {
        throw new Error('Request aborted');
      }

      const entries = transformSmartWalletsResponse(apiResponse);
      const total = typeof apiResponse.total === 'string'
        ? parseInt(apiResponse.total, 10)
        : apiResponse.total ?? 0;

      return { entries, total };
    },
    [config.pageSize]
  );

  /**
   * Initialize data - fetch first page
   * Only called when user actually starts searching
   */
  const initializeData = useCallback(async (): Promise<boolean> => {
    if (isInitialized) {
      return true;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { entries, total } = await fetchPage(0);

      setAllWallets(entries);
      setCurrentPage(0);
      setTotalWallets(total);
      setIsInitialized(true);

      setLoadingProgress({
        loadedPages: 1,
        loadedWallets: entries.length,
        totalWallets: total,
        percentage: total > 0 ? Math.floor((entries.length / total) * 100) : 100,
        foundMatches: 0,
      });

      return true;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      logger.error('[useWalletSearch] Initialization failed:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, fetchPage]);

  /**
   * Manual refetch for retry
   */
  const refetch = useCallback(async () => {
    setIsInitialized(false);
    setAllWallets([]);
    setCurrentPage(0);
    setTotalWallets(0);
    setError(null);
    return initializeData();
  }, [initializeData]);

  /**
   * Load more pages progressively during search
   */
  const loadMoreForSearch = useCallback(
    async (query: string): Promise<LeaderboardEntry[]> => {
      const totalPages = Math.ceil(totalWallets / config.pageSize);

      if (currentPage + 1 >= totalPages || totalWallets === 0) {
        // Already loaded all data
        return filterWallets(allWallets, { query });
      }

      setIsSearching(true);
      setIsLoadingMore(true);

      try {
        const nextPage = currentPage + 1;
        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();
        searchInProgressRef.current = query;

        const { entries, total } = await fetchPage(nextPage, abortControllerRef.current.signal);

        // Check if search query changed during fetch
        if (searchInProgressRef.current !== query) {
          return allWallets; // Search changed, return current data
        }

        // Update state
        const newAllWallets = [...allWallets, ...entries];
        setAllWallets(newAllWallets);
        setCurrentPage(nextPage);
        setTotalWallets(total);

        // Update progress
        const newProgress: LoadingProgress = {
          loadedPages: nextPage + 1,
          loadedWallets: newAllWallets.length,
          totalWallets: total,
          percentage: Math.floor((newAllWallets.length / total) * 100),
          foundMatches: 0,
        };

        // Filter with new data
        const matches = filterWallets(newAllWallets, { query });
        newProgress.foundMatches = matches.length;
        setLoadingProgress(newProgress);

        return newAllWallets;
      } catch (err) {
        if ((err as Error).message !== 'Request aborted') {
          logger.error('[useWalletSearch] Error loading more:', err);
        }
        return allWallets;
      } finally {
        setIsSearching(false);
        setIsLoadingMore(false);
        searchInProgressRef.current = null;
      }
    },
    [currentPage, totalWallets, allWallets, config.pageSize, fetchPage]
  );

  /**
   * Perform search with progressive loading
   */
  const performSearch = useCallback(
    async (query: string) => {
      if (query.length < config.minQueryLength) {
        return;
      }

      searchInProgressRef.current = query;

      // Lazy initialization: only fetch data when user actually searches
      if (!isInitialized) {
        const initialized = await initializeData();
        if (!initialized) {
          return; // Initialization failed
        }
      }

      // First, try filtering from already loaded data
      let matches = filterWallets(allWallets, { query });
      const sorted = sortByRelevance(matches, query);
      setLoadingProgress((prev) => ({ ...prev, foundMatches: sorted.length }));

      // If we have enough results, no need to load more
      if (sorted.length >= config.maxResults) {
        return;
      }

      // If all data is loaded, just return what we have
      const totalPages = Math.ceil(totalWallets / config.pageSize);
      if (currentPage + 1 >= totalPages || totalWallets === 0) {
        return;
      }

      // Need more data - load progressively
      let currentWallets = allWallets;
      let attempts = 0;
      const maxAttempts = 10; // Prevent infinite loops

      while (
        sorted.length < config.maxResults &&
        currentPage + attempts + 1 < totalPages &&
        attempts < maxAttempts &&
        searchInProgressRef.current === query
      ) {
        const newWallets = await loadMoreForSearch(query);

        // Check if search changed
        if (searchInProgressRef.current !== query) {
          break;
        }

        currentWallets = newWallets;
        const newMatches = filterWallets(currentWallets, { query });

        attempts++;

        // If we got enough results, stop
        if (newMatches.length >= config.maxResults) {
          break;
        }
      }
    },
    [
      allWallets,
      currentPage,
      totalWallets,
      isInitialized,
      initializeData,
      config.minQueryLength,
      config.maxResults,
      config.pageSize,
      loadMoreForSearch,
    ]
  );

  /**
   * Debounced search handler
   */
  const debouncedSearch = useCallback(
    (query: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        performSearch(query);
      }, config.debounceMs);
    },
    [config.debounceMs, performSearch]
  );

  /**
   * Set search query (triggers debounced search)
   */
  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query);
    debouncedSearch(query);
  }, [debouncedSearch]);

  /**
   * Clear search query
   */
  const clearSearch = useCallback(() => {
    setSearchQueryState('');
    setLoadingProgress((prev) => ({ ...prev, foundMatches: 0 }));
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Compute filtered results
   */
  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return allWallets.slice(0, config.maxResults);
    }

    let results = filterWallets(allWallets, { query: searchQuery });

    if (results.length > 0) {
      results = sortByRelevance(results, searchQuery);
    }

    return results.slice(0, config.maxResults);
  }, [searchQuery, allWallets, config.maxResults]);

  return {
    results: allWallets,
    filteredResults,
    isLoading,
    isSearching,
    isLoadingMore,
    loadingProgress,
    searchQuery,
    setSearchQuery,
    clearSearch,
    refetch,
    error,
  };
}
