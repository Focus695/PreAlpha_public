/**
 * Address Detail Page
 *
 * Full-page view of a trader's profile with detailed analysis.
 * Replaces the modal-based approach with a dedicated route.
 */

import { useMemo, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { logger } from '@/lib/logger';
import type { AddressProfile } from '@/types';
import { useAddressProfile } from '@/hooks/use-address-profile';
import { useUserData } from '@/hooks/use-user-data';
import { useVolumeDistribution } from '@/hooks/use-volume-distribution';
import { Icons } from '@/components/ui/icons';
import { formatCurrency } from '@/lib/utils';
import { addressProfileToDisplayProfile } from '@/lib/transformers';
import {
  normalizeProfile,
  type DataSourceMeta,
} from '@/lib/address-profile-utils';
import {
  AddressDetailHeader,
  ProfitDistributionCard,
  HoldingsTable,
} from '@/components/address-detail';
import { zh } from '@/lib/translations';

export function AddressDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // 实际交易总数（来自交易历史 API）
  const [actualTradesTotal, setActualTradesTotal] = useState<number | undefined>(undefined);

  const {
    data,
    extraFields,
    isLoading,
    isError,
    error,
    refetch,
  } = useAddressProfile(id ?? '');

  // Get user annotations (custom tags)
  const { getAnnotation } = useUserData();

  // Get user custom tags for the current address
  const userAnnotation = id ? getAnnotation(id as any) : null;
  const userCustomTags = userAnnotation?.customTags ?? [];

  // Use profile from API
  const profile = useMemo<AddressProfile | null>(() => {
    const baseProfile = data?.data ?? null;
    if (!baseProfile) return null;

    // If we have extra fields, update userName if provided
    if (extraFields?.userName && extraFields.userName !== baseProfile.userName) {
      return {
        ...baseProfile,
        userName: extraFields.userName,
      };
    }

    return baseProfile;
  }, [data?.data, extraFields]);

  const normalizedProfile = useMemo(() => normalizeProfile(profile), [profile]);

  // Extra data from API that doesn't fit in AddressProfile type
  const extraProfileData = useMemo(() => ({
    userName: extraFields?.userName,
    avatarUrl: extraFields?.avatarUrl,
    netWorth: extraFields?.netWorth,
    follower: extraFields?.follower ?? 0,
    following: extraFields?.following ?? 0,
    followed: extraFields?.followed ?? false,
  }), [extraFields]);

  // Enhanced display data with Opinion API fields
  const displayData = useMemo(() => {
    if (!profile) return null;
    
    const baseDisplay = addressProfileToDisplayProfile(profile);
    
    return {
      ...baseDisplay,
      ...extraProfileData,
    };
  }, [profile, extraProfileData]);

  const profileSourceMeta = useMemo<DataSourceMeta>(() => {
    const timestamp = normalizedProfile?.updatedAt?.toISOString?.() ?? new Date().toISOString();

    if (data?.success && data.data) {
      return {
        source: 'api',
        timestamp,
      };
    }

    return {
      source: 'mock',
      reason: isError ? (error as Error)?.message : 'profile:not-available',
      timestamp,
    };
  }, [data, normalizedProfile, isError, error]);

  useEffect(() => {
    if (isError && id) {
      // Only log if it's not a 404 error (404 is expected when address not in API database)
      const status = (error as any)?.status;
      if (status !== 404) {
        logger.warn(`[AddressDetailPage] Failed to load profile for ${id}`, error);
      }
    }
  }, [isError, error, id]);

  const handleBack = () => {
    navigate('/');
  };

  // Loading state: 等待 API profile 数据加载
  const isPageLoading = isLoading && !profile;

  if (isPageLoading) {
    return (
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-10">
        <div className="animate-pulse space-y-6">
          {/* Header skeleton */}
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-surface2" />
            <div className="flex-1 space-y-2">
              <div className="h-6 w-48 rounded bg-surface2" />
              <div className="h-4 w-96 rounded bg-surface2" />
            </div>
          </div>
          {/* Stats skeleton */}
          <div className="grid gap-6 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-xl bg-surface2" />
            ))}
          </div>
          {/* Table skeleton */}
          <div className="h-64 rounded-xl bg-surface2" />
        </div>
      </div>
    );
  }

  // Error state: API 加载完成但没有 profile 数据
  if (!isLoading && !profile) {
    return (
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-10">
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface1 py-16">
          <Icons.AlertTriangle size={48} className="mb-4 text-loss" />
          <h2 className="mb-2 text-xl font-bold text-txt-main">{zh.addressDetailPage.errorTitle}</h2>
          <p className="mb-6 text-txt-muted">
            {isError ? `错误：${(error as Error)?.message}` : zh.addressDetailPage.errorFallback}
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleBack}
              className="rounded-lg border border-border bg-surface2 px-4 py-2 text-sm font-medium text-txt-main hover:bg-surface1"
            >
              {zh.addressDetailPage.backToSmartMoney}
            </button>
            <button
              onClick={() => refetch()}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-black hover:bg-brand/90"
            >
              {zh.addressDetailPage.retry}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!displayData || !profile) {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 pb-16 pt-10">
      {/* Header */}
      <AddressDetailHeader
        displayData={displayData}
        profileSourceMeta={profileSourceMeta}
        isLoading={isLoading}
        onBack={handleBack}
      />

      {/* Top Grid: Stats & Analysis */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* 1. Main Stats (PnL & Win Rate) */}
        <MainStatsCard profile={profile} displayData={displayData} />

        {/* 2. Detailed Analysis Table */}
        <AnalysisCard profile={profile} displayData={displayData} actualTradesTotal={actualTradesTotal} />

        {/* 3. Profit Distribution */}
        <ProfitDistributionCard profile={profile} />
      </div>

      {/* Middle Row: Risk & Sectors */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <LabelCard profile={profile} userCustomTags={userCustomTags} />
        <SectorAllocationCard address={id} />
      </div>

      {/* Bottom Table: Holdings */}
      <div className="mt-8">
        <HoldingsTable profile={profile} onTradesTotalChange={setActualTradesTotal} />
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components (inline to keep related code together)
// ============================================================================

interface CardProps {
  profile: AddressProfile;
  displayData?: ReturnType<typeof addressProfileToDisplayProfile> & {
    avatarUrl?: string;
    netWorth?: number;
    follower?: number;
    following?: number;
    followed?: boolean;
    labels?: string[];
  };
  userCustomTags?: string[];
  actualTradesTotal?: number;
}

function MainStatsCard({ profile }: CardProps) {
  // Use ROI from API (already calculated by backend)
  const roi = profile.totalRoi * 100;

  return (
    <div className="rounded-xl border border-border bg-surface1 p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-txt-muted">{zh.addressDetailPage.mainStats}</span>
        <span className="rounded bg-surface2 px-2 py-1 text-xs text-txt-secondary">USD</span>
      </div>
      <div
        className={`font-mono text-4xl font-bold tracking-tight ${
          profile.totalPnl >= 0 ? 'text-profit' : 'text-down'
        }`}
      >
        {profile.totalPnl > 0 ? '+' : ''}
        {formatCurrency(profile.totalPnl, 0)}
      </div>
      <div
        className={`mt-1 text-xs ${
          profile.totalPnl >= 0 ? 'text-profit/70' : 'text-down/70'
        }`}
      >
      </div>

      <div className="my-6 h-px w-full bg-border"></div>

      <div className="flex items-end justify-between">
        <div>
          <span className="text-xs uppercase text-txt-muted">{zh.addressDetailPage.winRate}</span>
          <div className="mt-1 text-2xl font-bold text-txt-main">
            {profile.winRate == null ? '/' : `${(profile.winRate * 100).toFixed(1)}%`}
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs uppercase text-txt-muted">ROI</span>
          <div className={`mt-1 font-mono text-xl font-bold ${
            roi >= 0 ? 'text-profit' : 'text-down'
          }`}>
            {roi > 0 ? '+' : ''}{roi.toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalysisCard({ profile, displayData, actualTradesTotal }: CardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface1 p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-txt-main">
        <Icons.Activity size={16} className="text-brand" /> {zh.addressDetailPage.analysis}
      </h3>
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-txt-muted">总成交量</span>
          <span className="font-mono text-txt-main">{formatCurrency(profile.totalVolume, 0)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-txt-muted">净资产</span>
          <span className="font-mono text-txt-main">
            {displayData?.netWorth !== undefined
              ? formatCurrency(displayData.netWorth, 2)
              : '/'}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-txt-muted">{zh.smartMoneyPage.sortOptions.smart_score}</span>
          <span className="font-mono font-bold text-brand">
            {profile.smartScore == null ? '/' : profile.smartScore.toFixed(1)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-txt-muted">{zh.addressDetailPage.trades}</span>
          <span className="font-mono text-txt-main">
            {actualTradesTotal !== undefined ? actualTradesTotal : (profile.tradeCount || '/')}
          </span>
        </div>
      </div>
    </div>
  );
}

function LabelCard({ profile, userCustomTags = [] }: CardProps) {
  const { addCustomTag, removeCustomTag } = useUserData();
  const [newTag, setNewTag] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Get system labels from API (system_tags from /smart-wallets/{address})
  const systemLabels = profile.tags ?? [];
  const address = profile.address;

  const handleAddTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !userCustomTags.includes(trimmed.toLowerCase())) {
      addCustomTag(address as any, trimmed);
      setNewTag('');
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTag();
    } else if (e.key === 'Escape') {
      setNewTag('');
      setIsAdding(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface1 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-txt-main">
          <Icons.Tag size={16} className="text-brand" /> 标签
        </h3>
        {!isAdding ? (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-brand hover:bg-brand/10 transition-colors"
          >
            <Icons.Plus size={14} />
            <span>添加</span>
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {isAdding && (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入标签..."
              className="w-24 rounded border border-border bg-surface2 px-2 py-1 text-xs text-txt-main placeholder:text-txt-muted focus:border-brand focus:outline-none"
              autoFocus
            />
            <button
              onClick={handleAddTag}
              className="rounded bg-brand/10 p-1 text-brand hover:bg-brand/20"
            >
              <Icons.Check size={14} />
            </button>
            <button
              onClick={() => {
                setNewTag('');
                setIsAdding(false);
              }}
              className="rounded bg-surface2 p-1 text-txt-muted hover:text-txt-main"
            >
              <Icons.X size={14} />
            </button>
          </div>
        )}
        {systemLabels.length > 0 || userCustomTags.length > 0 ? (
          <>
            {/* System labels from API */}
            {systemLabels.map((label) => (
              <span
                key={`system-${label}`}
                className="rounded border border-border bg-surface2 px-2 py-1 text-xs font-medium text-txt-secondary"
              >
                {label.replace('_', ' ').toUpperCase()}
              </span>
            ))}
            {/* User custom tags */}
            {userCustomTags.map((tag) => (
              <span
                key={`user-${tag}`}
                className="flex items-center gap-1 rounded border border-brand/40 bg-brand/10 px-2 py-1 text-xs font-medium text-brand"
              >
                {tag.toUpperCase()}
                <button
                  onClick={() => removeCustomTag(address as any, tag)}
                  className="hover:text-brand/70"
                >
                  <Icons.X size={12} />
                </button>
              </span>
            ))}
          </>
        ) : (
          <span className="text-sm text-txt-muted">暂无标签</span>
        )}
      </div>
    </div>
  );
}

function SectorAllocationCard({ address }: { address: string | undefined }) {
  const { volumeDistribution, isLoading } = useVolumeDistribution(address);

  // 计算总交易量
  const totalVolume = volumeDistribution.reduce((sum, item) => sum + item.volume, 0);

  // 按交易量排序（降序）
  const sortedDistribution = [...volumeDistribution].sort((a, b) => b.volume - a.volume);

  return (
    <div className="rounded-xl border border-border bg-surface1 p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-txt-main">
        <Icons.BarChart2 size={16} className="text-txt-muted" /> {zh.addressDetailPage.sectorAllocation}
      </h3>
      <div className="flex justify-between border-b border-border pb-2 text-xs text-txt-muted">
        <span>{zh.addressDetailPage.sectorHeader}</span>
        <span>交易量</span>
      </div>
      <div className="mt-2 space-y-2 text-sm">
        {isLoading ? (
          <div className="py-2 text-center text-txt-muted">加载中...</div>
        ) : sortedDistribution.length > 0 ? (
          sortedDistribution.map((item) => {
            const percentage = totalVolume > 0 ? (item.volume / totalVolume) * 100 : 0;
            return (
              <div key={`${item.labelId}-${item.label}`} className="flex justify-between">
                <span className="capitalize text-txt-main">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-txt-main">
                    {formatCurrency(item.volume, 0)}
                  </span>
                  <span className="font-mono text-xs text-txt-muted">
                    ({percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-2 text-center text-txt-muted">{zh.addressDetailPage.noSpecialization}</div>
        )}
      </div>
    </div>
  );
}
