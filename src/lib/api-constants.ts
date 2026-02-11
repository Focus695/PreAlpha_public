/**
 * Shared API Constants
 *
 * Centralized API URL constants used by both server and client code.
 * This ensures consistency across the application.
 */

/**
 * Default API URLs for different environments
 */
export const API_URLS = {
  /** Development API server */
  DEV: 'YOUR_DEV_API_URL',
  /** Production API server */
  PROD: 'YOUR_PROD_API_URL',
} as const;

/**
 * Environment variable names for API configuration
 */
export const API_ENV_VARS = {
  /** Dev API override (only used in development mode) */
  DEV_API: 'DEV_API_BASE_URL',
  /** Production API URL (used in production builds) */
  PROD_API: 'API_BASE_URL',
  /** Alternative names for compatibility */
  PROD_API_ALIASES: ['NEXT_PUBLIC_API_BASE_URL', 'VITE_API_BASE_URL', 'REACT_APP_API_BASE_URL'],
} as const;

/**
 * Platform URLs
 */
export const PLATFORM_URLS = {
  POLYMARKET: 'https://polymarket.com',
  OPINION: 'https://app.opinion.trade',
  OPINION_XYZ: 'https://opinion.xyz',
} as const;

/**
 * Generate Opinion market detail URL
 * @param marketId The market ID
 * @param rootMarketId The root market ID (0 or undefined for binary, non-zero for multi-option)
 * @returns Full URL to the market detail page on Opinion platform
 */
export function getOpinionMarketUrl(marketId: number, rootMarketId?: number): string {
  const baseUrl = PLATFORM_URLS.OPINION;
  // Binary option (rootMarketId = 0 or undefined)
  if (!rootMarketId || rootMarketId === 0) {
    return `${baseUrl}/detail?topicId=${marketId}`;
  }
  // Multi-option (rootMarketId ≠ 0) - use rootMarketId as the topicId
  return `${baseUrl}/detail?topicId=${rootMarketId}&type=multi`;
}
