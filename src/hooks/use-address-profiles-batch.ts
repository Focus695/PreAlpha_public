/**
 * Batch Address Profile Hook
 *
 * 分批加载地址资料，支持滚动加载
 * 优先使用 IndexedDB 缓存（24小时有效期）
 * 使用 profileApi.getAddressProfile 的双 API fallback 逻辑
 * 钱包活跃时间通过 trades API 实时获取
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';
import type { AddressProfile } from '@/types';
import { profileApi } from '@/lib/api/endpoints/profile';
import { tradesApi } from '@/lib/api/endpoints/trades';
import { generateUserPlaceholder } from '@/lib/utils';
import {
  getProfiles,
  saveProfiles,
  filterAddressesNeedingFetch,
} from '@/lib/storage/db/address-profiles-db';
import { addressProfileToDisplayProfile } from '@/lib/transformers';
import type { DisplayProfile } from '@/lib/transformers';

// ============================================================
// Types
// ============================================================

/**
 * 将 DisplayProfile 转换为 AddressProfile
 * DisplayProfile 来自 IndexedDB 缓存，需要转换为 AddressProfile 类型
 */
function displayProfileToAddressProfile(profile: DisplayProfile): AddressProfile {
  return {
    userName: profile.userName ?? generateUserPlaceholder(profile.address),
    address: profile.address,
    platform: profile.platform,
    totalPnl: profile.totalPnl,
    totalRoi: profile.roi / 100, // DisplayProfile.roi 是百分比，转换为小数
    winRate: profile.winRate !== null ? profile.winRate / 100 : null, // 转换为小数
    smartScore: profile.smartScore,
    totalVolume: profile.totalVolume,
    tradeCount: profile.tradesCount,
    tags: profile.tags as any, // string[] to SmartMoneyTag[]
    specializations: {}, // DisplayProfile 没有这个字段，使用空对象
    lastActiveAt: new Date(profile.lastActive),
    updatedAt: new Date(), // DisplayProfile 没有 updatedAt，使用当前时间
    avatarUrl: profile.avatarUrl,
    ensName: profile.ensName,
    twitterHandle: profile.twitterHandle,
    polymarketUrl: profile.polymarketLink,
    opinionUrl: profile.opinionLink,
  };
}

export interface AddressProfileWithData {
  address: string;
  profile: AddressProfile | null;
  extraFields: {
    userName?: string;
    avatarUrl?: string;
    netWorth?: number;
    follower?: number;
    following?: number;
    followed?: boolean;
  } | null;
  isLoading: boolean;
  isError: boolean;
  /** 标识数据是否来自缓存 */
  fromCache: boolean;
}

interface UseAddressProfilesBatchOptions {
  /** 所有需要加载的地址列表 */
  addresses: readonly string[];
  /** 是否启用加载 */
  enabled?: boolean;
  /** 首次加载的数量（默认 10） */
  initialPageSize?: number;
  /** 滚动加载时的数量（默认 5） */
  loadMorePageSize?: number;
  /** 每次并行请求的数量（控制并发） */
  concurrency?: number;
}

interface UseAddressProfilesBatchResult {
  /** 当前已加载的地址资料数据 */
  loadedProfiles: AddressProfileWithData[];
  /** 是否正在加载 */
  isLoading: boolean;
  /** 是否还有更多数据 */
  hasMore: boolean;
  /** 加载更多数据 */
  loadMore: () => Promise<void>;
  /** 重新加载 */
  refetch: () => Promise<void>;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * 批量获取地址的最新交易时间
 * @param addresses - 地址数组
 * @param concurrency - 并发数量
 * @returns Map<address, latestTradeTime>
 */
async function fetchBatchLatestTradeTimes(
  addresses: string[],
  concurrency: number = 5
): Promise<Map<string, Date>> {
  const tradeTimesMap = new Map<string, Date>();

  // 分批处理以控制并发
  for (let i = 0; i < addresses.length; i += concurrency) {
    const batch = addresses.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (address) => {
        try {
          const response = await tradesApi.getUserTrades(address, { limit: 1 });
          if (response.items && response.items.length > 0) {
            tradeTimesMap.set(address.toLowerCase(), new Date(response.items[0].createdAt));
          }
        } catch (error) {
          // 静默失败，不影响其他地址
          logger.debug(`[fetchBatchLatestTradeTimes] Failed to get trade time for ${address}`);
        }
      })
    );
  }

  return tradeTimesMap;
}

