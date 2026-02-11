/**
 * Personal Data Management Modal
 *
 * 个人数据管理模态框，复用 SmartMoneyTable 样式
 * 合并显示关注列表和标注列表
 * 支持滚动加载和双 API fallback
 * 支持筛选只显示已关注
 */

import { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from '@/components/ui/icons';
import SmartMoneyTable, { type SortColumn } from '@/components/leaderboard/smart-money-table';
import { InfiniteScroll } from '@/components/ui/infinite-scroll';
import { zh } from '@/lib/translations';
import { generateUserPlaceholder } from '@/lib/utils';
import { useUserData } from '@/hooks/use-user-data';
import { useAddressProfilesBatch } from '@/hooks/use-address-profiles-batch';
import { addressProfileToDisplayProfile, type DisplayProfile } from '@/lib/transformers';

interface PersonalDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PersonalDataModal({ isOpen, onClose }: PersonalDataModalProps) {
  const navigate = useNavigate();

  // 筛选开关状态：只显示已关注
  const [showFollowedOnly, setShowFollowedOnly] = useState(false);

  // 排序状态
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const {
    followedList,
    annotationsList,
    isFollowed,
  } = useUserData();

  // 地址元数据类型
  interface AddressMeta {
    address: string;
    isFollowed: boolean;
    isAnnotated: boolean;
    followedAt?: string;
    annotatedAt?: string;
    lastUpdated: string;
  }

  // 合并关注列表和标注列表，创建稳定的元数据映射
  const addressesWithMeta = useMemo(() => {
    const metaMap = new Map<string, AddressMeta>();

    // 添加已关注的地址
    for (const f of followedList) {
      metaMap.set(f.address.toLowerCase(), {
        address: f.address,
        isFollowed: true,
        isAnnotated: false,
        followedAt: f.updatedAt,
        lastUpdated: f.updatedAt,
      });
    }

    // 合并标注列表
    for (const a of annotationsList) {
      const key = a.address.toLowerCase();
      const existing = metaMap.get(key);
      const lastUpdated = existing
        ? (existing.followedAt && existing.followedAt > a.updatedAt
          ? existing.followedAt
          : a.updatedAt)
        : a.updatedAt;

      if (existing) {
        existing.isAnnotated = true;
        existing.annotatedAt = a.updatedAt;
        existing.lastUpdated = lastUpdated;
      } else {
        metaMap.set(key, {
          address: a.address,
          isFollowed: false,
          isAnnotated: true,
          annotatedAt: a.updatedAt,
          lastUpdated,
        });
      }
    }

    return Array.from(metaMap.values());
  }, [followedList, annotationsList]);

  // 按最近更新时间排序，应用筛选
  const allAddresses = useMemo(() => {
    // 按最近更新时间降序排序
    let sorted = [...addressesWithMeta].sort(
      (a, b) => b.lastUpdated.localeCompare(a.lastUpdated)
    );

    // 如果开启筛选，只返回已关注的地址
    if (showFollowedOnly) {
      sorted = sorted.filter(item => isFollowed(item.address));
    }

    return sorted.map(item => item.address);
  }, [addressesWithMeta, showFollowedOnly, isFollowed]);

  // 使用批量地址资料 hook，支持分批加载
  // 默认加载10条，滚动加载5条
  const {
    loadedProfiles,
    isLoading,
    hasMore,
    loadMore,
  } = useAddressProfilesBatch({
    addresses: allAddresses,
    enabled: isOpen,
    initialPageSize: 10,
    loadMorePageSize: 5,
  });

  // 转换为 DisplayProfile 格式供 SmartMoneyTable 使用
  const displayProfiles = useMemo(() => {
    const profiles = loadedProfiles.map((p): DisplayProfile => {
      // 查找对应的元数据，获取用户操作时间
      const meta = addressesWithMeta.find(
        m => m.address.toLowerCase() === p.address.toLowerCase()
      );

      const baseProfile = p.profile
        ? addressProfileToDisplayProfile(p.profile)
        : {
            rank: 0,
            address: p.address as `0x${string}`,
            ensName: undefined,
            twitterHandle: undefined,
            userName: generateUserPlaceholder(p.address),
            avatarUrl: undefined,
            isWhale: false,
            totalPnl: 0,
            roi: 0,
            winRate: null,
            smartScore: null,
            tradesCount: 0,
            totalVolume: 0,
            tags: [],
            lastActive: new Date().toISOString(),
            platform: 'opinion' as const,
            polymarketLink: '',
            opinionLink: undefined,
          };

      // 添加用户操作时间，保留 lastActive 作为钱包活跃时间
      return {
        ...baseProfile,
        userActionAt: meta?.lastUpdated,  // 用户操作时间（关注/标注）
        // lastActive 保持为钱包活跃时间（来自 API 或缓存）
      };
    });

    // 应用排序
    if (!sortColumn) {
      // 默认按用户操作时间降序排序
      return profiles.sort((a, b) => {
        const aTime = a.userActionAt || '';
        const bTime = b.userActionAt || '';
        if (!aTime) return 1;
        if (!bTime) return -1;
        return bTime.localeCompare(aTime);
      });
    }

    // 根据选定的列进行排序
    return profiles.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      let aHasValue: boolean;
      let bHasValue: boolean;

      switch (sortColumn) {
        case 'userName': {
          // 用户名排序：优先使用 userName，其次 ensName，再次 twitterHandle，最后地址
          aValue = a.userName || a.ensName || a.twitterHandle || a.address || '';
          bValue = b.userName || b.ensName || b.twitterHandle || b.address || '';
          aHasValue = Boolean(aValue);
          bHasValue = Boolean(bValue);
          break;
        }
        case 'myAction': {
          aValue = a.userActionAt || '';
          bValue = b.userActionAt || '';
          aHasValue = Boolean(a.userActionAt);
          bHasValue = Boolean(b.userActionAt);
          break;
        }
        case 'walletActive': {
          aValue = a.lastActive || '';
          bValue = b.lastActive || '';
          aHasValue = Boolean(a.lastActive);
          bHasValue = Boolean(b.lastActive);
          break;
        }
        case 'totalPnl': {
          aValue = a.totalPnl ?? 0;
          bValue = b.totalPnl ?? 0;
          aHasValue = a.totalPnl != null;
          bHasValue = b.totalPnl != null;
          break;
        }
        case 'roi': {
          aValue = a.roi ?? 0;
          bValue = b.roi ?? 0;
          aHasValue = a.roi != null;
          bHasValue = b.roi != null;
          break;
        }
        case 'smartScore': {
          aValue = a.smartScore ?? 0;
          bValue = b.smartScore ?? 0;
          aHasValue = a.smartScore != null;
          bHasValue = b.smartScore != null;
          break;
        }
        case 'platform': {
          aValue = a.platform || '';
          bValue = b.platform || '';
          aHasValue = Boolean(a.platform);
          bHasValue = Boolean(b.platform);
          break;
        }
        default:
          return 0;
      }

      // 空值排在最后
      if (!aHasValue && bHasValue) return 1;
      if (aHasValue && !bHasValue) return -1;
      if (!aHasValue && !bHasValue) return 0;

      // 根据值类型进行比较
      let comparison: number;
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [loadedProfiles, addressesWithMeta, sortColumn, sortDirection]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectProfile = (profile: { address: string }) => {
    navigate(`/address/${profile.address}`);
    onClose();
  };

  // 处理排序变化
  const handleSortChange = (column: SortColumn) => {
    if (sortColumn === column) {
      // 点击同一列，切换方向或取消排序
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else {
        setSortColumn(null);
        setSortDirection('desc');
      }
    } else {
      // 点击新列，设置排序
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const isEmpty = allAddresses.length === 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-6xl flex flex-col overflow-hidden rounded-2xl border border-brand/20 bg-[#0B0E14] shadow-[0_0_50px_-12px_rgba(0,240,255,0.15)] transition-all animate-in zoom-in-95 slide-in-from-top-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-5">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <Icons.Tag size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-txt-main">
                  {zh.personalDataManagement.title}
                </h2>
              </div>
            </div>

            {/* 筛选开关 */}
            <div className="flex rounded-lg bg-surface2/50 p-1">
                <button
                  onClick={() => setShowFollowedOnly(false)}
                  className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-all ${
                    !showFollowedOnly
                      ? 'bg-brand/10 text-brand shadow-sm'
                      : 'text-txt-muted hover:bg-surface2 hover:text-txt-main'
                  }`}
                >
                  <Icons.Grid size={14} />
                  <span>全部</span>
                </button>
                <button
                  onClick={() => setShowFollowedOnly(true)}
                  className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-all ${
                    showFollowedOnly
                      ? 'bg-brand/10 text-brand shadow-sm'
                      : 'text-txt-muted hover:bg-surface2 hover:text-txt-main'
                  }`}
                >
                  <Icons.Heart size={14} />
                  <span>只看关注</span>
                  <span className="ml-0.5 rounded bg-brand/20 px-1.5 py-0.5 text-[10px]">
                    {followedList.length}
                  </span>
                </button>
              </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-txt-muted hover:bg-surface2 hover:text-txt-main transition-colors"
          >
            <Icons.X size={20} />
          </button>
        </div>

        {/* Content with Infinite Scroll */}
        <div className="overflow-auto bg-surface1/20 max-h-[70vh]">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface2 text-txt-muted shadow-inner">
                <Icons.Inbox size={36} className="opacity-70" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-txt-main">
                  暂无数据
                </h3>
                <p className="mx-auto mt-1 max-w-sm text-sm text-txt-muted">
                  关注交易者或添加标注后，将在此处显示
                </p>
              </div>
            </div>
          ) : showFollowedOnly && allAddresses.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface2 text-txt-muted shadow-inner">
                <Icons.Heart size={36} className="opacity-70" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-txt-main">
                  暂无关注
                </h3>
                <p className="mx-auto mt-1 max-w-sm text-sm text-txt-muted">
                  你还没有关注任何交易者
                </p>
              </div>
            </div>
          ) : (
            <InfiniteScroll
              hasMore={hasMore}
              isLoading={isLoading}
              onLoadMore={loadMore}
            >
              <div className="p-4">
                <SmartMoneyTable
                  displayProfiles={displayProfiles}
                  onSelectDisplayProfile={handleSelectProfile}
                  hideRank
                  hideVolume
                  hideWinRate
                  hideLinks
                  enableSort
                  useExternalSort
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSortChange={handleSortChange}
                />
              </div>
            </InfiniteScroll>
          )}
        </div>
      </div>
    </div>
  );
}
