/**
 * Address Profile Card Component
 */

import type { AddressProfile } from '@/types';
import { formatAddress, formatNumber, formatPercentage, formatCurrency } from '@/lib/utils';
import { SmartScoreBadge } from './smart-score-badge';

interface AddressProfileCardProps {
  profile: AddressProfile;
}

export function AddressProfileCard({ profile }: AddressProfileCardProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono">{formatAddress(profile.address, 8)}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Platform: {profile.platform} | Last active:{' '}
            {new Date(profile.lastActiveAt).toLocaleDateString()}
          </p>
        </div>
        {profile.smartScore != null && <SmartScoreBadge score={profile.smartScore} size="lg" />}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Total PnL</div>
          <div
            className={`text-2xl font-bold ${profile.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            {profile.totalPnl >= 0 ? '+' : ''}
            {formatCurrency(profile.totalPnl)}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">ROI</div>
          <div
            className={`text-2xl font-bold ${profile.totalRoi >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            {profile.totalRoi >= 0 ? '+' : ''}
            {formatPercentage(profile.totalRoi)}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Win Rate</div>
          <div className="text-2xl font-bold">
            {profile.winRate != null ? formatPercentage(profile.winRate) : '/'}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Smart Score</div>
          <div className="text-2xl font-bold">
            {profile.smartScore != null ? profile.smartScore.toFixed(1) : '/'}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium mb-3">Statistics</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Volume</span>
              <span>{formatCurrency(profile.totalVolume)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Trade Count</span>
              <span>{formatNumber(profile.tradeCount, 0)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium mb-3">Tags</div>
          <div className="flex flex-wrap gap-2">
            {profile.tags.length > 0 ? (
              profile.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                >
                  {tag.replace(/_/g, ' ')}
                </span>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No tags</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
