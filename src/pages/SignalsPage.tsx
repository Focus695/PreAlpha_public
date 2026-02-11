/**
 * Signals Page
 *
 * Enhanced signal monitoring center with:
 * - Tab navigation (All, Followed, High Strength)
 * - Two-column layout (signal stream + filters/stats)
 * - Comprehensive filtering (type, strength, time, category)
 * - Real-time statistics
 */

import { useState, useMemo } from 'react';
import type { SignalType } from '@/types';
// 时间范围和市场分类功能暂时注释
// import type { MarketCategory } from '@/types';
import type { SignalTab, SignalViewMode, SignalTimeRange } from '@/types/signals';
import type { AddressAnnotation } from '@/types/user';
import { useLeaderboard } from '@/hooks/use-leaderboard';
import { useAddressSignals } from '@/hooks/use-address-signals';
import { useFollowedSignalProfiles } from '@/hooks/use-followed-signal-profiles';
import { SignalPageLayout } from '@/components/signals/signal-page-layout';
import { SignalStatsCard } from '@/components/signals/signal-stats-card';
import { SignalFiltersPanel } from '@/components/signals/signal-filters-panel';
import { SignalFeed } from '@/components/signal-feed';
import { SignalTable } from '@/components/signals/signal-table';
import { ViewModeToggle } from '@/components/ui/view-mode-toggle';
import { Icons } from '@/components/ui/icons';
import { zh } from '@/lib/translations';
import { useUserData } from '@/hooks/use-user-data';
import { logger } from '@/lib/logger';

// 时间范围映射（分钟）
const SIGNAL_TIME_WINDOWS: Record<SignalTimeRange, number> = {
  '15m': 15,       // 15分钟
  '1h': 60,        // 1小时
  '4h': 4 * 60,    // 4小时
  '1d': 24 * 60,   // 1天
};

