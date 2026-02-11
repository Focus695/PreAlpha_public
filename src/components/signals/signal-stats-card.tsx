/**
 * SignalStatsCard Component
 *
 * Displays real-time statistics for signals:
 * - Total signals today
 * - Average signal strength
 * - High strength signal count (>= 70)
 * - Followed signals count
 */

import type { SignalStats } from '@/types/signals';
import StatCard from '@/components/ui/stat-card';
import { zh } from '@/lib/translations';

interface SignalStatsCardProps {
  stats: SignalStats;
}

export function SignalStatsCard({ stats }: SignalStatsCardProps) {
  return (
    <div className="space-y-3">
      <div className="px-4 pt-4">
        <h3 className="text-sm font-bold text-txt-main">
          {zh.signalsPage.rightColumn.statsTitle}
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4">
        <StatCard
          label={zh.signalsPage.stats.totalToday}
          value={stats.totalToday.toString()}
        />
        <StatCard
          label={zh.signalsPage.stats.avgSmartScore || '平均评分'}
          value={stats.avgSmartScore.toFixed(1)}
        />
        <StatCard
          label={zh.signalsPage.stats.highScoreCount || '高分信号'}
          value={stats.highScoreCount.toString()}
        />
        <StatCard
          label={zh.signalsPage.stats.followedCount}
          value={stats.followedCount.toString()}
        />
      </div>
    </div>
  );
}
