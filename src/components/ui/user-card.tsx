/**
 * UserCard Component
 *
 * 统一的用户信息卡片组件，支持两种样式：
 * - compact: 单行紧凑布局，不显示地址
 * - default: 双行布局，包含地址和复制按钮
 *
 * 功能：
 * - 头像显示（带降级处理）
 * - 备注/昵称内联编辑
 * - 原始名称显示（当备注与原名不同时）
 * - Twitter 链接（可选）
 * - 关注/收藏按钮（集成）
 * - 地址复制（仅 default 模式）
 * - 预留插槽（prefixSlot, suffixSlot）
 */

import React, { memo } from 'react';
import { Icons } from '@/components/ui/icons';
import { UserAvatar } from '@/components/ui/user-avatar';
import { InlineNoteEditor } from '@/components/ui/inline-note-editor';
import { useUserData } from '@/hooks/use-user-data';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { formatAddressDisplay, generateUserPlaceholder } from '@/lib/utils';
import type { EthAddress } from '@/types';
import type { AddressAnnotation } from '@/types/user';
import type { PartialProfileData as ProfileData } from '@/lib/storage/db/address-profiles-db';

// ============================================================
// Types
// ============================================================

/** 组件尺寸 */
export type UserCardSize = 'sm' | 'md' | 'lg';

/** 组件变体 */
export type UserCardVariant = 'compact' | 'default';

/** 基础用户资料类型（ProfileData 的超集） */
export interface UserCardProfile {
  address: EthAddress;
  userName?: string;
  ensName?: string;
  avatarUrl?: string;
  twitterHandle?: string;
}

export interface UserCardProps {
  /** 必需：钱包地址 */
  address: EthAddress;

  /** 用户的备注和标签 */
  annotation?: AddressAnnotation | null;

  /** 用户资料数据 */
  profile?: UserCardProfile | ProfileData | null;

  /** 样式变体 */
  variant?: UserCardVariant;

  /** 可选元素控制 */
  showAvatar?: boolean;
  showTwitter?: boolean;
  showFollow?: boolean;
  showCopy?: boolean;
  showOriginalName?: boolean;
  showLastActive?: boolean;
  showLiveBadge?: boolean;

  /** 关注按钮样式：true=大按钮，false=小爱心图标 */
  largeFollowButton?: boolean;

  /** 尺寸 */
  size?: UserCardSize;

  /** 上次活跃时间（用于显示"上次活跃 X 天前"） */
  lastActive?: Date | string;

  /** 交互回调 */
  onAddressClick?: (address: string) => void;

  /** 预留插槽 */
  prefixSlot?: React.ReactNode;
  suffixSlot?: React.ReactNode;

  /** 自定义类名 */
  className?: string;

