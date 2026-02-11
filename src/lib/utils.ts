/**
 * Utility functions for the web app
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format address for display
 */
export function formatAddress(address: string, chars = 4): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format address for UI display (4+4 format: 0x7a...091b)
 * Wrapper around formatAddress with default 4-char length
 */
export function formatAddressDisplay(address: string): string {
  return formatAddress(address, 4);
}

/**
 * Format number with K/M/B suffix
 */
export function formatNumber(value: number, decimals = 2): string {
  if (Math.abs(value) >= 1e9) {
    return `${(value / 1e9).toFixed(decimals)}B`;
  }
  if (Math.abs(value) >= 1e6) {
    return `${(value / 1e6).toFixed(decimals)}M`;
  }
  if (Math.abs(value) >= 1e3) {
    return `${(value / 1e3).toFixed(decimals)}K`;
  }
  return value.toFixed(decimals);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format currency
 */
export function formatCurrency(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Generate default user name placeholder from address
 * Format: "用户" + last 4 characters of address
 */
export function generateUserPlaceholder(address: string): string {
  if (!address || address.length < 4) return '用户';
  const last4 = address.slice(-4);
  return `用户${last4}`;
}
