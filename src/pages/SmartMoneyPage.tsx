/**
 * Smart Money Dashboard Page
 *
 * Composes the migrated Smart Money UI: hero search, stat cards,
 * filters, table + drawer, profile modal.
 * Currently powered by Opinion PnL leaderboard API; Phase 4 will add richer filters.
 */

import { useMemo, useState } from 'react';
import type { LeaderboardEntry, SmartMoneyTag } from '@/types';
import type { SmartWalletSortBy } from '@/lib/api';
import { useLeaderboard } from '@/hooks/use-leaderboard';
import { useSmartWalletsStats } from '@/hooks/use-smart-wallets-stats';
import SmartMoneyTable from '@/components/leaderboard/smart-money-table';
import TraderDrawer from '@/components/leaderboard/trader-drawer';
import StatCard from '@/components/ui/stat-card';
import { Pagination } from '@/components/ui/pagination';
import { CustomSelect, type Option } from '@/components/ui/custom-select';
import { TagFilterSelect } from '@/components/ui/tag-filter-select';
import { Icons } from '@/components/ui/icons';
import { MockDataBanner } from '@/components/ui/mock-data-banner';
import { UpdateCarousel, DEFAULT_UPDATE_SLIDES } from '@/components/ui/update-carousel';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { zh } from '@/lib/translations';

type TagFilter = SmartMoneyTag | 'all';
type SortOption = SmartWalletSortBy;

const SORT_OPTIONS: Option<SortOption>[] = [
  { label: zh.smartMoneyPage.sortOptions.pnl, value: 'total_profit' },
  { label: zh.smartMoneyPage.sortOptions.volume, value: 'volume' },
  { label: zh.smartMoneyPage.sortOptions.smart_score, value: 'smart_score' },
  { label: zh.smartMoneyPage.sortOptions.roi, value: 'roi_value' },
  { label: zh.smartMoneyPage.sortOptions.win_rate, value: 'win_rate_value' },
];

export function SmartMoneyPage() {
  const [selectedTag, setSelectedTag] = useState<TagFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('smart_score');
  const [selectedTrader, setSelectedTrader] = useState<LeaderboardEntry | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 20;

  // Fetch current page data with pagination from backend
  const { data, isLoading } = useLeaderboard({
    page: currentPage,
    pageSize: ITEMS_PER_PAGE,
    sortBy: sortBy,
    sortOrder: 'desc',
  });

  // Fetch stats from API
  const { data: statsData } = useSmartWalletsStats();

  const leaderboardEntries = data?.data ?? [];
  const totalCount = data?.total ?? 0;
  const isMockData = data?.__source === 'mock';

  // Calculate total pages from backend response
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  // Use API stats if available, otherwise show loading state
  const stats = useMemo(() => {
    // Use API stats when available
    if (statsData) {
      const total = typeof statsData.total === 'string'
        ? parseInt(statsData.total, 10)
        : statsData.total;

      return [
        {
          label: zh.smartMoneyPage.stats.activeSmartMoney,
          value: total.toLocaleString(),
        },
        {
          label: zh.smartMoneyPage.stats.avgPnl24h,
          value: formatCurrency(statsData.avgPnl || 0),
        },
        {
          label: zh.smartMoneyPage.stats.avgRoi,
          value: formatPercentage(statsData.avgRoi || 0),
        },
        {
          label: zh.smartMoneyPage.stats.avgWinRate,
          value: formatPercentage((statsData.avgWinRate || 0) / 100),
        },
      ];
    }

    // Fallback loading state when API data not available
    return [
      { label: zh.smartMoneyPage.stats.activeSmartMoney, value: '...' },
      { label: zh.smartMoneyPage.stats.avgPnl24h, value: '...' },
      { label: zh.smartMoneyPage.stats.avgRoi, value: '...' },
      { label: zh.smartMoneyPage.stats.avgWinRate, value: '...' },
    ];
  }, [statsData]);

  // 当排序改变时，重置到第一页
  const handleSortChange = (newSortBy: SortOption) => {
    if (sortBy !== newSortBy) {
      setSortBy(newSortBy);
      setCurrentPage(1);
    }
  };

  // 标签筛选变化（埋点，暂不实际过滤）
  const handleTagFilterChange = (newTag: TagFilter) => {
    setSelectedTag(newTag);
    // TODO: 实际过滤逻辑待后端支持标签筛选参数后实现
    console.log('[SmartMoneyPage] Tag filter changed:', newTag);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Update Carousel - Fixed Overlay */}
      <UpdateCarousel slides={DEFAULT_UPDATE_SLIDES} />

      <div className="mx-auto max-w-[1400px] px-6 pb-16 pt-10">
      {/* Hero */}
      <div className="mb-10">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand shadow-glow-brand" />
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-brand">
          Deep Dive into Smart Money
          </span>
        </div>
        <h1 className="font-heading text-3xl font-bold text-txt-main md:text-4xl lg:text-5xl">
          {zh.smartMoneyPage.heroTitleMain}{' '}
          <span className="text-txt-muted">{zh.smartMoneyPage.heroTitleSub}</span>
        </h1>
        <p className="mt-2 max-w-xl text-txt-secondary">{zh.smartMoneyPage.heroDescription}</p>
      </div>

      {/* Mock Data Banner */}
      <MockDataBanner show={isMockData} />

      {/* Stats */}
      <div className="mb-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Controls Bar */}
      <div className="mb-6 flex flex-col justify-between gap-4 rounded-lg border border-border bg-surface1 p-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter: Tags */}
          <TagFilterSelect
            value={selectedTag}
            onChange={handleTagFilterChange}
          />

          {/* Filter: Sort Metric */}
          <CustomSelect
            options={SORT_OPTIONS}
            value={sortBy}
            onChange={handleSortChange}
            icon={<Icons.Trophy size={14} />}
            label={zh.smartMoneyPage.sortLabel}
          />
        </div>

        {/* Data Update Notice */}
        <div className="flex items-center gap-2 text-xs text-txt-muted">
          <Icons.Clock size={13} className="text-brand/70" />
          <span>每日 <span className="font-medium text-brand/90">04:00 (UTC+8)</span> 更新</span>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="rounded-xl border border-border bg-surface1 p-8 text-center text-txt-muted">
          {zh.smartMoneyPage.loading}
        </div>
      ) : (
        <>
          <SmartMoneyTable
            entries={leaderboardEntries}
            onSelectTrader={setSelectedTrader}
            startRank={(currentPage - 1) * ITEMS_PER_PAGE + 1}
            hideMyAction
            hideWalletActive
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalCount}
              pageSize={ITEMS_PER_PAGE}
              onPageChange={handlePageChange}
              className="mt-6"
            />
          )}
        </>
      )}

      {/* Drawer */}
      <TraderDrawer
        isOpen={!!selectedTrader}
        trader={selectedTrader}
        onClose={() => setSelectedTrader(null)}
      />
      </div>
    </>
  );
}
