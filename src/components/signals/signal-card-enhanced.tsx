/**
 * SignalCardEnhanced Component
 *
 * Enhanced signal card with:
 * - Market thumbnail image
 * - Expand/collapse for metadata details
 * - Action buttons (bookmark, mute, share)
 * - SmartScore badge display
 * - Clickable address chips with avatar and username
 */

import { useState } from 'react';
import type { Signal } from '@/types';
import { Icons } from '@/components/ui/icons';
import { SmartScoreBadge } from '@/components/smart-score-badge';
import { UserCard } from '@/components/ui/user-card';
import { zh } from '@/lib/translations';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useUserData } from '@/hooks/use-user-data';
import { getSignalTypeBadgeColor } from './signal-utils';
import { getOpinionMarketUrl } from '@/lib/api-constants';

interface SignalCardEnhancedProps {
  signal: Signal;
  onBookmark?: (signalId: string) => void;
  onMute?: (address: string) => void;
  onShare?: (signalId: string) => void;
  onAddressClick?: (address: string) => void;
  isBookmarked?: boolean;
  profiles?: Map<string, { userName?: string; avatarUrl?: string }>;
}

export function SignalCardEnhanced({
  signal,
  onBookmark,
  onMute,
  onShare,
  onAddressClick,
  isBookmarked = false,
  profiles = new Map(),
}: SignalCardEnhancedProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get user data for annotations
  const { getAnnotation } = useUserData();

  // Mark unused props as intentionally unused
  void onBookmark;
  void onMute;
  void onShare;
  void isBookmarked;

  // Format timestamp
  const timeAgo = formatDistanceToNow(new Date(signal.createdAt), {
    addSuffix: true,
    locale: zhCN,
  });

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-surface1 transition-all hover:border-brand/30 hover:bg-surface2/60">
      {/* Market Thumbnail (if available) */}
      {signal.market.imageUrl && (
        <div className="h-32 w-full overflow-hidden bg-surface2">
          <img
            src={signal.market.imageUrl}
            alt={signal.market.title}
            className="h-full w-full object-cover opacity-60 transition-opacity group-hover:opacity-80"
          />
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Header: Type Badge + Timestamp */}
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium border ${getSignalTypeBadgeColor(signal.type)}`}
          >
            {zh.signalFeed.types[signal.type]}
          </span>
          <span className="flex items-center gap-1 text-xs text-txt-muted">
            <Icons.Clock size={12} />
            {timeAgo}
          </span>
        </div>

        {/* Market Title */}
        <div>
          <h3 className="font-semibold text-txt-main line-clamp-2 hover:text-brand transition-colors cursor-pointer">
            {signal.market.title}
          </h3>
        </div>

        {/* Description */}
        <p className="text-sm text-txt-secondary line-clamp-2">{signal.description}</p>

        {/* SmartScore Indicator */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-txt-muted">SmartScore</span>
          {signal.smartScore !== null ? (
            <SmartScoreBadge score={signal.smartScore} size="sm" />
          ) : (
            <span className="text-txt-muted text-xs">N/A</span>
          )}
        </div>

        {/* Addresses */}
        {signal.addresses.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {signal.addresses.slice(0, 3).map((addr) => (
              <UserCard
                key={addr}
                address={addr}
                annotation={getAnnotation(addr)}
                profile={profiles?.get(addr.toLowerCase())}
                variant="compact"
                showAvatar
                onAddressClick={onAddressClick}
              />
            ))}
            {signal.addresses.length > 3 && (
              <span className="inline-flex items-center rounded bg-surface2 px-2 py-1 text-xs text-txt-muted">
                {zh.signalFeed.more(signal.addresses.length - 3)}
              </span>
            )}
          </div>
        )}

        {/* Expanded Metadata */}
        {isExpanded && signal.metadata && Object.keys(signal.metadata).length > 0 && (
          <div className="space-y-2 rounded border border-border bg-base/50 p-3 text-xs">
            <div className="font-medium text-txt-secondary">详细信息</div>
            <div className="space-y-1">
              {Object.entries(signal.metadata).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-txt-muted">{key}:</span>
                  <span className="text-txt-secondary font-mono">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-3">
            {/* View on Opinion */}
            {(signal.metadata.marketId as number | undefined) && (
              <a
                href={getOpinionMarketUrl(
                  signal.metadata.marketId as number,
                  signal.metadata.rootMarketId as number | undefined
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-brand hover:bg-brand/10 transition-colors"
                title="View on Opinion"
              >
                <Icons.ExternalLink size={12} />
                <span>View on Opinion</span>
              </a>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-xs text-txt-muted hover:text-brand transition-colors"
            >
              {isExpanded ? (
                <>
                  <Icons.ChevronUp size={14} />
                  <span>{zh.signalsPage.actions.collapse}</span>
                </>
              ) : (
                <>
                  <Icons.ChevronDown size={14} />
                  <span>{zh.signalsPage.actions.expand}</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Bookmark */}
            {/* <button
              onClick={() => onBookmark?.(signal.id)}
              className={`transition-colors ${
                isBookmarked
                  ? 'text-brand'
                  : 'text-txt-muted hover:text-brand'
              }`}
              title={zh.signalsPage.actions.bookmark}
            >
              <Icons.Bookmark size={16} fill={isBookmarked ? 'currentColor' : 'none'} />
            </button> */}

            {/* Mute */}
            {/* {signal.addresses.length > 0 && (
              <button
                onClick={() => onMute?.(signal.addresses[0])}
                className="text-txt-muted hover:text-down transition-colors"
                title={zh.signalsPage.actions.mute}
              >
                <Icons.Volume2 size={16} />
              </button>
            )} */}

            {/* Share */}
            {/* <button
              onClick={() => onShare?.(signal.id)}
              className="text-txt-muted hover:text-brand transition-colors"
              title={zh.signalsPage.actions.share}
            >
              <Icons.Share size={16} />
            </button> */}
          </div>
        </div>
      </div>
    </div>
  );
}