  /** 停止事件冒泡（用于表格等场景） */
  stopPropagation?: boolean;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * 获取头像尺寸
 */
function getAvatarSize(size: UserCardSize): 'sm' | 'md' | 'lg' {
  switch (size) {
    case 'sm':
      return 'sm';
    case 'lg':
      return 'lg';
    default:
      return 'md';
  }
}

/**
 * 检查 profile 是否有 ensName 属性
 */
function hasEnsName(profile: UserCardProfile | ProfileData | null | undefined): profile is UserCardProfile {
  return profile !== null && typeof profile === 'object' && 'ensName' in profile;
}

/**
 * 检查 profile 是否有 twitterHandle 属性
 */
function hasTwitterHandle(profile: UserCardProfile | ProfileData | null | undefined): profile is UserCardProfile {
  return profile !== null && typeof profile === 'object' && 'twitterHandle' in profile;
}

/**
 * 获取显示的用户名优先级：
 * 1. 用户备注 (annotation.note)
 * 2. profile.userName
 * 3. profile.ensName (如果存在)
 * 4. generateUserPlaceholder(address)
 */
function getDisplayUserName(
  address: EthAddress,
  annotation: AddressAnnotation | null | undefined,
  profile: UserCardProfile | ProfileData | null | undefined
): string {
  const note = annotation?.note;
  if (note && note.trim()) {
    return note.trim();
  }
  if (profile?.userName) {
    return profile.userName;
  }
  if (hasEnsName(profile) && profile.ensName) {
    return profile.ensName;
  }
  return generateUserPlaceholder(address);
}

/**
 * 获取原始名称（用于与备注对比显示）
 */
function getOriginalName(
  annotation: AddressAnnotation | null | undefined,
  profile: UserCardProfile | ProfileData | null | undefined
): string | undefined {
  const note = annotation?.note;
  if (!note) return undefined;
  if (profile?.userName && note !== profile.userName) {
    return profile.userName;
  }
  if (hasEnsName(profile) && profile.ensName && note !== profile.ensName) {
    return profile.ensName;
  }
  return undefined;
}

/**
 * 标准化 Twitter handle
 */
function normalizeTwitterHandle(profile: UserCardProfile | ProfileData | null | undefined): string | undefined {
  if (!hasTwitterHandle(profile) || !profile.twitterHandle) return undefined;
  return profile.twitterHandle.startsWith('@') ? profile.twitterHandle.slice(1) : profile.twitterHandle;
}

/**
 * 格式化"上次活跃"时间显示
 */
function formatLastActive(lastActive: Date | string): string {
  const date = typeof lastActive === 'string' ? new Date(lastActive) : lastActive;
  const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (daysAgo === 0) return '今天活跃';
  if (daysAgo === 1) return '昨天活跃';
  if (daysAgo < 7) return `${daysAgo} 天前活跃`;
  if (daysAgo < 30) return `${Math.floor(daysAgo / 7)} 周前活跃`;
  if (daysAgo < 365) return `${Math.floor(daysAgo / 30)} 月前活跃`;
  return `${Math.floor(daysAgo / 365)} 年前活跃`;
}

// ============================================================
// Components
// ============================================================

/**
 * Compact 模式的用户卡片（单行）
 */
const UserCardCompact: React.FC<UserCardProps> = memo(({
  address,
  annotation,
  profile,
  size = 'md',
  showAvatar = true,
  showTwitter = true,
  showFollow = true,
  showCopy = true,
  showOriginalName = true,
  onAddressClick,
  prefixSlot,
  suffixSlot,
  className = '',
  stopPropagation = false,
}) => {
  const { isFollowed, toggleFollow, setNote } = useUserData();
  const { isCopied, copy } = useCopyToClipboard();
  const displayName = getDisplayUserName(address, annotation, profile);
  const originalName = showOriginalName ? getOriginalName(annotation, profile) : undefined;
  const twitterHandle = showTwitter ? normalizeTwitterHandle(profile) : undefined;
  const avatarUrl = profile?.avatarUrl;
  const isFollowedState = showFollow ? isFollowed(address) : false;

  const handleFollowClick = (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    toggleFollow(address, profile?.userName, avatarUrl);
  };

  const handleCopyClick = (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    copy(address);
  };

  const handleAddressClick = () => {
    onAddressClick?.(address);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* 前置插槽 */}
      {prefixSlot}

      {/* 头像 */}
      {showAvatar && (
        <div className="flex-shrink-0" onClick={handleAddressClick}>
          <UserAvatar
            address={address}
            avatarUrl={avatarUrl}
            userName={displayName}
            size={getAvatarSize(size)}
            showBorder={false}
          />
        </div>
      )}

      {/* 名称区域 */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* 备注编辑器 */}
        <div className="flex items-center gap-1 min-w-0">
          <InlineNoteEditor
            value={annotation?.note}
            placeholder={displayName}
            onChange={(note) => setNote(address, note)}
          />
          {/* 后置插槽 */}
          {suffixSlot}
        </div>

        {/* 原始名称（括号显示） */}
        {originalName && (
          <span className="text-xs text-txt-muted truncate">
            ({originalName})
          </span>
        )}

        {/* Twitter 图标 */}
        {twitterHandle && (
          <a
            href={`https://x.com/${twitterHandle}`}
            className="text-brand hover:text-brand/80 flex-shrink-0"
            onClick={(e) => stopPropagation && e.stopPropagation()}
            target="_blank"
            rel="noopener noreferrer"
            title={`@${twitterHandle}`}
          >
            <Icons.Twitter size={size === 'sm' ? 10 : 12} fill="currentColor" />
          </a>
        )}

        {/* 关注按钮 */}
        {showFollow && (
          <button
            type="button"
            className={`transition-all flex-shrink-0 ${
              isFollowedState
                ? 'text-brand fill-current'
                : 'text-txt-muted hover:text-brand'
            }`}
            onClick={handleFollowClick}
            title={isFollowedState ? '已关注' : '关注'}
          >
            <Icons.Heart size={size === 'sm' ? 12 : 14} className={isFollowedState ? 'fill-current' : undefined} />
          </button>
        )}

        {/* 复制地址按钮 */}
        {showCopy && (
          <button
            type="button"
            className={`transition-all flex-shrink-0 ${
              isCopied
                ? 'text-profit scale-110'
                : 'text-txt-muted hover:text-brand'
            }`}
            onClick={handleCopyClick}
            title={isCopied ? '已复制' : '复制地址'}
          >
            {isCopied ? (
              <Icons.CheckCircle size={size === 'sm' ? 10 : 12} />
            ) : (
              <Icons.Copy size={size === 'sm' ? 10 : 12} />
            )}
          </button>
        )}
      </div>
    </div>
  );
});

