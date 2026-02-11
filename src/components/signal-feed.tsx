/**
 * Signal Feed Component
 *
 * Displays signals using enhanced card component with rich interactions
 */

import type { Signal } from '@/types';
import { SignalCardEnhanced } from '@/components/signals/signal-card-enhanced';
import { zh } from '@/lib/translations';

interface SignalFeedProps {
  signals: Signal[];
  bookmarkedSignals?: string[];
  onBookmark?: (signalId: string) => void;
  onMute?: (address: string) => void;
  onShare?: (signalId: string) => void;
  onAddressClick?: (address: string) => void;
  profiles?: Map<string, { userName?: string; avatarUrl?: string }>;
}

export function SignalFeed({
  signals,
  bookmarkedSignals = [],
  onBookmark,
  onMute,
  onShare,
  onAddressClick,
  profiles,
}: SignalFeedProps) {
  if (signals.length === 0) {
    return (
      <div className="text-center py-12 text-txt-muted">
        {zh.signalFeed.empty}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1">
      {signals.map((signal) => (
        <SignalCardEnhanced
          key={signal.id}
          signal={signal}
          isBookmarked={bookmarkedSignals.includes(signal.id)}
          onBookmark={onBookmark}
          onMute={onMute}
          onShare={onShare}
          onAddressClick={onAddressClick}
          profiles={profiles}
        />
      ))}
    </div>
  );
}
