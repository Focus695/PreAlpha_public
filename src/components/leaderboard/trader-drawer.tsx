/**
 * TraderDrawer Component
 *
 * 侧边抽屉，显示交易者简要信息
 * 使用远程 API 获取真实数据
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LeaderboardEntry } from '@/types';
import { Icons } from '@/components/ui/icons';
import { Pagination } from '@/components/ui/pagination';
import { UserCard } from '@/components/ui/user-card';
import { formatCurrency } from '@/lib/utils';
import { leaderboardEntryToDisplayProfile } from '@/lib/transformers';
// PnL 图表暂时隐藏，相关 import 暂时注释
/*
import {
  useTraderPerformance,
  type TraderPerformancePoint,
  type TraderPerformanceRange,
} from '@/hooks/use-trader-performance';
*/
import { useUserPositions } from '@/hooks/use-user-positions';
import { useUserTrades } from '@/hooks/use-user-trades';
import { zh } from '@/lib/translations';
import { useUserData } from '@/hooks/use-user-data';
import type { TradeAction } from '@/lib/transformers/trades';
import { getOpinionMarketUrl } from '@/lib/api-constants';

// PnL 图表暂时隐藏，这些常量暂不使用
// const TIME_RANGE_OPTIONS: TraderPerformanceRange[] = ['1D', '1W', '1M', 'All'];

type DrawerSection = 'positions' | 'history';
const PAGE_SIZE = 20;

// 格式化期权显示：多元期权显示"选项名 - YES/NO"，二元期权显示"YES/NO"
function formatOptionDisplay(outcomeLabel: string | undefined, side: string): string {
  if (outcomeLabel) {
    return `${outcomeLabel} - ${side}`;
  }
  return side;
}

// 格式化交易期权显示（使用 outcome 字段）
function formatTradeOptionDisplay(outcomeLabel: string | undefined, outcome: string | undefined): string {
  if (outcomeLabel && outcome) {
    return `${outcomeLabel} - ${outcome}`;
  }
  return outcome ?? '-';
}

// 交易动作颜色映射
function getSideActionColorClass(side: TradeAction): string {
  switch (side) {
    case 'BUY':
      return 'text-profit';
    case 'SELL':
      return 'text-down';
    case 'SPLIT':
      return 'text-amber'; // 琥珀色表示拆分
    case 'MERGE':
      return 'text-purple'; // 紫色表示合并
    default:
      return 'text-txt-secondary';
  }
}

// PnL 图表暂时隐藏，相关函数暂时注释
/*
function createSeededRandom(seedSource: string) {
  let seed = 0;
  for (let i = 0; i < seedSource.length; i++) {
    seed = (seed << 5) - seed + seedSource.charCodeAt(i);
    seed |= 0;
  }
  if (seed === 0) {
    seed = 1;
  }

  return () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };
}

function generateMockPnlData(seedSource = 'default'): TraderPerformancePoint[] {
  const data: TraderPerformancePoint[] = [];
  const now = new Date();
  const random = createSeededRandom(seedSource);

  for (let i = 39; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const dailyPnl = (random() - 0.35) * 2000 + (40 - i) * 10;

    data.push({
      date,
      pnl: Math.round(dailyPnl),
    });
  }

  return data;
}

function filterDataByTimeRange(
  data: TraderPerformancePoint[],
  range: TraderPerformanceRange
): TraderPerformancePoint[] {
  if (range === 'All') return data.slice(-40);

  const now = new Date();
  let cutoffDate: Date;

  switch (range) {
    case '1D':
      cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - 1);
      break;
    case '1W':
      cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - 7);
      break;
    case '1M':
      cutoffDate = new Date(now);
      cutoffDate.setMonth(cutoffDate.getMonth() - 1);
      break;
    default:
      return data.slice(-40);
  }

  const filtered = data.filter((point) => point.date >= cutoffDate);
  return filtered.slice(-40);
}
*/

interface TraderDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  trader: LeaderboardEntry | null;
}