UserCardCompact.displayName = 'UserCardCompact';

/**
 * Default 模式的用户卡片（双行，含地址）
 */
const UserCardDefault: React.FC<UserCardProps> = memo(({
  address,
  annotation,
  profile,
  size = 'md',
  showAvatar = true,
  showTwitter = true,
  showFollow = true,
  showCopy = true,
  showOriginalName = true,
  showLastActive = false,
  showLiveBadge = false,
  largeFollowButton = false,
  lastActive,
  onAddressClick,
  prefixSlot,
  suffixSlot,
  className = '',
  stopPropagation = false,
}) => {
  const { isFollowed, toggleFollow, setNote } = useUserData();
  const { isCopied, copy } = useCopyToClipboard();
  const displayName = getDisplayUserName(address, annotation, profile);
  const originalName = showOriginalName ? getOriginalName(annotation, profile) : undefined;
  const twitterHandle = showTwitter ? normalizeTwitterHandle(profile) : undefined;
  const avatarUrl = profile?.avatarUrl;
  const shortAddress = formatAddressDisplay(address);
  const isFollowedState = showFollow ? isFollowed(address) : false;

  const handleFollowClick = (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    toggleFollow(address, profile?.userName, avatarUrl);
  };

  const handleCopyClick = (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    copy(address);
  };

  const handleAddressClick = () => {
    onAddressClick?.(address);
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      {/* 左侧：前置插槽 + 头像 */}
      <div className="flex flex-col gap-1 items-start">
        {/* 前置插槽 */}
        {prefixSlot && (
          <div className="h-full flex items-center">{prefixSlot}</div>
        )}

        {/* 头像 */}
        {showAvatar && (
          <div className="flex-shrink-0" onClick={handleAddressClick}>
            <UserAvatar
              address={address}
              avatarUrl={avatarUrl}
              userName={displayName}
              size={getAvatarSize(size)}
              showBorder={false}
            />
          </div>
        )}
      </div>

      {/* 右侧：信息组（名称行 + 地址行） */}
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        {/* 第一行：名称 + 操作按钮 */}
        <div className="flex items-center gap-2 min-w-0">
          {/* 备注编辑器 */}
          <div className="flex items-center gap-1 min-w-0">
            <InlineNoteEditor
              value={annotation?.note}
              placeholder={displayName}
              onChange={(note) => setNote(address, note)}
            />
            {/* 后置插槽 */}
            {suffixSlot}
          </div>

          {/* 原始名称（括号显示） */}
          {originalName && (
            <span className="text-xs text-txt-muted truncate">
              ({originalName})
            </span>
          )}

          {/* Twitter 图标 */}
          {twitterHandle && (
            <a
              href={`https://x.com/${twitterHandle}`}
              className="text-brand hover:text-brand/80 flex-shrink-0"
              onClick={(e) => stopPropagation && e.stopPropagation()}
              target="_blank"
              rel="noopener noreferrer"
              title={`@${twitterHandle}`}
            >
              <Icons.Twitter size={size === 'sm' ? 10 : 12} fill="currentColor" />
            </a>
          )}

          {/* 小爱心关注按钮（仅在非 largeFollowButton 模式显示） */}
          {showFollow && !largeFollowButton && (
            <button
              type="button"
              className={`transition-all flex-shrink-0 ${
                isFollowedState
                  ? 'text-brand fill-current'
                  : 'text-txt-muted hover:text-brand'
              }`}
              onClick={handleFollowClick}
              title={isFollowedState ? '已关注' : '关注'}
            >
              <Icons.Heart size={size === 'sm' ? 12 : 14} className={isFollowedState ? 'fill-current' : undefined} />
            </button>
          )}

        </div>

        {/* 第二行：地址 + 复制按钮 + 上次活跃 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`font-mono text-txt-secondary ${
                size === 'sm' ? 'text-xs' : 'text-sm'
              }`}
            >
              {shortAddress}
            </span>
            {showCopy && (
              <button
                type="button"
                className={`transition-all flex-shrink-0 ${
                  isCopied
                    ? 'text-profit scale-110'
                    : 'text-txt-muted hover:text-brand'
                }`}
                onClick={handleCopyClick}
                title={isCopied ? '已复制' : '复制地址'}
              >
                {isCopied ? (
                  <Icons.CheckCircle size={12} />
                ) : (
                  <Icons.Copy size={size === 'sm' ? 10 : 12} />
                )}
              </button>
            )}
          </div>

          {/* 右侧：LIVE 徽章 + 上次活跃 + 关注大按钮 */}
          {(showLiveBadge || (showLastActive && lastActive) || (showFollow && largeFollowButton)) && (
            <div className="flex items-center gap-3 ml-auto">
              {/* LIVE 徽章 */}
              {showLiveBadge && (
                <span className="rounded-full bg-brand/10 border border-brand/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand shadow-[0_0_8px_rgba(0,240,255,0.3)]">
                  LIVE
                </span>
              )}
              {/* 上次活跃标签 */}
              {showLastActive && lastActive && (
                <div className="flex items-center gap-1 text-xs text-txt-muted">
                  <Icons.Clock size={10} />
                  <span>{formatLastActive(lastActive)}</span>
                </div>
              )}
              {/* 关注大按钮（仅在 largeFollowButton 模式显示） */}
              {showFollow && largeFollowButton && (
                <button
                  type="button"
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                    isFollowedState
                      ? 'bg-brand/10 border border-brand/30 text-brand'
                      : 'bg-surface2 border border-border text-txt-main hover:bg-surface1 hover:border-border/80'
                  }`}
                  onClick={handleFollowClick}
                >
                  <Icons.Heart size={14} className={isFollowedState ? 'fill-current' : undefined} />
                  <span>{isFollowedState ? '已关注' : '关注'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

UserCardDefault.displayName = 'UserCardDefault';

// ============================================================
// Main Component
// ============================================================

export const UserCard: React.FC<UserCardProps> = memo((props) => {
  const { variant = 'compact' } = props;

  if (variant === 'default') {
    return <UserCardDefault {...props} />;
  }

  return <UserCardCompact {...props} />;
});

UserCard.displayName = 'UserCard';
