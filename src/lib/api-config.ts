/**
 * API Configuration
 *
 * Centralized configuration for all API endpoints and external platform URLs
 * All URLs should be configurable via environment variables
 */

import { API_URLS, API_ENV_VARS, PLATFORM_URLS } from './api-constants';

/**
 * Read environment variable from multiple sources
 */
export function getEnvValue(...keys: string[]): string | undefined {
  // Try process.env (Node.js/Bun)
  if (typeof process !== 'undefined' && typeof process.env !== 'undefined') {
    for (const key of keys) {
      const value = (process.env as Record<string, string | undefined>)[key];
      if (value !== undefined) {
        return value;
      }
    }
  }

  // Try import.meta.env (Vite/Bun build)
  if (typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined') {
    for (const key of keys) {
      const value = (import.meta.env as Record<string, string | undefined>)[key];
      if (value !== undefined) {
        return value;
      }
    }
  }

  // Try window.__PREALPHA_ENV__ (runtime injection)
  if (typeof window !== 'undefined' && window.__PREALPHA_ENV__) {
    for (const key of keys) {
      const value = window.__PREALPHA_ENV__[key];
      if (value !== undefined) {
        return value;
      }
    }
  }

  return undefined;
}

/**
 * Check if we're in development mode
 */
function isDevelopmentMode(): boolean {
  // Check NODE_ENV
  const nodeEnv = getEnvValue('NODE_ENV');
  if (nodeEnv === 'development') {
    return true;
  }
  if (nodeEnv === 'production') {
    return false;
  }
  
  // Check import.meta.env.MODE (Vite/Bun)
  if (typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined') {
    const mode = (import.meta.env as { MODE?: string }).MODE;
    if (mode === 'development') {
      return true;
    }
    if (mode === 'production') {
      return false;
    }
  }
  
  // Default to production for safety
  return false;
}

/**
 * API Base URL Configuration
 *
 * - Development: Uses API_URLS.DEV (can be overridden with DEV_API_BASE_URL)
 * - Production: Uses API_BASE_URL from environment variable, or defaults to API_URLS.PROD
 * - Supports proxy mode: set API_BASE_URL=/api to use dev server proxy
 */
export function getApiBaseUrl(): string {
  // Development mode: use dev API (can be overridden with DEV_API_BASE_URL)
  if (isDevelopmentMode()) {
    const devApiUrl = getEnvValue(API_ENV_VARS.DEV_API);
    if (devApiUrl) {
      return devApiUrl;
    }
    return API_URLS.DEV;
  }

  // Production mode: check environment variable first
  const apiBaseUrl = getEnvValue(API_ENV_VARS.PROD_API, ...API_ENV_VARS.PROD_API_ALIASES);

  if (apiBaseUrl) {
    // If API_BASE_URL is set to /api, use proxy
    if (apiBaseUrl === '/api' || apiBaseUrl.startsWith('/')) {
      return apiBaseUrl;
    }
    // Otherwise use the provided URL
    return apiBaseUrl;
  }

  // Default to production API
  return API_URLS.PROD;
}

/**
 * External Platform URLs Configuration
 */

/**
 * Get Polymarket profile URL template
 * Default: https://polymarket.com/profile/{address}
 */
export function getPolymarketProfileUrl(address: string): string {
  const baseUrl = getEnvValue(
    'POLYMARKET_BASE_URL',
    'NEXT_PUBLIC_POLYMARKET_BASE_URL',
    'VITE_POLYMARKET_BASE_URL',
    'REACT_APP_POLYMARKET_BASE_URL'
  ) || PLATFORM_URLS.POLYMARKET;

  return `${baseUrl}/profile/${address}`;
}

/**
 * Get Opinion profile URL template
 * Default: https://app.opinion.trade/profile?address={address}
 */
export function getOpinionProfileUrl(address: string): string {
  const baseUrl = getEnvValue(
    'OPINION_BASE_URL',
    'NEXT_PUBLIC_OPINION_BASE_URL',
    'VITE_OPINION_BASE_URL',
    'REACT_APP_OPINION_BASE_URL'
  ) || PLATFORM_URLS.OPINION;

  // Opinion uses query parameter format
  return `${baseUrl}/profile?address=${address}`;
}

/**
 * Get Opinion profile URL (alternative format with path)
 * Default: https://opinion.xyz/profile/{address}
 * Used for some legacy formats
 */
export function getOpinionProfileUrlPath(address: string): string {
  const baseUrl = getEnvValue(
    'OPINION_BASE_URL',
    'OPINION_XYZ_BASE_URL',
    'NEXT_PUBLIC_OPINION_BASE_URL',
    'VITE_OPINION_BASE_URL',
    'REACT_APP_OPINION_BASE_URL'
  ) || PLATFORM_URLS.OPINION_XYZ;

  return `${baseUrl}/profile/${address}`;
}

