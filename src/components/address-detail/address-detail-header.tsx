/**
 * AddressDetailHeader Component
 *
 * Header section for address detail page with navigation, address info, and actions.
 */

import { Icons } from '@/components/ui/icons';
import { UserCard } from '@/components/ui/user-card';
import { useUserData } from '@/hooks/use-user-data';
import type { DisplayProfile } from '@/lib/transformers';
import type { DataSourceMeta } from '@/lib/address-profile-utils';
import { SOURCE_LABELS, SOURCE_STYLES } from '@/lib/address-profile-utils';
import { zh } from '@/lib/translations';

interface AddressDetailHeaderProps {
  displayData: DisplayProfile & {
    userName?: string;
    avatarUrl?: string;
    netWorth?: number;
    follower?: number;
    following?: number;
    followed?: boolean;
    labels?: string[];
  };
  profileSourceMeta: DataSourceMeta;
  isLoading?: boolean;
  onBack: () => void;
}

export function DataSourceBadge({ meta }: { meta: DataSourceMeta }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SOURCE_STYLES[meta.source]}`}
    >
      {SOURCE_LABELS[meta.source]}
    </span>
  );
}

export function AddressDetailHeader({
  displayData,
  profileSourceMeta,
  isLoading,
  onBack,
}: AddressDetailHeaderProps) {
  // 用户数据 hook (用于获取备注信息)
  const { getAnnotation } = useUserData();

  // Mark as intentionally used - may be needed for future data source display
  void profileSourceMeta;

  return (
    <div className="flex flex-col gap-4">
      {/* 顶部导航行：返回按钮 */}
      <div className="flex items-center justify-between py-2">
        <button
          onClick={onBack}
          className="rounded-lg p-2 text-txt-muted transition-colors hover:bg-surface2 hover:text-txt-main"
          aria-label={zh.addressDetailPage.backAria}
        >
          <Icons.ArrowLeft size={20} />
        </button>
        {isLoading && (
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase text-txt-secondary">
            {zh.addressDetailPage.syncing}
          </span>
        )}
      </div>

      {/* 用户信息卡片 */}
      <UserCard
        address={displayData.address}
        annotation={getAnnotation(displayData.address)}
        profile={displayData}
        variant="default"
        showAvatar
        showTwitter
        showFollow
        showLastActive
        showLiveBadge
        largeFollowButton
        lastActive={displayData.lastActive}
        size="lg"
      />
    </div>
  );
}
