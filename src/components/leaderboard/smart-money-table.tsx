/**
 * SmartMoneyTable Component
 *
 * 核心排行榜表格，显示聪明钱地址列表
 */

import React, { useMemo } from 'react';
import type { LeaderboardEntry } from '@/types';
import type { DisplayProfile } from '@/lib/transformers';
import { TagEditor } from '@/components/ui/tag-editor';
import { UserCard } from '@/components/ui/user-card';
import { SmartScoreBadge } from '@/components/smart-score-badge';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { formatTimeAgoZh } from '@/lib/transformers/common';
import { leaderboardEntryToDisplayProfile } from '@/lib/transformers';
import { useUserData } from '@/hooks/use-user-data';
import { zh } from '@/lib/translations';
import { Icons } from '@/components/ui/icons';

export type SortColumn =
  | 'userName'      // 用户名
  | 'myAction'      // 用户操作时间
  | 'walletActive'  // 最近活跃
  | 'totalPnl'      // PnL
  | 'roi'           // ROI
  | 'smartScore'    // Smart Score
  | 'platform'      // 平台
  | null;

export type SortDirection = 'asc' | 'desc';

interface SmartMoneyTableProps {
  /** 排行榜条目数组 */
  entries?: LeaderboardEntry[];
  /** 直接传入显示格式的数据（用于个人数据管理页面） */
  displayProfiles?: DisplayProfile[];
  /** 选中交易者时的回调 */
  onSelectTrader?: (entry: LeaderboardEntry) => void;
  /** 选中显示格式数据时的回调 */
  onSelectDisplayProfile?: (profile: DisplayProfile) => void;
  /** 起始排名（用于分页，默认为1） */
  startRank?: number;
  /** 隐藏排名列 */
  hideRank?: boolean;
  /** 隐藏成交量列 */
  hideVolume?: boolean;
  /** 隐藏胜率列 */
  hideWinRate?: boolean;
  /** 隐藏我的更新列 */
  hideMyAction?: boolean;
  /** 隐藏钱包活跃列 */
  hideWalletActive?: boolean;
  /** 隐藏链接列 */
  hideLinks?: boolean;
  /** 隐藏关注按钮 */
  hideFollow?: boolean;
  /** 启用排序（仅用于 myAction 和 walletActive 列） */
  enableSort?: boolean;
  /** 使用外部排序（数据已排序，不在内部排序） */
  useExternalSort?: boolean;
  /** 当前排序列 */
  sortColumn?: SortColumn;
  /** 当前排序方向 */
  sortDirection?: SortDirection;
  /** 排序变化回调 */
  onSortChange?: (column: SortColumn) => void;
}

