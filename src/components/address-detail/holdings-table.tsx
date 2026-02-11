/**
 * HoldingsTable Component
 *
 * Tabbed table showing holdings, trades, and analysis.
 * 使用真实 API 数据，通过 hooks 获取持仓和交易历史
 */

import { useEffect, useState } from 'react';
import type { AddressProfile } from '@/types';
import { Icons } from '@/components/ui/icons';
import { formatCurrency } from '@/lib/utils';
import { useUserPositions } from '@/hooks/use-user-positions';
import { useUserTrades } from '@/hooks/use-user-trades';
import type { DataSourceMeta } from '@/lib/address-profile-utils';
import { DataSourceBadge } from './address-detail-header';
import { Pagination } from '@/components/ui/pagination';
import { zh } from '@/lib/translations';
import type { TradeAction } from '@/lib/transformers/trades';
import { getOpinionMarketUrl } from '@/lib/api-constants';

type TabType = 'holdings' | 'trades' | 'analysis';

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

interface HoldingsTableProps {
  profile: AddressProfile;
  onTradesTotalChange?: (total: number) => void;
}

export function HoldingsTable({ profile, onTradesTotalChange }: HoldingsTableProps) {
  const [activeTab, setActiveTab] = useState<TabType>('holdings');
  const [positionsPage, setPositionsPage] = useState(1);
  const [tradesPage, setTradesPage] = useState(1);
  const PAGE_SIZE = 20;

  // 使用真实 API 数据
  const {
    positions,
    total: positionsTotal,
    isLoading: positionsLoading,
    isFetching: positionsFetching,
    isError: positionsError,
    dataSource: positionsSource,
  } = useUserPositions(profile.address, { page: positionsPage, limit: PAGE_SIZE });

  // 交易历史在页面加载时即请求
  const {
    trades,
    total: tradesTotal,
    isLoading: tradesLoading,
    isFetching: tradesFetching,
  } = useUserTrades(profile.address, {
    page: tradesPage,
    limit: PAGE_SIZE,
  });

  // 通知父组件交易总数变化
  useEffect(() => {
    if (tradesTotal !== undefined && onTradesTotalChange) {
      onTradesTotalChange(tradesTotal);
    }
  }, [tradesTotal, onTradesTotalChange]);

  useEffect(() => {
    setPositionsPage(1);
    setTradesPage(1);
  }, [profile.address]);

  const positionsTotalPages = Math.max(1, Math.ceil(Math.max(positionsTotal ?? 0, 0) / PAGE_SIZE) || 1);
  const tradesTotalPages = Math.max(1, Math.ceil(Math.max(tradesTotal ?? 0, 0) / PAGE_SIZE) || 1);


  // 数据源元信息
  const positionsMeta: DataSourceMeta = {
    source: positionsSource,
    reason:
      positionsSource === 'mock'
        ? positionsError
          ? 'API error'
          : 'mock-mode'
        : undefined,
    timestamp: new Date().toISOString(),
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'holdings', label: zh.holdingsTable.tabs.holdings },
    { id: 'trades', label: zh.holdingsTable.tabs.trades },
    // { id: 'analysis', label: zh.holdingsTable.tabs.analysis },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface1">
      {/* Tab Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface2/30 px-4">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-brand text-txt-main font-bold'
                  : 'border-transparent text-txt-muted hover:text-txt-main'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <DataSourceBadge meta={positionsMeta} />
      </div>

      {/* Table Content */}
      <div className="overflow-hidden">
        {activeTab === 'holdings' && (
          <div className="p-6">
            {positionsLoading ? (
              <div className="flex min-h-[200px] items-center justify-center">
                <div className="flex items-center gap-2 text-txt-muted">
                  <Icons.Loader2 size={16} className="animate-spin" />
                  <span>{zh.holdingsTable.loadingPositions}</span>
                </div>
              </div>
            ) : positions.length === 0 ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center">
                <Icons.Inbox size={28} className="text-txt-muted" />
                <p className="text-sm text-txt-muted">{zh.holdingsTable.noPositions}</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {positions.map((position) => {
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
                              ${(position.currentPrice ?? position.avgPrice).toFixed(3)}
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
                    isLoading={positionsFetching}
                    className="mt-4 pt-4"
                  />
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'trades' && (
          <div className="overflow-x-auto">
            {tradesLoading ? (
              <div className="flex min-h-[200px] items-center justify-center">
                <div className="flex items-center gap-2 text-txt-muted">
                  <Icons.Loader2 size={16} className="animate-spin" />
                  <span>{zh.holdingsTable.loadingTrades}</span>
                </div>
              </div>
            ) : trades.length === 0 ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center">
                <Icons.Inbox size={28} className="text-txt-muted" />
                <p className="text-sm text-txt-muted">{zh.holdingsTable.noTrades}</p>
              </div>
            ) : (
              <>
              <table className="w-full text-left text-sm">
                <thead className="bg-surface2/50 text-xs uppercase text-txt-secondary">
                  <tr>
                    <th className="px-6 py-3 font-medium">{zh.holdingsTable.columns.time}</th>
                    <th className="px-6 py-3 font-medium">{zh.holdingsTable.columns.market}</th>
                    <th className="px-6 py-3 font-medium">{zh.holdingsTable.columns.side}</th>
                    <th className="px-6 py-3 font-medium text-right">{zh.holdingsTable.columns.price}</th>
                    <th className="px-6 py-3 font-medium text-right">{zh.holdingsTable.columns.size}</th>
                    <th className="px-6 py-3 font-medium text-right">{zh.holdingsTable.columns.pnl}</th>
                    <th className="px-6 py-3 font-medium text-center">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-txt-main">
                  {trades.map((trade) => (
                    <tr key={trade.id} className="transition-colors hover:bg-surface2/40">
                      <td className="px-6 py-4 text-xs text-txt-muted whitespace-nowrap">
                        {trade.settledAgo}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {/* 事件名称 */}
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-txt-muted">事件:</span>
                            <span className="font-medium text-txt-main line-clamp-1" title={trade.market}>
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`font-bold ${getSideActionColorClass(trade.side)}`}>
                          {trade.side}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-txt-secondary">
                        ${trade.exitPrice.toFixed(3)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        {trade.size.toLocaleString()}
                      </td>
                      <td className={`px-6 py-4 text-right font-mono font-medium ${
                        trade.pnl >= 0 ? 'text-profit' : 'text-down'
                      }`}>
                         {trade.pnl === 0 ? '/' : `${trade.pnl >= 0 ? '+' : '-'}$${Math.abs(trade.pnl).toLocaleString()}`}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
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
              {tradesTotal > 0 && (
                <Pagination
                  currentPage={tradesPage}
                  totalPages={tradesTotalPages}
                  totalItems={tradesTotal}
                  pageSize={PAGE_SIZE}
                  onPageChange={setTradesPage}
                  isLoading={tradesFetching}
                  className="px-6 py-4"
                />
              )}
              </>
            )}
          </div>
        )}

        {/* Analysis tab temporarily disabled */}
        {/* {activeTab === 'analysis' && (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 border-t border-dashed border-border bg-surface1/40 p-8 text-center">
            <Icons.Activity size={28} className="text-brand" />
            <p className="text-sm text-txt-muted">{zh.holdingsTable.analysisComing}</p>
            <p className="text-xs text-txt-secondary">{zh.holdingsTable.analysisNote}</p>
            <span className="rounded-full border border-border px-4 py-1 text-[10px] uppercase tracking-[0.4em] text-txt-muted">
              {zh.holdingsTable.comingSoonTag}
            </span>
          </div>
        )} */}
      </div>
    </div>
  );
}
