/**
 * SignalTable Component
 *
 * Compact table view for signals with:
 * - Sortable columns (time, smartScore)
 * - Row hover effects
 * - Action buttons
 * - Responsive design
 * - Address display with avatar and username
 */

import { useState, useMemo } from 'react';
import type { Signal } from '@/types';
import { Icons } from '@/components/ui/icons';
import { SmartScoreBadge } from '@/components/smart-score-badge';
import { UserCard } from '@/components/ui/user-card';
import type { UserCardProfile } from '@/components/ui/user-card';
import { zh } from '@/lib/translations';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { getSignalTypeBadgeColor } from './signal-utils';
import type { AddressAnnotation } from '@/types/user';
import { getOpinionMarketUrl } from '@/lib/api-constants';

interface SignalTableProps {
  signals: Signal[];
  bookmarkedSignals?: string[];
  onBookmark?: (signalId: string) => void;
  onMute?: (address: string) => void;
  onShare?: (signalId: string) => void;
  onAddressClick?: (address: string) => void;
  profiles?: Map<string, { userName?: string; avatarUrl?: string; twitterHandle?: string; twitterUrl?: string }>;
  annotations?: Map<string, AddressAnnotation>;
}

type SortField = 'time' | 'smartScore';
type SortDirection = 'asc' | 'desc';

