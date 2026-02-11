/**
 * UserAvatar Component
 *
 * A memoized avatar component that prevents unnecessary re-renders
 * and provides consistent avatar display across the application.
 */

import React, { useState, useMemo } from 'react';
import type { EthAddress } from '@/types';
import { Icons } from './icons';
import { generateUserPlaceholder } from '@/lib/utils';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarConfig {
  size: string;
  iconSize: number;
  borderRadius: string;
}

const SIZE_CONFIG: Record<AvatarSize, AvatarConfig> = {
  sm: { size: 'h-6 w-6', iconSize: 12, borderRadius: 'rounded-md' },
  md: { size: 'h-8 w-8', iconSize: 16, borderRadius: 'rounded-lg' },
  lg: { size: 'h-12 w-12', iconSize: 24, borderRadius: 'rounded-xl' },
  xl: { size: 'h-16 w-16', iconSize: 32, borderRadius: 'rounded-2xl' },
};

interface UserAvatarProps {
  /** Avatar URL from API */
  avatarUrl?: string;
  /** Fallback username for alt text */
  userName?: string;
  /** User's wallet address (used for stable key) */
  address: EthAddress;
  /** Avatar size variant */
  size?: AvatarSize;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show border */
  showBorder?: boolean;
}

/**
 * Memoized avatar component that prevents flickering by:
 * 1. Using React.memo to skip re-renders when props haven't changed
 * 2. Using stable key based on address
 * 3. Tracking image load state to prevent showing fallback on re-renders
 */
export const UserAvatar = React.memo<UserAvatarProps>(({
  avatarUrl,
  userName,
  address,
  size = 'md',
  className = '',
  showBorder = true,
}) => {
  const config = SIZE_CONFIG[size];
  const [hasFailed, setHasFailed] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Reset failure state when avatarUrl changes
  React.useEffect(() => {
    setHasFailed(false);
    if (!avatarUrl) {
      setHasLoaded(false);
    }
  }, [avatarUrl]);

  // Stable alt text
  const altText = useMemo(
    () => userName || generateUserPlaceholder(address),
    [userName, address]
  );

  // Don't attempt to show image if it previously failed
  const shouldShowImage = avatarUrl && !hasFailed;

  return (
    <div className={`relative flex-shrink-0 ${config.size} ${className}`}>
      {shouldShowImage ? (
        <>
          <img
            key={`avatar-${address}`} // Stable key prevents re-mounting
            src={avatarUrl}
            alt={altText}
            className={`h-full w-full object-cover ${
              showBorder ? 'border border-border' : ''
            } ${config.borderRadius} transition-opacity duration-150 ${
              hasLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setHasLoaded(true)}
            onError={() => {
              setHasFailed(true);
              setHasLoaded(false);
            }}
          />
          {/* Show placeholder as overlay while loading */}
          {!hasLoaded && (
            <div
              className={`absolute inset-0 flex items-center justify-center ${
                showBorder ? 'border border-border' : ''
              } ${config.borderRadius} bg-surface2 text-txt-secondary`}
            >
              <Icons.User size={config.iconSize} />
            </div>
          )}
        </>
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center ${
            showBorder ? 'border border-border' : ''
          } ${config.borderRadius} bg-surface2 text-txt-secondary`}
        >
          <Icons.User size={config.iconSize} />
        </div>
      )}
    </div>
  );
});

UserAvatar.displayName = 'UserAvatar';