const TraderDrawer: React.FC<TraderDrawerProps> = ({
  isOpen,
  onClose,
  trader,
}) => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  // PnL 图表暂时隐藏
  // const [selectedTimeRange, setSelectedTimeRange] = useState<TraderPerformanceRange>('1M');
  const [activeSection, setActiveSection] = useState<DrawerSection>('positions');
  const [positionsPage, setPositionsPage] = useState(1);
  const [tradesPage, setTradesPage] = useState(1);

  // 用户数据 hook (统一管理关注和备注)
  const { getAnnotation } = useUserData();

  // 获取用户持仓数据
  const {
    positions: userPositions,
    isLoading: isPositionsLoading,
    isFetching: isPositionsFetching,
    total: positionsTotal,
  } = useUserPositions(trader?.address, { page: positionsPage, limit: PAGE_SIZE });

  // 获取用户交易历史 - 抽屉打开时即加载
  const {
    trades: userTrades,
    isLoading: isTradesLoading,
    isFetching: isTradesFetching,
    total: tradesTotal,
  } = useUserTrades(trader?.address, {
    page: tradesPage,
    limit: PAGE_SIZE,
  });
  const positionsTotalPages = Math.max(1, Math.ceil(Math.max(positionsTotal ?? 0, 0) / PAGE_SIZE) || 1);
  const tradesTotalPages = Math.max(1, Math.ceil(Math.max(tradesTotal ?? 0, 0) / PAGE_SIZE) || 1);

  // 计算交易次数（持仓数 + 交易历史数）
  const totalTradeCount = useMemo(() => {
    return (positionsTotal ?? 0) + (tradesTotal ?? 0);
  }, [positionsTotal, tradesTotal]);

  useEffect(() => {
    setPositionsPage(1);
    setTradesPage(1);
  }, [trader?.address]);


  // PnL 图表暂时隐藏，相关数据和 API 调用暂时注释
  /*
  const mockPnlData = useMemo(
    () => generateMockPnlData(trader?.address ?? 'default'),
    [trader?.address]
  );

  const fallbackPnlData = useMemo(
    () => filterDataByTimeRange(mockPnlData, selectedTimeRange),
    [mockPnlData, selectedTimeRange]
  );

  const {
    data,
    isFetching: isPerformanceFetching,
    isError: isPerformanceError,
    error: performanceError,
  } = useTraderPerformance(trader?.address, selectedTimeRange);

  const performanceData = (data ?? []) as TraderPerformancePoint[];
  const hasApiPerformanceData = performanceData.length > 0;

  const pnlData: TraderPerformancePoint[] = hasApiPerformanceData
    ? performanceData.slice(-40)
    : fallbackPnlData;

  const isUsingFallbackData = !hasApiPerformanceData;

  const chartScaleBase = useMemo(() => {
    if (!pnlData.length) {
      return 1;
    }
    const maxValue = Math.max(...pnlData.map((point) => Math.abs(point.pnl)));
    return maxValue === 0 ? 1 : maxValue;
  }, [pnlData]);
  */

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      document.body.style.overflow = 'unset';
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // PnL 图表暂时隐藏，相关 useEffect 暂时注释
  /*
  useEffect(() => {
    if (isPerformanceError && trader?.address) {
      logger.warn(
        `[TraderDrawer] Falling back to mock PnL data for ${trader.address}`,
        performanceError
      );
    }
  }, [isPerformanceError, performanceError, trader?.address]);
  */

  // Memoize display data to prevent unnecessary re-renders
  // NOTE: must be called on every render (before any early returns) to keep hook order stable.
  const displayData = useMemo(
    () => (trader ? leaderboardEntryToDisplayProfile(trader) : null),
    // Only recalculate when trader address changes
    [trader?.address]
  );

  if (!isVisible && !isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[150] flex justify-end transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* 背景遮罩 */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-[6px] transition-opacity duration-300 ease-out ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 抽屉面板 */}
      <div
        className={`relative h-full w-full max-w-2xl overflow-hidden border-l border-border bg-base shadow-2xl transition-[transform,opacity] duration-500 ease-smooth ${
          isOpen ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'
        }`}
      >
        {displayData && trader && (
          <div className="flex h-full flex-col">
            {/* 头部 - 使用 UserCard */}
            <div className="flex items-start justify-between border-b border-border p-6">
              <UserCard
                address={displayData.address}
                annotation={getAnnotation(displayData.address)}
                profile={displayData}
                variant="default"
                showAvatar
                showTwitter
                showFollow
                size="lg"
              />

              {/* 右上角按钮组 */}
              <div className="flex items-center gap-2">
                {/* 查看详细分析按钮 */}
                <button
                  onClick={() => {
                    if (displayData?.address) {
                      navigate(`/address/${displayData.address}`);
                    }
                  }}
                  className="group flex items-center gap-1.5 rounded-lg border border-border bg-surface1 px-3 py-2 text-xs font-medium text-txt-secondary transition-all duration-300 hover:border-brand/50 hover:bg-brand/5 hover:text-brand hover:shadow-[0_0_15px_rgba(0,240,255,0.2)]"
                >
                  <Icons.BarChart2 size={14} className="transition-transform group-hover:scale-110" />
                  <span>{zh.common.viewDetails}</span>
                  <Icons.ArrowUpRight size={12} className="opacity-60 transition-opacity group-hover:opacity-100" />
                </button>
                {/* 关闭按钮 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="rounded-lg p-2 text-txt-muted transition-colors hover:bg-surface2 hover:text-txt-main"
                >
                  <Icons.X size={20} />
                </button>
              </div>
            </div>

            {/* 可滚动内容 */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* 关键统计数据 */}
              <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg border border-border bg-surface1 p-3">
                  <span className="text-xs uppercase tracking-wider text-txt-muted">{zh.traderDrawer.totalPnl}</span>
                  <div
                    className={`mt-1 font-mono text-lg font-bold ${
                      displayData.totalPnl >= 0 ? 'text-profit' : 'text-down'
                    }`}
                  >
                    {displayData.totalPnl > 0 ? '+' : ''}
                    {formatCurrency(displayData.totalPnl, 0)}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-surface1 p-3">
                  <span className="text-xs uppercase tracking-wider text-txt-muted">ROI</span>
                  <div
                    className={`mt-1 font-mono text-lg font-bold ${
                      displayData.roi >= 0 ? 'text-profit' : 'text-down'
                    }`}
                  >
                    {displayData.roi > 0 ? '+' : ''}
                    {displayData.roi.toFixed(1)}%
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-surface1 p-3">
                  <span className="text-xs uppercase tracking-wider text-txt-muted">{zh.traderDrawer.winRate}</span>
                  <div className="mt-1 font-mono text-lg font-bold text-txt-main">
                    {displayData.winRate != null ? `${displayData.winRate.toFixed(1)}%` : '/'}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-surface1 p-3">
                  <span className="text-xs uppercase tracking-wider text-txt-muted">{zh.traderDrawer.trades}</span>
                  <div className="mt-1 font-mono text-lg font-bold text-txt-main">
                    {totalTradeCount}
                  </div>
                </div>
              </div>

              {/* PnL Performance 图表 - 暂时隐藏 */}
              {/* 
              <div className="group relative mb-8 overflow-hidden rounded-xl border border-border bg-surface1 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-medium text-txt-main">{zh.traderDrawer.pnlPerformance}</h3>
                  <div className="flex items-center gap-2">
                    {isPerformanceFetching && (
                      <span className="text-[10px] uppercase tracking-wide text-txt-muted">
                        {zh.traderDrawer.syncing}
                      </span>
                    )}
                    {isUsingFallbackData && (
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-accent/80">
                        {zh.traderDrawer.mockBadge}
                      </span>
                    )}
                    {TIME_RANGE_OPTIONS.map((t) => (
                      <button
                        key={t}
                        onClick={() => setSelectedTimeRange(t)}
                        className={`rounded px-2 py-1 text-xs transition-colors ${
                          selectedTimeRange === t
                            ? 'bg-brand/10 text-brand'
                            : 'text-txt-muted hover:text-txt-main'
                        }`}
                      >
                        {zh.traderDrawer.timeRanges[t]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative z-10 flex h-[200px] w-full items-end justify-between gap-1 px-2">
                  {pnlData.map((point, i) => {
                    const normalizedHeight = 20 + (Math.abs(point.pnl) / chartScaleBase) * 70;
                    const isProfit = point.pnl >= 0;

                    return (
                      <div
                        key={`${point.date.getTime()}-${i}`}
                        className={`w-full rounded-t-sm opacity-60 transition-opacity hover:opacity-100 ${
                          isProfit ? 'bg-profit' : 'bg-down'
                        }`}
                        style={{ height: `${normalizedHeight}%` }}
                        title={`${point.date.toLocaleDateString()}: ${isProfit ? '+' : ''}$${point.pnl.toLocaleString()}`}
                      />
                    );
                  })}
                  {pnlData.length === 0 && !isPerformanceFetching && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-txt-muted">
                      {zh.common.noData}
                    </div>
                  )}
                </div>
                <div
                  className="pointer-events-none absolute inset-0 z-0 opacity-10"
                  style={{
                    backgroundImage:
                      'linear-gradient(#2D333B 1px, transparent 1px), linear-gradient(90deg, #2D333B 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                  }}
                />
              </div>
              */}

              {/* 持仓 / 历史记录 */}
              <div>
                <div className="mb-4 flex items-center gap-6 border-b border-border">
                  <button
                    className={`pb-2 text-sm font-medium transition-colors ${
                      activeSection === 'positions'
                        ? 'border-b-2 border-brand text-txt-main'
                        : 'border-b-2 border-transparent text-txt-muted hover:text-txt-secondary'
                    }`}
                    onClick={() => setActiveSection('positions')}
                  >
                    {zh.traderDrawer.tabs.positions}
                  </button>
                  <button
                    className={`pb-2 text-sm font-medium transition-colors ${
                      activeSection === 'history'
                        ? 'border-b-2 border-brand text-txt-main'
                        : 'border-b-2 border-transparent text-txt-muted hover:text-txt-secondary'
                    }`}
                    onClick={() => setActiveSection('history')}
                  >
                    {zh.traderDrawer.tabs.history}
                  </button>
                </div>

                <div className="space-y-2">
                  {activeSection === 'positions' && (
                    isPositionsLoading ? (
                      <div className="rounded-lg border border-border bg-surface1/50 p-6 text-center text-xs text-txt-muted">
                        {zh.traderDrawer.loadingPositions}
                      </div>
                    ) : userPositions.length > 0 ? (
                      <>
                        <div className="space-y-3">
                      {userPositions.map((position) => {
                            const notionalValue =
                              position.currentValue ?? position.size * (position.currentPrice ?? position.avgPrice);
                        const quoteSymbol = position.quoteSymbol ?? 'USDT';
                            const pnlValue = position.pnl ?? 0;
                            const isProfit = pnlValue >= 0;
                            const sideUpper = position.side?.toUpperCase();
                            const sideBadgeClass =
                              sideUpper === 'YES'
                                ? 'border-profit/40 bg-profit/10 text-profit'
                                : sideUpper === 'NO'
                                  ? 'border-down/40 bg-down/10 text-down'
                                  : 'border-border text-txt-secondary';

                        return (
                        <div
                          key={position.id}
                                className={`group rounded-2xl border bg-surface1/60 p-4 shadow-[0_15px_35px_rgba(0,0,0,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/50 hover:bg-surface1 ${
                                  isProfit
                                    ? 'border-profit/20 shadow-[0_20px_45px_rgba(0,255,190,0.08)]'
                                    : 'border-down/20 shadow-[0_20px_45px_rgba(244,63,94,0.08)]'
                                }`}
                        >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="flex items-start gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface2 text-[10px] font-bold uppercase text-txt-secondary shadow-inner">
                              {position.ticker}
                            </div>
                            <div className="flex-1">
                                      {/* 事件名称 */}
                                      <div className="flex items-center gap-2 text-sm text-txt-muted">
                                        <span className="text-xs">事件:</span>
                                        <p className="font-medium text-txt-main line-clamp-2" title={position.market}>
                                          {position.market}
                                        </p>
                                      </div>
                                      {/* 选项显示 */}
                                      <div className="mt-2 flex items-center gap-2 text-xs">
                                        <span className="text-txt-muted">选项:</span>
                                        <span
                                          className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${sideBadgeClass}`}
                                        >
                                          {formatOptionDisplay(position.outcomeLabel, position.side)}
                                        </span>
                                      </div>
                                      {/* 价格和数量 */}
                                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-txt-muted">
                                        <span>
                                          {zh.holdingsTable.columns.avgPrice} ${position.avgPrice.toFixed(4)}
                                        </span>
                                        <span className="text-txt-muted">•</span>
                                        <span>
                                          {position.size.toLocaleString()} {zh.traderDrawer.shares}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex flex-col items-end gap-1 text-right">
                                    <span
                                      className={`text-lg font-mono font-semibold ${isProfit ? 'text-profit' : 'text-down'}`}
                            >
                                      {isProfit ? '+' : '-'}$
                                      {Math.abs(pnlValue).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-[11px] text-txt-muted">
                                      {quoteSymbol} {formatCurrency(notionalValue, 2)}
                                    </span>
                            </div>
                            </div>

                                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3 text-[11px] text-txt-muted">
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1">
                              <Icons.Clock size={10} />
                              <span>{position.timeAgo || zh.common.noData}</span>
                            </div>
                                    {position.marketId && (
                                      <a
                                        href={getOpinionMarketUrl(position.marketId, position.rootMarketId)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 rounded px-2 py-1 text-txt-muted hover:text-brand hover:bg-brand/10 transition-colors"
                                        title="View on Opinion"
                                      >
                                        <Icons.ExternalLink size={10} />
                                        <span>View on Opinion</span>
                                      </a>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="uppercase tracking-wide text-[10px] text-txt-secondary">
                                      {zh.holdingsTable.columns.price}
                                    </span>
                                    <span className="font-mono text-xs text-txt-main">
                                      ${(
                                        position.currentPrice ?? position.avgPrice
                                      ).toFixed(3)}
                                    </span>
                                  </div>
                          </div>
                        </div>
                      );
                    })}
                        </div>
                      {positionsTotal > 0 && (
                        <Pagination
                          currentPage={positionsPage}
                          totalPages={positionsTotalPages}
                          totalItems={positionsTotal}
                          pageSize={PAGE_SIZE}
                          onPageChange={setPositionsPage}
                          isLoading={isPositionsFetching}
                          className="mt-4 pt-4"
                        />
                      )}
                      </>
                    ) : (
                      <div className="rounded-lg border border-border bg-surface1/50 p-6 text-center text-xs text-txt-muted">
                        {zh.traderDrawer.noPositions}
                      </div>
                    )
                  )}

                  {activeSection === 'history' && (
                    isTradesLoading ? (
                      <div className="rounded-lg border border-border bg-surface1/50 p-6 text-center text-xs text-txt-muted">
                        {zh.traderDrawer.loadingHistory}
                      </div>
                    ) : userTrades.length > 0 ? (
                      <>
                      <div className="overflow-x-auto rounded-lg border border-border bg-surface1/30">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-surface2/50 text-txt-secondary">
                            <tr>
                              <th className="px-3 py-2 font-medium whitespace-nowrap">{zh.holdingsTable.columns.time}</th>
                              <th className="px-3 py-2 font-medium">{zh.holdingsTable.columns.market}</th>
                              <th className="px-3 py-2 font-medium whitespace-nowrap">{zh.holdingsTable.columns.side}</th>
                              <th className="px-3 py-2 font-medium text-right whitespace-nowrap">{zh.holdingsTable.columns.price}</th>
                              <th className="px-3 py-2 font-medium text-right whitespace-nowrap">{zh.holdingsTable.columns.size}</th>
                              <th className="px-3 py-2 font-medium text-right whitespace-nowrap">{zh.holdingsTable.columns.pnl}</th>
                              <th className="px-3 py-2 font-medium text-center whitespace-nowrap">View</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border text-txt-main">
                            {userTrades.map((trade) => (
                              <tr key={trade.id} className="transition-colors hover:bg-surface2/40">
                                <td className="px-3 py-2 text-txt-muted whitespace-nowrap">
                                  {trade.settledAgo}
                                </td>
                                <td className="px-3 py-2 min-w-[160px]">
                                  <div className="flex flex-col gap-1">
                                    {/* 事件名称 */}
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] text-txt-muted">事件:</span>
                                      <span className="font-medium text-txt-main line-clamp-2" title={trade.market}>
                                        {trade.market}
                                      </span>
                                    </div>
                                    {/* 选项显示 */}
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] text-txt-muted">选项:</span>
                                      <span className="text-[11px] text-txt-secondary">
                                        {formatTradeOptionDisplay(trade.outcomeLabel, trade.outcome)}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                  <span className={`font-bold ${getSideActionColorClass(trade.side)}`}>
                                    {trade.side}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-txt-secondary whitespace-nowrap">
                                  ${trade.exitPrice.toFixed(3)}
                                </td>
                                <td className="px-3 py-2 text-right font-mono whitespace-nowrap">
                                  {trade.size.toLocaleString()}
                                </td>
                                <td className={`px-3 py-2 text-right font-mono whitespace-nowrap font-medium ${
                                  trade.pnl >= 0 ? 'text-profit' : 'text-down'
                                }`}>
                                  {trade.pnl === 0 ? '/' : `${trade.pnl >= 0 ? '+' : '-'}$${Math.abs(trade.pnl).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                                </td>
                                <td className="px-3 py-2 text-center whitespace-nowrap">
                                  {trade.marketId ? (
                                    <a
                                      href={getOpinionMarketUrl(trade.marketId, trade.rootMarketId)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center justify-center p-1.5 rounded text-txt-muted hover:text-brand hover:bg-brand/10 transition-colors"
                                      title="View on Opinion"
                                    >
                                      <Icons.ExternalLink size={12} />
                                    </a>
                                  ) : null}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {tradesTotal > 0 && (
                        <Pagination
                          currentPage={tradesPage}
                          totalPages={tradesTotalPages}
                          totalItems={tradesTotal}
                          pageSize={PAGE_SIZE}
                          onPageChange={setTradesPage}
                          isLoading={isTradesFetching}
                          className="mt-4 pt-4"
                        />
                      )}
                      </>
                    ) : (
                      <div className="rounded-lg border border-border bg-surface1/50 p-6 text-center text-xs text-txt-muted">
                        {zh.traderDrawer.noHistory}
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* 底部 - 关注按钮已集成到 UserCard 中，无需单独显示 */}
          </div>
        )}
      </div>
    </div>
  );
};

export default TraderDrawer;