export function SignalTable({
  signals,
  bookmarkedSignals = [],
  onBookmark,
  onMute,
  onShare,
  onAddressClick,
  profiles,
  annotations,
}: SignalTableProps) {
  const [sortField, setSortField] = useState<SortField>('time');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Mark unused props as intentionally unused
  void onMute;
  void onShare;
  void onBookmark;

  // Handle column sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Sort signals (using spread to avoid mutating original array)
  const sortedSignals = useMemo(() => {
    return [...signals].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'time') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortField === 'smartScore') {
        const scoreA = a.smartScore ?? 0;
        const scoreB = b.smartScore ?? 0;
        comparison = scoreA - scoreB;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [signals, sortField, sortDirection]);

  if (signals.length === 0) {
    return (
      <div className="text-center py-12 text-txt-muted">
        {zh.signalFeed.empty}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        {/* Table Header */}
        <thead className="sticky top-0 z-10 bg-surface1 border-b border-border text-xs uppercase text-txt-secondary font-medium">
          <tr>
            {/* Time */}
            <th className="px-4 py-3 whitespace-nowrap">
              <button
                onClick={() => handleSort('time')}
                className="flex items-center gap-1 hover:text-txt-main transition-colors"
              >
                {zh.signalsPage.table.columns.time}
                {sortField === 'time' && (
                  sortDirection === 'asc' ? <Icons.ChevronUp size={12} /> : <Icons.ChevronDown size={12} />
                )}
              </button>
            </th>
            {/* Type */}
            <th className="px-4 py-3">{zh.signalsPage.table.columns.type}</th>
            {/* Market */}
            <th className="px-4 py-3">{zh.signalsPage.table.columns.market}</th>
            {/* Addresses */}
            <th className="px-4 py-3">{zh.signalsPage.table.columns.addresses}</th>
            {/* SmartScore */}
            <th className="px-4 py-3 text-right">
              <button
                onClick={() => handleSort('smartScore')}
                className="flex items-center gap-1 ml-auto hover:text-txt-main transition-colors"
              >
                {zh.signalsPage.table.columns.smartScore || '评分'}
                {sortField === 'smartScore' && (
                  sortDirection === 'asc' ? <Icons.ChevronUp size={12} /> : <Icons.ChevronDown size={12} />
                )}
              </button>
            </th>
            {/* Actions */}
            <th className="px-4 py-3 text-right">{zh.signalsPage.table.columns.actions}</th>
          </tr>
        </thead>

        {/* Table Body - each signal has its own tbody */}
          {sortedSignals.map((signal) => {
            const isExpanded = expandedRow === signal.id;
            const isBookmarked = bookmarkedSignals.includes(signal.id);
            void isBookmarked; // Currently unused - bookmark UI is commented out

            return (
              <tbody key={signal.id} className="divide-y divide-border">
                {/* Main Row */}
                <tr
                  className="group hover:bg-surface2/40 transition-colors cursor-pointer"
                  onClick={() => setExpandedRow(isExpanded ? null : signal.id)}
                >
                  {/* Time */}
                  <td className="px-4 py-4 text-txt-secondary font-mono text-xs whitespace-nowrap">
                    {formatDistanceToNow(new Date(signal.createdAt), {
                      addSuffix: true,
                      locale: zhCN,
                    })}
                  </td>

                  {/* Type */}
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium border ${getSignalTypeBadgeColor(signal.type)}`}
                    >
                      {zh.signalFeed.types[signal.type]}
                    </span>
                  </td>

                  {/* Market */}
                  <td className="px-4 py-4">
                    <div className="max-w-xs truncate text-txt-main font-medium">
                      {signal.market.title}
                    </div>
                  </td>

                  {/* Addresses */}
                  <td className="px-4 py-4">
                    <div className="flex gap-2 flex-wrap">
                      {signal.addresses.slice(0, 2).map((addr) => {
                        const profileData = profiles?.get(addr.toLowerCase());
                        const annotation = annotations?.get(addr.toLowerCase());
                        const userCardProfile: UserCardProfile | undefined = profileData ? {
                          address: addr as any,
                          userName: profileData.userName,
                          avatarUrl: profileData.avatarUrl,
                          twitterHandle: profileData.twitterHandle,
                        } : undefined;

                        return (
                          <UserCard
                            key={addr}
                            address={addr as any}
                            annotation={annotation ?? undefined}
                            profile={userCardProfile}
                            variant="compact"
                            size="sm"
                            showTwitter={false}
                            showFollow={false}
                            showOriginalName={false}
                            onAddressClick={onAddressClick}
                            stopPropagation={true}
                          />
                        );
                      })}
                      {signal.addresses.length > 2 && (
                        <span className="inline-flex items-center rounded bg-surface2 px-1.5 py-0.5 text-[10px] text-txt-muted">
                          +{signal.addresses.length - 2}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* SmartScore */}
                  <td className="px-4 py-4 text-right">
                    {signal.smartScore !== null ? (
                      <SmartScoreBadge score={signal.smartScore} size="sm" />
                    ) : (
                      <span className="text-txt-muted text-xs">N/A</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {/* View on Opinion */}
                      {(signal.metadata.marketId as number | undefined) ? (
                        <a
                          href={getOpinionMarketUrl(
                            signal.metadata.marketId as number,
                            signal.metadata.rootMarketId as number | undefined
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center justify-center p-1.5 rounded text-txt-muted hover:text-brand hover:bg-brand/10 transition-colors"
                          title="View on Opinion"
                        >
                          <Icons.ExternalLink size={12} />
                        </a>
                      ) : null}
                      {/* <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onBookmark?.(signal.id);
                        }}
                        className={`transition-colors ${
                          isBookmarked ? 'text-brand' : 'text-txt-muted hover:text-brand'
                        }`}
                        title={zh.signalsPage.actions.bookmark}
                      >
                        <Icons.Bookmark size={14} fill={isBookmarked ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onShare?.(signal.id);
                        }}
                        className="text-txt-muted hover:text-brand transition-colors"
                        title={zh.signalsPage.actions.share}
                      >
                        <Icons.Share size={14} />
                      </button> */}
                    </div>
                  </td>
                </tr>

                {/* Expanded Row */}
                {isExpanded && (
                  <tr className="bg-surface2/20">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="space-y-2 text-sm">
                        <div className="font-medium text-txt-main">描述</div>
                        <p className="text-txt-secondary">{signal.description}</p>
                        {signal.metadata && Object.keys(signal.metadata).length > 0 && (
                          <>
                            <div className="font-medium text-txt-main mt-3">详细信息</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {Object.entries(signal.metadata).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                  <span className="text-txt-muted">{key}:</span>
                                  <span className="text-txt-secondary font-mono">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            );
          })}
        </table>
    </div>
  );
}
