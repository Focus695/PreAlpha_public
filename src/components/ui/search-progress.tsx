/**
 * Search Progress Indicator Component
 *
 * Displays loading progress during wallet search
 */

import { Icons } from './icons';

export interface SearchProgressProps {
  /** Progress information */
  progress: {
    loadedPages: number;
    loadedWallets: number;
    totalWallets: number;
    percentage: number;
    foundMatches: number;
  };
  /** Whether the indicator is visible */
  isVisible: boolean;
  /** Optional custom message */
  message?: string;
}

export function SearchProgress({
  progress,
  isVisible,
  message,
}: SearchProgressProps) {
  if (!isVisible) return null;

  return (
    <div className="flex items-center gap-3 px-6 py-3 border-t border-border/50 bg-surface1/30">
      {/* Spinner */}
      <Icons.Loader2 className="h-4 w-4 animate-spin text-brand" />

      {/* Progress text */}
      <span className="text-xs text-txt-muted">
        {message || `正在加载 ${progress.loadedWallets} / ${progress.totalWallets} 位交易者`}
      </span>

      {/* Found matches indicator */}
      {progress.foundMatches > 0 && (
        <span className="text-xs text-brand font-medium">
          ({progress.foundMatches} 个结果)
        </span>
      )}

      {/* Progress bar */}
      <div className="flex-1 h-1.5 max-w-[120px] rounded-full bg-surface2 overflow-hidden">
        <div
          className="h-full bg-brand transition-all duration-300 ease-out"
          style={{ width: `${Math.min(progress.percentage, 100)}%` }}
        />
      </div>

      {/* Percentage */}
      <span className="text-[10px] text-txt-muted font-mono">
        {Math.min(progress.percentage, 100)}%
      </span>
    </div>
  );
}