/**
 * 批量获取地址资料并保存缓存
 * @param addresses - 地址数组
 * @param concurrency - 并发数量
 * @returns Promise<AddressProfileWithData[]>
 */
async function fetchBatchProfiles(
  addresses: string[],
  concurrency: number = 3
): Promise<AddressProfileWithData[]> {
  const results: AddressProfileWithData[] = [];
  const profilesToCache: DisplayProfile[] = [];

  // 分批处理以控制并发
  for (let i = 0; i < addresses.length; i += concurrency) {
    const batch = addresses.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (address) => {
        try {
          const response = await profileApi.getAddressProfile(address);

          // 收集需要写入缓存的资料（批量保存）
          if (response.data) {
            profilesToCache.push(addressProfileToDisplayProfile(response.data));
          }

          return {
            address,
            profile: response.data ?? null,
            extraFields: response.meta?.extraFields ?? null,
            isLoading: false,
            isError: false,
            fromCache: false,
          };
        } catch (error) {
          logger.warn(`[useAddressProfilesBatch] Failed to load profile for ${address}:`, error);
          return {
            address,
            profile: null,
            extraFields: null,
            isLoading: false,
            isError: true,
            fromCache: false,
          };
        }
      })
    );
    results.push(...batchResults);
  }

  if (profilesToCache.length > 0) {
    await saveProfiles(profilesToCache);
  }

  return results;
}

// ============================================================
// Hook Implementation
// ============================================================

/**
 * 批量加载地址资料的 Hook
 * 优先从缓存加载，支持分批加载和滚动加载
 */