const SmartMoneyTable: React.FC<SmartMoneyTableProps> = ({
  entries,
  displayProfiles,
  onSelectTrader,
  onSelectDisplayProfile,
  startRank = 1,
  hideRank = false,
  hideVolume = false,
  hideWinRate = false,
  hideMyAction = false,
  hideWalletActive = false,
  hideLinks = false,
  hideFollow = false,
  enableSort = false,
  useExternalSort = false,
  sortColumn = null,
  sortDirection = 'desc',
  onSortChange,
}) => {
  // 用户数据 hook (统一管理备注和标签)
  const { getAnnotation, addCustomTag, removeCustomTag } = useUserData();

  // 转换为显示格式 - 优先使用 displayProfiles
  const baseDisplayData = displayProfiles || (entries ? entries.map(leaderboardEntryToDisplayProfile) : []);

  // 排序逻辑
  const displayData = useMemo(() => {
    // 如果使用外部排序，直接返回原数据
    if (useExternalSort) {
      return baseDisplayData;
    }

    if (!enableSort || !sortColumn) {
      return baseDisplayData;
    }

    const sorted = [...baseDisplayData].sort((a, b) => {
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

    return sorted;
  }, [baseDisplayData, enableSort, sortColumn, sortDirection, useExternalSort]);

  const isUsingDisplayProfiles = !!displayProfiles;

  const shouldIgnoreClick = (target: HTMLElement | null) => {
    if (!target) return false;
    return Boolean(target.closest('a, input, textarea, button'));
  };

  // 处理排序点击
  const handleSortClick = (column: SortColumn) => {
    if (!enableSort || !onSortChange) return;

    if (sortColumn === column) {
      // 切换方向
      onSortChange(sortDirection === 'asc' ? null : column);
    } else {
      // 新列，默认降序
      onSortChange(column);
    }
  };

  // 渲染排序列头
  const renderSortableHeader = (
    column: SortColumn,
    label: string,
    textAlign: 'text-left' | 'text-center' | 'text-right' = 'text-left'
  ) => {
    if (!enableSort) {
      return <th className={`px-6 py-4 font-medium ${textAlign === 'text-center' ? 'text-center' : textAlign === 'text-right' ? 'text-right' : ''}`}>{label}</th>;
    }

    const isActive = sortColumn === column;
    const direction = isActive ? sortDirection : 'desc';

    // 根据对齐方式设置内容位置
    const alignmentClass = textAlign === 'text-center' ? 'justify-center' : textAlign === 'text-right' ? 'justify-end' : 'justify-start';
    const textAlignClass = textAlign === 'text-center' ? 'text-center' : textAlign === 'text-right' ? 'text-right' : '';

    return (
      <th
        className={`px-6 py-4 font-medium ${textAlignClass} cursor-pointer hover:text-txt-main transition-colors select-none group`}
        onClick={() => handleSortClick(column)}
      >
        <div className={`flex items-center ${alignmentClass} gap-1`}>
          {label}
          <span className={`text-txt-muted group-hover:text-txt-main transition-colors ${
            isActive ? 'text-brand' : ''
          }`}>
            {isActive ? (
              direction === 'asc' ? (
                <Icons.ChevronUp size={14} />
              ) : (
                <Icons.ChevronDown size={14} />
              )
            ) : (
              <Icons.ChevronDown size={14} className="opacity-30" />
            )}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-surface1">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface2/50 text-xs uppercase tracking-wider text-txt-secondary">
              {!hideRank && <th className="px-6 py-4 font-medium">{zh.leaderboardTable.columns.rank}</th>}
              {renderSortableHeader('userName', zh.leaderboardTable.columns.traderAddress)}
              {renderSortableHeader('smartScore', zh.leaderboardTable.columns.smartScore)}
              {renderSortableHeader('totalPnl', zh.leaderboardTable.columns.totalPnl, 'text-right')}
              {!hideVolume && <th className="px-6 py-4 font-medium text-right">{zh.leaderboardTable.columns.volume}</th>}
              {renderSortableHeader('roi', zh.leaderboardTable.columns.roi, 'text-right')}
              {!hideWinRate && <th className="px-6 py-4 font-medium">{zh.leaderboardTable.columns.winRate}</th>}
              {!hideMyAction && renderSortableHeader('myAction', zh.leaderboardTable.columns.myAction)}
              {!hideWalletActive && renderSortableHeader('walletActive', zh.leaderboardTable.columns.walletActive)}
              <th className="px-6 py-4 font-medium">{zh.leaderboardTable.columns.tags}</th>
              {!hideLinks && <th className="px-6 py-4 font-medium text-right">{zh.leaderboardTable.columns.links}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {displayData.map((item, index) => {
              // 计算显示用的rank：基于当前排序后的行索引
              const displayRank = startRank + index;
              // 获取用户标注
              const annotation = getAnnotation(item.address);
              const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
                const target = e.target as HTMLElement | null;
                if (shouldIgnoreClick(target)) {
                  return;
                }

                if (isUsingDisplayProfiles) {
                  if (onSelectDisplayProfile) {
                    onSelectDisplayProfile(item);
                  }
                } else {
                  const entry = entries?.[index];
                  if (entry && onSelectTrader) {
                    onSelectTrader(entry);
                  }
                }
              };

              return (
              <tr
                key={item.address}
                className={`group cursor-pointer select-none transition-colors hover:bg-surface2/60 ${
                  item.tags.includes('god_level') || item.tags.includes('sports_whale')
                    ? 'bg-brand-muted/5'
                    : ''
                }`}
                onClick={handleRowClick}
              >
                {/* 排名 */}
                {!hideRank && (
                  <td className="px-6 py-4">
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded font-mono font-bold ${
                        displayRank <= 3 ? 'bg-brand/10 text-brand' : 'text-txt-muted'
                      }`}
                    >
                      {displayRank}
                    </div>
                  </td>
                )}

                {/* 交易者信息 - 使用 UserCard */}
                <td className="px-6 py-4">
                  <UserCard
                    address={item.address}
                    annotation={annotation}
                    profile={item}
                    variant="compact"
                    showAvatar
                    showTwitter
                    showFollow={!hideFollow}
                    showCopy
                    stopPropagation
                  />
                </td>

                {/* Smart Score */}
                <td className="px-6 py-4">
                  <div className="flex justify-center">
                    {item.smartScore != null && item.smartScore > 0 ? (
                      <SmartScoreBadge score={item.smartScore} size="sm" />
                    ) : (
                      <span className="text-xs text-txt-muted">/</span>
                    )}
                  </div>
                </td>

                {/* 总盈亏 */}
                <td className="px-6 py-4 text-right">
                  <span
                    className={`font-mono font-medium tabular-nums ${
                      item.totalPnl >= 0 ? 'text-profit' : 'text-down'
                    }`}
                  >
                    {item.totalPnl > 0 ? '+' : ''}
                    {formatCurrency(item.totalPnl, 0)}
                  </span>
                </td>

                {/* 成交量 */}
                {!hideVolume && (
                  <td className="px-6 py-4 text-right">
                    <span className="font-mono text-sm tabular-nums text-txt-secondary">
                      ${formatNumber(item.totalVolume || 0, 1)}
                    </span>
                  </td>
                )}

                {/* ROI */}
                <td className="px-6 py-4 text-right">
                  <span
                    className={`font-mono font-medium tabular-nums ${
                      item.roi >= 0 ? 'text-profit' : 'text-down'
                    }`}
                  >
                    {item.roi > 0 ? '+' : ''}
                    {item.roi.toFixed(1)}%
                  </span>
                </td>

                {/* 胜率 */}
                {!hideWinRate && (
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {item.winRate == null ? (
                        <span className="w-12 text-right tabular-nums font-mono text-muted-foreground">/</span>
                      ) : (
                        <>
                          <span
                            className={`w-12 text-right tabular-nums ${
                              item.winRate > 80
                                ? 'font-heading font-semibold text-accent drop-shadow-[0_0_5px_rgba(204,255,0,0.3)]'
                                : 'font-mono font-medium text-txt-main'
                            }`}
                          >
                            {item.winRate.toFixed(1)}%
                          </span>
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface2">
                            <div
                              className={`h-full rounded-full shadow-[0_0_10px_rgba(0,240,255,0.4)] ${
                                item.winRate > 80 ? 'bg-accent' : 'bg-brand'
                              }`}
                              style={{ width: `${Math.min(item.winRate, 100)}%` }}
                            ></div>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                )}

                {/* 我的更新 */}
                {!hideMyAction && (
                  <td className="px-6 py-4">
                    <span className="text-xs text-txt-muted tabular-nums">
                      {item.userActionAt ? formatTimeAgoZh(item.userActionAt) : '-'}
                    </span>
                  </td>
                )}

                {/* 钱包活跃 */}
                {!hideWalletActive && (
                  <td className="px-6 py-4">
                    <span className="text-xs text-txt-muted tabular-nums">
                      {formatTimeAgoZh(item.lastActive)}
                    </span>
                  </td>
                )}

                {/* 标签 */}
                <td className="px-6 py-4">
                  <TagEditor
                    systemTags={item.tags}
                    userTags={annotation?.customTags ?? []}
                    onAddTag={(tag) => addCustomTag(item.address, tag)}
                    onRemoveTag={(tag) => removeCustomTag(item.address, tag)}
                  />
                </td>

                {/* 平台链接 */}
                {!hideLinks && (
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {item.opinionLink && (
                        <a
                          href={item.opinionLink}
                          className="rounded p-1.5 text-txt-muted transition-colors hover:bg-surface2 hover:text-brand"
                          target="_blank"
                          rel="noopener noreferrer"
                          title={zh.leaderboardTable.viewOpinion}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <img src="/images/op-logo.png" alt="Opinion" className="h-4 w-4 object-contain" />
                        </a>
                      )}
                    </div>
                  </td>
                )}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 分页/底部
      <div className="flex items-center justify-between border-t border-border px-6 py-4">
        <span className="text-xs text-txt-muted">
          {zh.leaderboardTable.footer(entries.length)}
        </span>
        <div className="flex gap-2">
          <button
            className="rounded border border-border px-3 py-1 text-xs text-txt-secondary hover:border-brand hover:text-brand disabled:opacity-50"
            disabled
          >
            {zh.common.previous}
          </button>
          <button className="rounded border border-border px-3 py-1 text-xs text-txt-secondary hover:border-brand hover:text-brand">
            {zh.common.next}
          </button>
        </div>
      </div> */}
    </div>
  );
};

export default SmartMoneyTable;
