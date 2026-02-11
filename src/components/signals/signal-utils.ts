/**
 * Signal Component Utilities
 *
 * Shared utility functions for signal-related components
 * to avoid code duplication and improve maintainability
 */

import type { UserData } from '@/types/user';

// ============================================================
// Type Badge Colors
// ============================================================

/**
 * Get CSS classes for signal type badge
 * Used consistently across SignalTable and SignalCardEnhanced
 *
 * @param type - Signal type string
 * @returns CSS class string for the badge
 */
export function getSignalTypeBadgeColor(type: string): string {
  switch (type) {
    case 'smart_money_entry':
      return 'border-profit/30 bg-profit/10 text-profit';
    case 'exit_warning':
      return 'border-down/30 bg-down/10 text-down';
    case 'anomaly_detected':
      return 'border-loss/30 bg-loss/10 text-loss';
    default:
      return 'border-brand/30 bg-brand/10 text-brand';
  }
}

// ============================================================
// User Data Helpers
// ============================================================

/**
 * Get user note for an address from userData annotations
 * Used consistently across SignalTable and SignalCardEnhanced
 *
 * @param address - Wallet address to look up
 * @param userData - User data containing annotations
 * @returns User note if exists, undefined otherwise
 */
export function getUserNoteForAddress(
  address: string,
  userData: UserData | null | undefined
): string | undefined {
  if (!userData?.annotations) return undefined;
  const normalized = address.toLowerCase();
  return userData.annotations[normalized]?.note;
}
