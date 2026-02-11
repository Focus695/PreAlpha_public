/**
 * ProfitDistributionCard Component
 *
 * Displays profit distribution breakdown with bar visualization.
 */

import { useMemo } from 'react';
import type { AddressProfile } from '@/types';
import { Icons } from '@/components/ui/icons';
import {
  resolveProfitDistribution,
  PROFIT_SEGMENT_BAR_CLASSES,
  normalizeProfile,
} from '@/lib/address-profile-utils';
import { DataSourceBadge } from './address-detail-header';
import { zh } from '@/lib/translations';

interface ProfitDistributionCardProps {
  profile: AddressProfile;
}

export function ProfitDistributionCard({ profile }: ProfitDistributionCardProps) {
  const normalizedProfile = useMemo(() => normalizeProfile(profile), [profile]);
  const profitDistribution = useMemo(
    () => resolveProfitDistribution(normalizedProfile),
    [normalizedProfile]
  );

  return (
    <div className="rounded-xl border border-border bg-surface1 p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-txt-main">
          <Icons.PieChart size={16} className="text-accent" /> {zh.addressDetailPage.profitDistribution ?? '盈亏分布'}
        </h3>
        <DataSourceBadge meta={profitDistribution.meta} />
      </div>

      <div className="space-y-4">
        {/* Segment labels */}
        <div className="space-y-1.5">
          {profitDistribution.segments.map((segment) => (
            <div key={segment.key} className="flex justify-between text-xs">
              <span className="flex items-center gap-2 text-txt-secondary">
                <span className={`h-2 w-2 rounded-full ${segment.indicatorClass}`}></span>
                {segment.label}
              </span>
              <span className="font-mono text-txt-main">计算中...</span>
            </div>
          ))}
        </div>

        {/* Bar Visualization */}
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-surface2">
          {profitDistribution.segments.map((segment) => (
            <div
              key={`${segment.key}-bar`}
              className={`h-full ${PROFIT_SEGMENT_BAR_CLASSES[segment.key]}`}
              style={{ width: `${segment.value}%` }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}