export function SignalsPage() {
  // Navigation state
  const [activeTab, setActiveTab] = useState<SignalTab>('all');

  // View mode state
  const [viewMode, setViewMode] = useState<SignalViewMode>('card');

  // Filter state
  const [selectedTypes, setSelectedTypes] = useState<SignalType[]>([]);
  const [smartScoreRange, setSmartScoreRange] = useState<[number, number]>([0, 100]);
  const [timeRange, setTimeRange] = useState<SignalTimeRange>('1d');  // 默认1d
  // 市场分类功能暂时注释
  // const [categoryFilter, setCategoryFilter] = useState<MarketCategory | 'all'>('all');

  // User preferences (TODO: load from localStorage or API)
  const [mutedAddresses, setMutedAddresses] = useState<string[]>([]);
  const [bookmarkedSignals, setBookmarkedSignals] = useState<string[]>([]);

  // Fetch signals and followed addresses
  const { data: userData, followedList } = useUserData();
  const followedAddresses = useMemo(
    () => followedList.map((entry) => entry.address),
    [followedList]
  );

  const { data: leaderboardData, isLoading: isLeaderboardLoading } = useLeaderboard({
    sortBy: 'smart_score',    // 按 smartScore 排序
    sortOrder: 'desc',        // 降序
    pageSize: 20,             // 加载前20名聪明钱
  });
  const leaderboardEntries = leaderboardData?.data ?? [];
  const leaderboardAddresses = useMemo(
    () => leaderboardEntries.map((entry) => entry.address),
    [leaderboardEntries]
  );

  // 构建地址到 smartScore 的映射
  const addressSmartScores = useMemo(() => {
    const map: Record<string, number> = {};
    leaderboardEntries.forEach((entry) => {
      map[entry.address.toLowerCase()] = entry.profile.smartScore ?? 0;
    });
    return map;
  }, [leaderboardEntries]);

  // 构建地址到 profile 的映射（合并 leaderboard 和 followedList 数据）
  // 头像和 userName 完全来自排行榜 API 和关注列表，不调用额外接口
  const baseAddressProfiles = useMemo(() => {
    const profiles = new Map<string, { userName?: string; avatarUrl?: string }>();

    // 从 leaderboardEntries 添加
    leaderboardEntries.forEach((entry) => {
      const normalized = entry.address.toLowerCase();
      profiles.set(normalized, {
        userName: entry.profile.userName,
        avatarUrl: entry.profile.avatarUrl,
      });
    });

    // 从 followedList 添加（只添加不在 leaderboard 中的地址，或者补充缺失的字段）
    followedList.forEach((followed) => {
      const normalized = followed.address.toLowerCase();
      const existing = profiles.get(normalized);

      // 只在地址不存在，或者现有数据缺失字段时添加/更新
      if (!existing) {
        profiles.set(normalized, {
          userName: followed.userName,
          avatarUrl: followed.avatarUrl,
        });
      } else {
        // 补充缺失的字段
        if (!existing.userName && followed.userName) {
          existing.userName = followed.userName;
        }
        if (!existing.avatarUrl && followed.avatarUrl) {
          existing.avatarUrl = followed.avatarUrl;
        }
      }
    });

    return profiles;
  }, [leaderboardEntries, followedList]);

  // Debug: 检查 followedList 数据
  logger.debug('[SignalsPage] followedList:', {
    count: followedList.length,
    items: followedList.map(f => ({
      address: f.address,
      hasUserName: !!f.userName,
      hasAvatarUrl: !!f.avatarUrl,
      userName: f.userName,
      avatarUrl: f.avatarUrl,
    })),
  });

  logger.debug('[SignalsPage] baseAddressProfiles:', {
    size: baseAddressProfiles.size,
    entries: Array.from(baseAddressProfiles.entries()).map(([addr, profile]) => ({
      address: addr,
      hasUserName: !!profile.userName,
      hasAvatarUrl: !!profile.avatarUrl,
      userName: profile.userName,
      avatarUrl: profile.avatarUrl,
    })),
  });

  // 合并排行榜地址和已关注地址（去重），用于"全部信号"
  const allAddressesForSignals = useMemo(() => {
    const combined = [...leaderboardAddresses, ...followedAddresses];
    const normalized = combined.map((addr) => addr.toLowerCase());
    const unique = Array.from(new Set(normalized));
    return unique;
  }, [leaderboardAddresses, followedAddresses]);

  const allSignalsQuery = useAddressSignals(allAddressesForSignals, {
    lookbackMinutes: SIGNAL_TIME_WINDOWS[timeRange],  // 根据 timeRange 动态调整
    limitPerAddress: 5,     // 每个地址拉取最新5条交易
    addressSmartScores,     // 传递 smartScore 映射用于优先级轮询
  });
  const followedSignalsQuery = useAddressSignals(followedAddresses, {
    lookbackMinutes: SIGNAL_TIME_WINDOWS[timeRange],  // 根据 timeRange 动态调整
    limitPerAddress: 5,     // 每个地址拉取最新5条交易
    addressSmartScores,     // 传递 smartScore 映射
  });

  const allSignals = allSignalsQuery.signals;
  const followedSignals = followedSignalsQuery.signals;
  const followedSignalsCount = followedSignals.length;

  const isFollowedTab = activeTab === 'followed';
  const activeSignals = isFollowedTab ? followedSignals : allSignals;

  // 提取出现在信号中的已关注地址（用于获取完整的 profile 数据，包括 twitter）
  const followedAddressesInSignals = useMemo(() => {
    const followedSet = new Set(followedAddresses.map((a) => a.toLowerCase()));
    const uniqueAddresses = new Set<string>();

    activeSignals.forEach((signal) => {
      signal.addresses.forEach((addr) => {
        if (followedSet.has(addr.toLowerCase())) {
          uniqueAddresses.add(addr.toLowerCase());
        }
      });
    });

    return Array.from(uniqueAddresses);
  }, [activeSignals, followedAddresses]);

  // 获取出现在信号中的已关注地址的完整 profile 数据（30天缓存）
  const { profiles: followedSignalProfiles } = useFollowedSignalProfiles({
    addresses: followedAddressesInSignals,
    enabled: followedAddressesInSignals.length > 0,
    concurrency: 3,
  });

  // 合并所有 profile 数据，优先级：followed signal profiles > base profiles
  const addressProfiles = useMemo(() => {
    const merged = new Map<string, { userName?: string; avatarUrl?: string; twitterHandle?: string; twitterUrl?: string }>();

    // 先添加 base profiles
    baseAddressProfiles.forEach((profile, address) => {
      merged.set(address, profile);
    });

    // followed signal profiles 优先级最高（包含 twitter 信息）
    followedSignalProfiles.forEach((profile, address) => {
      merged.set(address, {
        userName: profile.userName,
        avatarUrl: profile.avatarUrl,
        twitterHandle: profile.twitterHandle,
        twitterUrl: profile.twitterUrl,
      });
    });

    return merged;
  }, [baseAddressProfiles, followedSignalProfiles]);

  // 转换 annotations 为 Map 格式，用于组件
  const addressAnnotations = useMemo(() => {
    const annotationsMap = new Map<string, AddressAnnotation>();
    if (userData?.annotations) {
      Object.entries(userData.annotations).forEach(([addr, annotation]) => {
        if (annotation) {
          annotationsMap.set(addr.toLowerCase(), annotation);
        }
      });
    }
    return annotationsMap;
  }, [userData]);

  const filteredSignals = useMemo(() => {
    const now = Date.now();
    const timeWindowMs = SIGNAL_TIME_WINDOWS[timeRange] * 60 * 1000;

    return activeSignals.filter((signal) => {
      if (selectedTypes.length > 0 && !selectedTypes.includes(signal.type)) {
        return false;
      }

      const score = signal.smartScore ?? 0;
      if (
        score < smartScoreRange[0] ||
        score > smartScoreRange[1]
      ) {
        return false;
      }

      // 时间范围过滤
      const createdMs =
        signal.createdAt instanceof Date
          ? signal.createdAt.getTime()
          : new Date(signal.createdAt).getTime();
      if (!Number.isNaN(createdMs) && now - createdMs > timeWindowMs) {
        return false;
      }

      if (
        mutedAddresses.length > 0 &&
        signal.addresses.some((addr) => mutedAddresses.includes(addr))
      ) {
        return false;
      }

      return true;
    });
  }, [
    activeSignals,
    mutedAddresses,
    selectedTypes,
    smartScoreRange,
    timeRange,
  ]);

  // Calculate statistics
  const stats = useMemo(
    () => ({
      totalToday: filteredSignals.length,
      avgSmartScore:
        filteredSignals.length > 0
          ? filteredSignals.reduce((sum, s) => sum + (s.smartScore ?? 0), 0) /
            filteredSignals.length
          : 0,
      highScoreCount: filteredSignals.filter((s) => (s.smartScore ?? 0) >= 80).length,
      followedCount: followedSignalsCount,
    }),
    [filteredSignals, followedSignalsCount]
  );

  const isSignalsLoading = isFollowedTab
      ? followedSignalsQuery.isLoading
      : isLeaderboardLoading || allSignalsQuery.isLoading;

  const isSignalsFetching = isFollowedTab
      ? followedSignalsQuery.isFetching
      : allSignalsQuery.isFetching;

  // Clear all filters
  const handleClearAll = () => {
    setSelectedTypes([]);
    setSmartScoreRange([0, 100]);
    setTimeRange('1d');
  };

  // Action handlers
  const handleBookmark = (signalId: string) => {
    setBookmarkedSignals((prev) =>
      prev.includes(signalId)
        ? prev.filter((id) => id !== signalId)
        : [...prev, signalId]
    );
  };

  const handleMute = (address: string) => {
    setMutedAddresses((prev) =>
      prev.includes(address) ? prev : [...prev, address]
    );
  };

  const handleShare = (signalId: string) => {
    // TODO: Implement share functionality
    const signal = filteredSignals.find((s) => s.id === signalId);
    if (signal) {
      navigator.clipboard.writeText(
        `${window.location.origin}/signals/${signalId}`
      );
      // Could add a toast notification here
    }
  };

  const handleAddressClick = (address: string) => {
    // TODO: Open trader drawer or navigate to address page
    window.location.href = `/address/${address}`;
  };

  // Left column: Signal stream
  const signalStreamColumn = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface1/50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-brand/10 text-brand">
            <Icons.Zap size={18} />
          </div>
          <h2 className="font-sans text-lg font-bold text-txt-main">
            {zh.signalsPage.leftColumn.title}
          </h2>
          <span className="rounded-full bg-surface2 px-2 py-0.5 text-xs text-txt-secondary">
            {zh.signalsPage.leftColumn.count(filteredSignals.length)}
          </span>
        </div>
        {/* View Mode Toggle */}
        <div className="flex items-center gap-3">
          {isSignalsFetching && (
            <span className="text-[10px] uppercase tracking-wide text-txt-muted">
              {zh.signalsPage.loading}
            </span>
          )}
          <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isSignalsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-txt-muted">
              <Icons.Loader2 size={16} className="animate-spin" />
              <span>{zh.signalsPage.loading}</span>
            </div>
          </div>
        ) : filteredSignals.length > 0 ? (
          viewMode === 'card' ? (
            <SignalFeed
              signals={filteredSignals}
              bookmarkedSignals={bookmarkedSignals}
              onBookmark={handleBookmark}
              onMute={handleMute}
              onShare={handleShare}
              onAddressClick={handleAddressClick}
              profiles={addressProfiles}
            />
          ) : (
            <SignalTable
              signals={filteredSignals}
              bookmarkedSignals={bookmarkedSignals}
              onBookmark={handleBookmark}
              onMute={handleMute}
              onShare={handleShare}
              onAddressClick={handleAddressClick}
              profiles={addressProfiles}
              annotations={addressAnnotations}
            />
          )
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface2 text-txt-muted shadow-inner">
              <Icons.Zap size={40} className="opacity-50" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium text-txt-main">
                {activeTab === 'followed'
                  ? zh.signalsPage.empty.noFollowed
                    : zh.signalsPage.empty.noSignals}
              </h3>
              <p className="mt-1 text-sm text-txt-muted max-w-xs mx-auto">
                {activeTab === 'followed'
                  ? zh.signalsPage.empty.noFollowedDesc
                    : zh.signalsPage.empty.noSignalsDesc}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );

  const leftColumn = signalStreamColumn;

  // Right column: Stats + Filters
  const rightColumn = (
    <div className="flex flex-col gap-6 overflow-auto">
      {/* Statistics */}
      <SignalStatsCard stats={stats} />

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Filters */}
      <SignalFiltersPanel
        selectedTypes={selectedTypes}
        onTypesChange={setSelectedTypes}
        smartScoreRange={smartScoreRange}
        onSmartScoreRangeChange={setSmartScoreRange}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        onClearAll={handleClearAll}
      />
    </div>
  );

  return (
    <SignalPageLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      leftColumn={leftColumn}
      rightColumn={rightColumn}
    />
  );
}
