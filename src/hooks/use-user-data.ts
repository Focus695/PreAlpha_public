/**
 * Unified User Data Hook
 *
 * Single source of truth for all user private data:
 * - Following list (wallet addresses user is following) - now in follows table
 * - Per-address annotations (notes and custom tags) - in user_data table
 *
 * Features:
 * - JWT authentication required
 * - Backend sync with optimistic updates
 * - Automatic migration from legacy localStorage
 * - Offline-capable (IndexedDB storage)
 *
 * This hook replaces:
 * - useFollowedAddresses
 * - useUserAnnotations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import { logger } from '@/lib/logger';
import { zh } from '@/lib/translations';
import type { EthAddress } from '@/types';
import type { UserData, FollowedAddress, AddressAnnotation } from '@/types/user';
import { EMPTY_USER_DATA } from '@/types/user';
import {
  hasLegacyData,
  cleanupLegacyData,
  backupLegacyData,
  normalizeAddress,
} from '@/lib/user-data-migration';
import {
  getUserData,
  setAddressLabel,
  deleteAddressLabel,
} from '@/lib/api/endpoints/user-data';
import { getAuthToken } from '@/lib/auth/authentication-adapter';
import { useToast } from '@/hooks/use-toast';
import {
  executeFollow,
  executeUnfollow,
} from '@/lib/follow-manager';
import {
  loadUserData as loadAnnotationsFromDB,
  saveUserData as saveAnnotationsToDB,
} from '@/lib/storage/db/user-annotations-db';
import {
  getFollowedProfiles,
  addFollow as addFollowToDB,
  removeFollow as removeFollowFromDB,
  bulkAddFollows,
  type FollowedProfile,
} from '@/lib/storage/db/user-follows-db';

// ============================================================
// Types
// ============================================================

/**
 * Complete user data with following from follows table
 */
interface UserDataWithFollowing extends UserData {
  following: FollowedAddress[];
}

// ============================================================
// Local Storage (Legacy Migration)
// ============================================================

/**
 * Get localStorage key for this wallet (for legacy migration)
 */
function getLocalStorageKey(address: EthAddress): string {
  return `user_data_${normalizeAddress(address)}`;
}

/**
 * Convert FollowedProfile to FollowedAddress format
 * Note: follows table stores addresses without 0x prefix, need to add it back
 */
function followedProfileToAddress(profile: FollowedProfile): FollowedAddress {
  // Ensure address has 0x prefix for EthAddress type
  const addressWithPrefix = profile.address.startsWith('0x')
    ? profile.address
    : `0x${profile.address}`;

  return {
    address: addressWithPrefix as EthAddress,
    userName: profile.userName,
    avatarUrl: profile.avatarUrl,
    createdAt: new Date(profile.followedAt).toISOString(),
    updatedAt: new Date(profile.followedAt).toISOString(),
  };
}

/**
 * Load UserData from storage (IndexedDB - combines follows table and user_data table)
 */
async function loadUserData(address: EthAddress): Promise<UserDataWithFollowing | null> {
  try {
    // Load annotations from user_data table
    const annotationsData = await loadAnnotationsFromDB(address);

    // Load following from follows table
    const followedProfiles = await getFollowedProfiles(address);

    // Combine into legacy UserData format
    const following: FollowedAddress[] = followedProfiles.map(followedProfileToAddress);

    const result: UserDataWithFollowing = {
      version: annotationsData?.version ?? 2,
      following,
      annotations: annotationsData?.annotations ?? {},
      lastSyncedAt: annotationsData?.lastSyncedAt,
    };

    logger.debug('[useUserData] Loaded data from IndexedDB:', {
      followingCount: following.length,
      annotationsCount: Object.keys(result.annotations).length,
    });

    return result;
  } catch (error) {
    logger.warn('[useUserData] Failed to load from IndexedDB:', error);
  }

  // Fallback to localStorage for migration
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const key = getLocalStorageKey(address);
    const stored = localStorage.getItem(key);

    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as UserData;

    // Validate structure
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      parsed.version === 1 &&
      Array.isArray(parsed.following) &&
      typeof parsed.annotations === 'object'
    ) {
      // Filter out empty annotations
      const cleanedAnnotations: Record<string, typeof parsed.annotations[string]> = {};

      for (const [addr, annotation] of Object.entries(parsed.annotations)) {
        const hasNote = annotation.note && annotation.note.trim() !== '';
        const hasTags = annotation.customTags && annotation.customTags.length > 0;

        if (hasNote || hasTags) {
          cleanedAnnotations[addr] = annotation;
        }
      }

      const cleanedData: UserData = {
        ...parsed,
        annotations: cleanedAnnotations,
      };

      // Save to IndexedDB for future use
      await saveAnnotationsToDB(address, cleanedData);

      // Migrate following to follows table
      if (cleanedData.following && cleanedData.following.length > 0) {
        const addresses = cleanedData.following.map(f => f.address);
        await bulkAddFollows(address, addresses);
      }

      return cleanedData as UserDataWithFollowing;
    }

    return null;
  } catch (error) {
    logger.warn('[useUserData] Failed to load from storage:', error);
    return null;
  }
}

