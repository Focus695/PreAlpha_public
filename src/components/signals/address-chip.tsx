/**
 * AddressChip Component
 *
 * Displays an address with avatar and name.
 * Used in signals table and cards to show enriched address information.
 *
 * Display priority:
 * 1. User's nickname (short note ≤ 20 chars)
 * 2. API username
 * 3. Shortened address (fallback)
 */

import { Icons } from '@/components/ui/icons';
import { formatAddressDisplay } from '@/lib/utils';
import type { PartialProfileData as ProfileData } from '@/lib/storage/db/address-profiles-db';

// ============================================================
// Types
// ============================================================

interface AddressChipProps {
  /** The wallet address */
  address: string;
  /** User's custom note/nickname (from userData annotations) */
  userNote?: string;
  /** Profile data from API (userName, avatarUrl) */
  profile?: ProfileData;
  /** Click handler for the address */
  onAddressClick?: (address: string) => void;
  /** Compact mode for table view (more condensed) */
  compact?: boolean;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get the display name for an address based on priority
 * Priority: user nickname (short) > API username > null
 */
function getDisplayName(
  userNote: string | undefined,
  profile: ProfileData | undefined
): string | null {
  // Check user note - only use if short (≤20 chars) to treat as nickname
  if (userNote && userNote.trim().length > 0 && userNote.trim().length <= 20) {
    return userNote.trim();
  }

  // Fallback to API username
  if (profile?.userName) {
    return profile.userName;
  }

  return null;
}

// ============================================================
// Component
// ============================================================

export function AddressChip({
  address,
  userNote,
  profile,
  onAddressClick,
  compact = false,
}: AddressChipProps) {
  const displayName = getDisplayName(userNote, profile);
  const avatarUrl = profile?.avatarUrl;
  const shortAddress = formatAddressDisplay(address);

  const content = (
    <>
      {/* Avatar */}
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName || shortAddress}
          className={`object-cover flex-shrink-0 ${
            compact ? 'h-5 w-5 rounded' : 'h-6 w-6 rounded-md'
          }`}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
      ) : null}
      <div
        className={`flex items-center justify-center text-txt-secondary flex-shrink-0 ${
          compact ? 'h-5 w-5 rounded' : 'h-6 w-6 rounded-md'
        } ${avatarUrl ? 'hidden' : ''} ${!displayName ? 'bg-surface2' : 'bg-brand/10 text-brand'}`}
      >
        <Icons.User size={compact ? 10 : 12} />
      </div>

      {/* Display Name */}
      {displayName && (
        <span className={`truncate text-txt-main ${compact ? 'text-[10px]' : 'text-xs'}`}>
          {displayName}
        </span>
      )}

      {/* Short Address (always shown in compact, hidden if displayName exists in normal mode) */}
      <span
        className={`font-mono text-txt-secondary ${
          compact ? 'text-[10px]' : 'text-xs'
        } ${displayName && !compact ? 'hidden' : ''}`}
      >
        {shortAddress}
      </span>
    </>
  );

  if (onAddressClick) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAddressClick(address);
        }}
        className={`inline-flex items-center gap-1 transition-colors ${
          compact
            ? 'rounded bg-surface2 px-1.5 py-0.5 hover:bg-brand/10 hover:text-brand'
            : 'rounded-md bg-surface2 px-2 py-1 hover:bg-brand/10 hover:text-brand'
        }`}
        title={address}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1 ${
        compact ? 'rounded bg-surface2 px-1.5 py-0.5' : 'rounded-md bg-surface2 px-2 py-1'
      }`}
    >
      {content}
    </div>
  );
}

// ============================================================
// Compact Variant (Table)
// ============================================================

export function AddressChipCompact(props: Omit<AddressChipProps, 'compact'>) {
  return <AddressChip {...props} compact={true} />;
}