export function useAddressProfilesBatch({
  addresses,
  enabled = true,
  initialPageSize = 10,
  loadMorePageSize = 5,
  concurrency = 3,
}: UseAddressProfilesBatchOptions): UseAddressProfilesBatchResult {
  const [loadedProfiles, setLoadedProfiles] = useState<AddressProfileWithData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // 追踪已加载的地址索引
  const loadedIndexRef = useRef(0);
  // 追踪所有地址的引用（用于检测变化）
  const allAddressesRef = useRef<readonly string[]>([]);
  // 追踪是否已初始化加载过缓存
  const initializedRef = useRef(false);

  // 检测地址列表是否变化
  const addressesChanged =
    allAddressesRef.current.length !== addresses.length ||
    allAddressesRef.current.some((addr, i) => addr !== addresses[i]);

  /**
   * 初始化：优先从缓存加载所有地址
   * 缓存命中的立即显示，未命中的显示加载状态
   */
  useEffect(() => {
    if (!enabled || addresses.length === 0) {
      return;
    }

    // 重置初始化标记当地址列表变化时
    if (addressesChanged) {
      initializedRef.current = false;
    }

    // 避免重复初始化
    if (initializedRef.current) {
      return;
    }

    let isMounted = true;

    async function initialize() {
      try {
        // 1. 从 IndexedDB 批量获取缓存
        const cachedMap = await getProfiles(addresses);

        if (!isMounted) return;

        // 2. 转换为 AddressProfileWithData
        const cachedProfiles: AddressProfileWithData[] = addresses.map((addr) => {
          const cached = cachedMap.get(addr.toLowerCase());
          if (cached) {
            // 缓存命中：将 DisplayProfile 转换为 AddressProfile
            return {
              address: addr,
              profile: displayProfileToAddressProfile(cached),
              extraFields: null,
              isLoading: false,
              isError: false,
              fromCache: true,
            };
          }
          // 缓存未命中：显示加载状态
          return {
            address: addr,
            profile: null,
            extraFields: null,
            isLoading: true,
            isError: false,
            fromCache: false,
          };
        });

        setLoadedProfiles(cachedProfiles);
        initializedRef.current = true;

        // 3. 异步刷新需要更新的数据（未缓存或过期的）
        const needsFetchAddresses = await filterAddressesNeedingFetch(
          addresses.slice(0, initialPageSize)
        );

        if (needsFetchAddresses.length > 0 && isMounted) {
          setIsLoading(true);
          const freshResults = await fetchBatchProfiles(needsFetchAddresses, concurrency);

          if (isMounted) {
            // 更新对应地址的数据
            setLoadedProfiles((prev) => {
              const newProfiles = [...prev];
              const freshMap = new Map(
                freshResults.map((r) => [r.address.toLowerCase(), r])
              );

              for (let i = 0; i < newProfiles.length; i++) {
                const fresh = freshMap.get(newProfiles[i].address.toLowerCase());
                if (fresh) {
                  newProfiles[i] = fresh;
                }
              }

              return newProfiles;
            });

            // 更新已加载索引
            loadedIndexRef.current = initialPageSize;
            setHasMore(initialPageSize < addresses.length);
          }
        } else {
          // 全部来自缓存，不需要加载更多
          loadedIndexRef.current = Math.min(initialPageSize, addresses.length);
          setHasMore(initialPageSize < addresses.length);
        }

        // 4. 获取钱包活跃时间（基于实际交易时间）
        // 对当前页面显示的地址，获取最新交易时间
        const visibleAddresses = addresses.slice(0, initialPageSize);
        const tradeTimesMap = await fetchBatchLatestTradeTimes(visibleAddresses, concurrency);

        if (isMounted && tradeTimesMap.size > 0) {
          // 更新所有 profile 的 lastActiveAt 为实际交易时间
          setLoadedProfiles((prev) => {
            return prev.map((item) => {
              const latestTradeTime = tradeTimesMap.get(item.address.toLowerCase());
              if (latestTradeTime && item.profile) {
                return {
                  ...item,
                  profile: {
                    ...item.profile,
                    lastActiveAt: latestTradeTime,
                  },
                };
              }
              return item;
            });
          });
        }
      } catch (error) {
        logger.error('[useAddressProfilesBatch] Failed to initialize:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initialize();

    return () => {
      isMounted = false;
    };
  }, [addresses, enabled, addressesChanged, initialPageSize, concurrency]);

  /**
   * 智能地址合并
   * 地址列表变化时保留有效数据，而不是全部清空
   */
  useEffect(() => {
    if (!addressesChanged) {
      return;
    }

    const newAddresses = new Set(addresses.map((a) => a.toLowerCase()));

    // 保留在新列表中的旧数据
    const preservedProfiles = loadedProfiles.filter((p) =>
      newAddresses.has(p.address.toLowerCase())
    );

    setLoadedProfiles(preservedProfiles);
    allAddressesRef.current = addresses;
    loadedIndexRef.current = 0;
    setHasMore(addresses.length > 0);
  }, [addressesChanged, loadedProfiles]);

  /**
   * 加载更多数据
   */
  const loadMore = useCallback(async () => {
    if (!enabled || isLoading || !hasMore) {
      return;
    }

    const remainingAddresses = addresses.slice(loadedIndexRef.current);
    if (remainingAddresses.length === 0) {
      setHasMore(false);
      return;
    }

    setIsLoading(true);

    // 确定本次加载的地址数量
    const batchAddresses = remainingAddresses.slice(0, loadMorePageSize);

    try {
      // 检查哪些地址需要从 API 获取（过滤掉有效缓存）
      const needsFetchAddresses = await filterAddressesNeedingFetch(batchAddresses);

      if (needsFetchAddresses.length > 0) {
        // 只获取需要刷新的地址
        const results = await fetchBatchProfiles(needsFetchAddresses, concurrency);

        // 更新已加载数据
        setLoadedProfiles((prev) => {
          const newProfiles = [...prev];

          for (const result of results) {
            const existingIndex = newProfiles.findIndex(
              (p) => p.address.toLowerCase() === result.address.toLowerCase()
            );
            if (existingIndex >= 0) {
              newProfiles[existingIndex] = result;
            } else {
              newProfiles.push(result);
            }
          }

          return newProfiles;
        });
      } else {
        // 全部来自缓存，只需标记为已加载
        logger.debug('[useAddressProfilesBatch] All data from cache, skipping API');
      }

      // 获取本次加载地址的钱包活跃时间（基于实际交易时间）
      const tradeTimesMap = await fetchBatchLatestTradeTimes(batchAddresses, concurrency);

      if (tradeTimesMap.size > 0) {
        // 更新对应地址的 lastActiveAt
        setLoadedProfiles((prev) => {
          return prev.map((item) => {
            const latestTradeTime = tradeTimesMap.get(item.address.toLowerCase());
            if (latestTradeTime && item.profile) {
              return {
                ...item,
                profile: {
                  ...item.profile,
                  lastActiveAt: latestTradeTime,
                },
              };
            }
            return item;
          });
        });
      }

      // 更新已加载索引
      loadedIndexRef.current += batchAddresses.length;

      // 检查是否还有更多
      setHasMore(loadedIndexRef.current < addresses.length);
    } catch (error) {
      logger.error('[useAddressProfilesBatch] Failed to load more profiles:', error);
    } finally {
      setIsLoading(false);
    }
  }, [
    enabled,
    addresses,
    isLoading,
    hasMore,
    loadMorePageSize,
    concurrency,
  ]);

  /**
   * 重新加载
   */
  const refetch = useCallback(async () => {
    initializedRef.current = false;
    setLoadedProfiles([]);
    loadedIndexRef.current = 0;
    setHasMore(true);

    // 重置后会触发 useEffect 重新初始化
  }, []);

  return {
    loadedProfiles,
    isLoading,
    hasMore,
    loadMore,
    refetch,
  };
}

/**
 * 简化版 Hook - 用于同时加载所有地址
 * 不支持分批加载，适用于地址数量较少的场景
 */
export function useAddressProfilesAll({
  addresses,
  enabled = true,
  concurrency = 5,
}: Omit<UseAddressProfilesBatchOptions, 'initialPageSize' | 'loadMorePageSize'>): {
  profiles: Map<string, AddressProfileWithData>;
  isLoading: boolean;
} {
  const [profiles, setProfiles] = useState<Map<string, AddressProfileWithData>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const initializedRef = useRef(false);

  // 加载所有地址
  useEffect(() => {
    if (!enabled || addresses.length === 0 || isLoading || initializedRef.current) {
      return;
    }

    let isMounted = true;

    async function loadAll() {
      setIsLoading(true);

      try {
        // 先尝试从缓存加载
        const cachedMap = await getProfiles(addresses);

        if (!isMounted) return;

        const profilesMap = new Map<string, AddressProfileWithData>();

        // 构建初始数据（缓存命中的标记为 fromCache: true）
        for (const address of addresses) {
          const cached = cachedMap.get(address.toLowerCase());
          if (cached) {
            profilesMap.set(address.toLowerCase(), {
              address,
              profile: displayProfileToAddressProfile(cached),
              extraFields: null,
              isLoading: false,
              isError: false,
              fromCache: true,
            });
          } else {
            profilesMap.set(address.toLowerCase(), {
              address,
              profile: null,
              extraFields: null,
              isLoading: true,
              isError: false,
              fromCache: false,
            });
          }
        }

        setProfiles(profilesMap);
        initializedRef.current = true;

        // 获取需要刷新的地址
        const needsFetchAddresses = await filterAddressesNeedingFetch(addresses);

        if (needsFetchAddresses.length > 0 && isMounted) {
          const results = await fetchBatchProfiles(needsFetchAddresses, concurrency);

          if (isMounted) {
            // 更新获取到的数据
            for (const result of results) {
              profilesMap.set(result.address.toLowerCase(), result);
            }
            setProfiles(new Map(profilesMap));
          }
        }
      } catch (error) {
        logger.error('[useAddressProfilesAll] Failed to load profiles:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadAll();

    return () => {
      isMounted = false;
    };
  }, [enabled, addresses, concurrency, isLoading]);

  return {
    profiles,
    isLoading,
  };
}