/**
 * Save UserData to storage (IndexedDB - splits to follows and user_data tables)
 */
async function saveUserData(address: EthAddress, data: UserData): Promise<void> {
  // Save annotations to user_data table
  await saveAnnotationsToDB(address, data);

  // Note: following is managed separately via addFollow/removeFollow in follows table
  // This function is called by mutations and during initial load
}

// ============================================================
// Main Hook
// ============================================================

/**
 * Unified User Data Hook
 *
 * Provides complete API for managing user's private data with backend sync.
 */
export function useUserData() {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const { toastError, toastWarning } = useToast();

  // Track auth token state reactively
  const [hasAuthToken, setHasAuthToken] = useState(() =>
    typeof window !== 'undefined' && !!getAuthToken()
  );

  // Listen for auth state changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token' || e.key === 'auth_address') {
        const newHasToken = typeof window !== 'undefined' && !!getAuthToken();
        setHasAuthToken(newHasToken);
        logger.debug('[useUserData] Auth token changed (storage event):', newHasToken);
      }
    };

    const handleAuthStateChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ authenticated: boolean }>;
      const newHasToken = customEvent.detail.authenticated;
      setHasAuthToken(newHasToken);
      logger.debug('[useUserData] Auth token changed (custom event):', newHasToken);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-state-changed', handleAuthStateChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-state-changed', handleAuthStateChange);
    };
  }, []);

  /**
   * Check if user is authenticated
   */
  const checkAuth = useCallback((): boolean => {
    if (!isConnected || !address) {
      toastWarning(zh.auth.needWalletConnection, zh.auth.authenticationRequired);
      return false;
    }

    if (!hasAuthToken) {
      toastWarning(
        zh.auth.signInToProceed,
        zh.auth.needAuthentication
      );
      return false;
    }

    return true;
  }, [isConnected, address, hasAuthToken, toastWarning]);

  /**
   * Merge backend data with IndexedDB follows
   *
   * IMPORTANT: IndexedDB is the source of truth for following list.
   * The backend API doesn't return per-address follow timestamps and may have
   * stale data, so we use IndexedDB follows directly.
   *
   * We only use backend data for annotations (notes and custom tags).
   */
  async function mergeWithIndexedDBFollows(
    userAddress: string,
    backendData: UserData
  ): Promise<UserDataWithFollowing> {
    // Get follows from IndexedDB (source of truth)
    const indexedDBFollows = await getFollowedProfiles(userAddress);

    // Build following list from IndexedDB (not backend!)
    const mergedFollowing: FollowedAddress[] = indexedDBFollows.map((follow) => {
      // Ensure address has 0x prefix
      const addressWithPrefix = follow.address.startsWith('0x')
        ? follow.address
        : `0x${follow.address}`;

      const followedAtIso = new Date(follow.followedAt).toISOString();

      return {
        address: addressWithPrefix as EthAddress,
        userName: follow.userName,
        avatarUrl: follow.avatarUrl,
        createdAt: followedAtIso,
        updatedAt: followedAtIso,
      };
    });

    // Sort by updatedAt descending (newest first)
    mergedFollowing.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    // Use backend annotations (they have correct timestamps and are synced)
    return {
      version: 2,
      following: mergedFollowing,
      annotations: backendData.annotations,
      lastSyncedAt: new Date().toISOString(),
    };
  }

  /**
   * Fetch user data from backend
   */
  const query = useQuery({
    queryKey: ['userData', address],
    enabled: isConnected && !!address && hasAuthToken,

    queryFn: async () => {
      try {
        logger.debug('[useUserData] Fetching user data...');

        // Try IndexedDB first for instant load
        if (address) {
          const cached = await loadUserData(address);
          if (cached) {
            logger.debug('[useUserData] Loaded from IndexedDB cache');
            // Don't set cache here - let it flow naturally through the return value
          }
        }

        // Fetch from backend
        const remoteData = await getUserData();

        logger.debug('[useUserData] Fetched data from backend:', {
          followingCount: remoteData.following.length,
          annotationsCount: Object.keys(remoteData.annotations).length,
        });

        // Merge with IndexedDB data to preserve followedAt timestamps
        // (address is guaranteed to be defined here since query is only enabled when address exists)
        const mergedData = await mergeWithIndexedDBFollows(address!, remoteData);

        // Sync to IndexedDB (annotations only, following is managed separately)
        if (address) {
          await saveUserData(address, mergedData);
        }

        // Clean up legacy data
        if (hasLegacyData()) {
          logger.debug('[useUserData] Backend sync successful, cleaning up legacy data');
          backupLegacyData();
          cleanupLegacyData();
        }

        return mergedData;
      } catch (error) {
        logger.error('[useUserData] Error fetching from backend:', error);

        // If fetch fails, try to return cached data
        if (address) {
          const cached = await loadUserData(address);
          if (cached) {
            logger.warn('[useUserData] Using cached data due to network error');
            return cached;
          }
        }

        // If auth error, return empty data
        if (error instanceof Error && error.message.includes('Authentication')) {
          return { ...EMPTY_USER_DATA, following: [] } as UserDataWithFollowing;
        }

        throw error;
      }
    },

    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // ============================================================
  // Mutations
  // ============================================================

  const preOptimisticFollowingList = useRef<EthAddress[]>([]);

  /**
   * Extract addresses from UserData
   */
  const extractFollowingAddresses = useCallback((data: UserData | null): EthAddress[] => {
    if (!data?.following) return [];
    return data.following.map(f => normalizeAddress(f.address) as EthAddress);
  }, []);

  /**
   * Follow mutation
   */
  const followMutation = useMutation({
    mutationFn: async (params: { address: EthAddress; userName?: string; avatarUrl?: string }) => {
      const currentList = preOptimisticFollowingList.current;

      try {
        await executeFollow(currentList, params.address);
      } catch (error) {
        logger.error('[useUserData] Follow API call failed:', error);
        throw error;
      }
    },

    onMutate: async (params) => {
      if (!address) {
        throw new Error('No address found');
      }

      await queryClient.cancelQueries({ queryKey: ['userData', address] });
      const previousData = queryClient.getQueryData<UserDataWithFollowing>(['userData', address]);
      const currentFollowingList = previousData ? extractFollowingAddresses(previousData) : [];

      preOptimisticFollowingList.current = currentFollowingList;

      // Optimistic update
      if (previousData && address) {
        const now = new Date().toISOString();

        const newFollowing: FollowedAddress[] = [
          ...previousData.following,
          {
            address: params.address,
            userName: params.userName,
            avatarUrl: params.avatarUrl,
            createdAt: now,
            updatedAt: now,
          },
        ];

        const newData: UserDataWithFollowing = {
          ...previousData,
          following: newFollowing,
          lastSyncedAt: now,
        };

        queryClient.setQueryData(['userData', address], newData);

        // Also update follows table
        await addFollowToDB(address, params.address);
      }

      return { previousData };
    },

    onError: async (_err, _params, context) => {
      if (address && context?.previousData) {
        queryClient.setQueryData(['userData', address], context.previousData);
        // Rollback follows table
        const currentList = context.previousData ? extractFollowingAddresses(context.previousData) : [];
        await bulkAddFollows(address, currentList);
      }
      toastError('关注失败，更改已回滚', '操作失败');
    },

    onSuccess: async () => {
      logger.debug('[useUserData] Follow completed');
      // Refresh query data from IndexedDB to ensure cache reflects latest state
      if (address) {
        const latestFromDB = await loadUserData(address);
        if (latestFromDB) {
          queryClient.setQueryData(['userData', address], latestFromDB);
        }
      }
    },
    // Note: No onSettled - optimistic updates + IndexedDB are enough
    // Backend sync happens automatically on next query refresh
  });

  /**
   * Unfollow mutation
   */
  const unfollowMutation = useMutation({
    mutationFn: async (targetAddress: EthAddress) => {
      const currentList = preOptimisticFollowingList.current;

      try {
        await executeUnfollow(currentList, targetAddress);
      } catch (error) {
        logger.error('[useUserData] Unfollow API call failed:', error);
        throw error;
      }
    },

    onMutate: async (targetAddress) => {
      if (!address) return;

      await queryClient.cancelQueries({ queryKey: ['userData', address] });
      const previousData = queryClient.getQueryData<UserDataWithFollowing>(['userData', address]);
      const currentFollowingList = previousData ? extractFollowingAddresses(previousData) : [];

      preOptimisticFollowingList.current = currentFollowingList;

      if (previousData) {
        const normalized = normalizeAddress(targetAddress);
        const newFollowing = previousData.following.filter(
          (f) => normalizeAddress(f.address) !== normalized
        );

        const newData: UserDataWithFollowing = {
          ...previousData,
          following: newFollowing,
          lastSyncedAt: new Date().toISOString(),
        };

        queryClient.setQueryData(['userData', address], newData);

        // Also update follows table
        await removeFollowFromDB(address, targetAddress);
      }

      return { previousData };
    },

    onError: async (_err, _targetAddress, context) => {
      if (address && context?.previousData) {
        queryClient.setQueryData(['userData', address], context.previousData);
        // Rollback follows table
        const currentList = context.previousData ? extractFollowingAddresses(context.previousData) : [];
        await bulkAddFollows(address, currentList);
      }
      toastError('取消关注失败，更改已回滚', '操作失败');
    },

    onSuccess: async () => {
      logger.debug('[useUserData] Unfollow completed');
      // Refresh query data from IndexedDB to ensure cache reflects latest state
      if (address) {
        const latestFromDB = await loadUserData(address);
        if (latestFromDB) {
          queryClient.setQueryData(['userData', address], latestFromDB);
        }
      }
    },
    // Note: No onSettled - optimistic updates + IndexedDB are enough
    // Backend sync happens automatically on next query refresh
  });

  /**
   * Set label mutation
   */
  const setLabelMutation = useMutation({
    mutationFn: async (params: {
      targetAddress: EthAddress;
      note?: string;
      customTags?: string[];
    }) => {
      await setAddressLabel(params.targetAddress, params.note, params.customTags);
    },

    onMutate: async (params) => {
      if (!address) return;

      await queryClient.cancelQueries({ queryKey: ['userData', address] });
      const previousData = queryClient.getQueryData<UserDataWithFollowing>(['userData', address]);

      if (previousData) {
        const normalized = normalizeAddress(params.targetAddress);
        const now = new Date().toISOString();

        const newAnnotations = {
          ...previousData.annotations,
          [normalized]: {
            note: params.note,
            customTags: params.customTags ?? [],
            updatedAt: now,
          },
        };

        const newData: UserDataWithFollowing = {
          ...previousData,
          annotations: newAnnotations,
          lastSyncedAt: now,
        };

        queryClient.setQueryData(['userData', address], newData);
        await saveAnnotationsToDB(address, newData);
      }

      return { previousData };
    },

    onError: async (_err, _params, context) => {
      if (address && context?.previousData) {
        queryClient.setQueryData(['userData', address], context.previousData);
        await saveAnnotationsToDB(address, context.previousData);
      }
      toastError('保存失败，更改已回滚', '操作失败');
    },

    onSettled: () => {
      if (address) {
        queryClient.invalidateQueries({ queryKey: ['userData', address] });
      }
    },
  });

  /**
   * Clear label mutation
   */
  const clearLabelMutation = useMutation({
    mutationFn: async (targetAddress: EthAddress) => {
      await deleteAddressLabel(targetAddress);
    },

    onMutate: async (targetAddress) => {
      if (!address) return;

      await queryClient.cancelQueries({ queryKey: ['userData', address] });
      const previousData = queryClient.getQueryData<UserDataWithFollowing>(['userData', address]);

      if (previousData) {
        const normalized = normalizeAddress(targetAddress);
        const newAnnotations = { ...previousData.annotations };
        delete newAnnotations[normalized];

        const newData: UserDataWithFollowing = {
          ...previousData,
          annotations: newAnnotations,
          lastSyncedAt: new Date().toISOString(),
        };

        queryClient.setQueryData(['userData', address], newData);
        await saveAnnotationsToDB(address, newData);
      }

      return { previousData };
    },

    onError: async (_err, _targetAddress, context) => {
      if (address && context?.previousData) {
        queryClient.setQueryData(['userData', address], context.previousData);
        await saveAnnotationsToDB(address, context.previousData);
      }
      toastError('清除失败，更改已回滚', '操作失败');
    },

    onSuccess: () => {
      if (address) {
        queryClient.refetchQueries({ queryKey: ['userData', address] });
      }
    },
  });

  // ============================================================
  // Derived data and helpers
  // ============================================================

  const data = (query.data || { ...EMPTY_USER_DATA, following: [] }) as UserDataWithFollowing;

  /**
   * Following list (sorted by updatedAt desc)
   * Note: Uses spread + sort() to avoid mutating the original array
   */
  const followedList = useMemo<FollowedAddress[]>(() => {
    const following = data.following ?? [];
    if (following.length === 0) return [];
    return [...following].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [data.following]);

  /**
   * Annotations list (sorted by updatedAt desc)
   * Note: Uses spread + sort() to avoid mutating the original array
   */
  const annotationsList = useMemo<Array<AddressAnnotation & { address: EthAddress }>>(() => {
    const annotations = data.annotations ?? {};
    const entries = Object.entries(annotations).map(([addr, annotation]) => ({
      address: addr as EthAddress,
      ...annotation,
    }));
    if (entries.length === 0) return [];
    return [...entries].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [data.annotations]);

  /**
   * Memoized set of followed addresses for O(1) lookup
   */
  const followedAddressSet = useMemo<Set<string>>(() => {
    const set = new Set<string>();
    if (data.following) {
      for (const f of data.following) {
        set.add(normalizeAddress(f.address));
      }
    }
    return set;
  }, [data.following]);

  /**
   * Check if an address is followed
   * Uses memoized Set for O(1) lookup instead of O(n) array.some()
   */
  const isFollowed = useCallback(
    (addr?: string | null): boolean => {
      if (!addr) return false;
      const normalized = normalizeAddress(addr);
      return followedAddressSet.has(normalized);
    },
    [followedAddressSet]
  );

  /**
   * Get annotation for a specific address
   */
  const getAnnotation = useCallback(
    (addr: EthAddress): AddressAnnotation | null => {
      if (!data.annotations) return null;
      const normalized = normalizeAddress(addr);
      return data.annotations[normalized] ?? null;
    },
    [data]
  );

  // ============================================================
  // Following operations
  // ============================================================

  const follow = useCallback(
    (addr: EthAddress, userName?: string, avatarUrl?: string) => {
      if (!checkAuth()) return;
      followMutation.mutate({ address: addr, userName, avatarUrl });
    },
    [followMutation, checkAuth]
  );

  const unfollow = useCallback(
    (addr: EthAddress) => {
      if (!checkAuth()) return;
      unfollowMutation.mutate(addr);
    },
    [unfollowMutation, checkAuth]
  );

  const toggleFollow = useCallback(
    (addr: EthAddress, userName?: string, avatarUrl?: string) => {
      if (!checkAuth()) return;

      if (isFollowed(addr)) {
        unfollow(addr);
      } else {
        follow(addr, userName, avatarUrl);
      }
    },
    [isFollowed, follow, unfollow, checkAuth]
  );

  // ============================================================
  // Annotation operations
  // ============================================================

  const setNote = useCallback(
    (addr: EthAddress, note: string | undefined) => {
      if (!checkAuth()) return;

      const currentData = data || EMPTY_USER_DATA;
      const normalized = normalizeAddress(addr);
      const existing = currentData.annotations[normalized];
      const trimmedNote = note?.trim() || undefined;

      if (!trimmedNote && (!existing || existing.customTags.length === 0)) {
        if (existing) {
          clearLabelMutation.mutate(addr);
        }
        return;
      }

      setLabelMutation.mutate({
        targetAddress: addr,
        note: trimmedNote,
        customTags: existing?.customTags ?? [],
      });
    },
    [data, setLabelMutation, clearLabelMutation, checkAuth]
  );

  const addCustomTag = useCallback(
    (addr: EthAddress, tag: string) => {
      if (!checkAuth()) return;

      const currentData = data || EMPTY_USER_DATA;
      const normalized = normalizeAddress(addr);
      const normalizedTag = tag.trim().toLowerCase();

      if (!normalizedTag) return;

      const existing = currentData.annotations[normalized];
      const existingTags = existing?.customTags ?? [];

      if (existingTags.includes(normalizedTag)) return;

      setLabelMutation.mutate({
        targetAddress: addr,
        note: existing?.note,
        customTags: [...existingTags, normalizedTag],
      });
    },
    [data, setLabelMutation, checkAuth]
  );

  const removeCustomTag = useCallback(
    (addr: EthAddress, tag: string) => {
      if (!checkAuth()) return;

      const currentData = data || EMPTY_USER_DATA;
      const normalized = normalizeAddress(addr);
      const existing = currentData.annotations[normalized];

      if (!existing) return;

      const newTags = existing.customTags.filter((t) => t !== tag);

      if (newTags.length === 0 && !existing.note) {
        clearLabelMutation.mutate(addr);
        return;
      }

      setLabelMutation.mutate({
        targetAddress: addr,
        note: existing.note,
        customTags: newTags,
      });
    },
    [data, setLabelMutation, clearLabelMutation, checkAuth]
  );

  const clearAnnotation = useCallback(
    (addr: EthAddress) => {
      if (!checkAuth()) return;
      clearLabelMutation.mutate(addr);
    },
    [clearLabelMutation, checkAuth]
  );

  // ============================================================
  // Utility methods
  // ============================================================

  const refresh = useCallback(() => {
    if (address) {
      queryClient.invalidateQueries({ queryKey: ['userData', address] });
    }
  }, [address, queryClient]);

  const clearAll = useCallback(async () => {
    if (address) {
      queryClient.setQueryData(['userData', address], { ...EMPTY_USER_DATA, following: [] });
      await saveAnnotationsToDB(address, EMPTY_USER_DATA);
    }
  }, [address, queryClient]);

  // ============================================================
  // Return API
  // ============================================================

  return {
    // Core data and loading state
    data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,

    // Update state
    isUpdating:
      followMutation.isPending ||
      unfollowMutation.isPending ||
      setLabelMutation.isPending ||
      clearLabelMutation.isPending,
    updateError:
      followMutation.error ||
      unfollowMutation.error ||
      setLabelMutation.error ||
      clearLabelMutation.error,

    // Following operations
    followedList,
    totalFollowed: followedList.length,
    isFollowed,
    follow,
    unfollow,
    toggleFollow,

    // Annotation operations
    annotationsList,
    getAnnotation,
    setNote,
    addCustomTag,
    removeCustomTag,
    clearAnnotation,

    // Utility methods
    refresh,
    clearAll,
  };
}
