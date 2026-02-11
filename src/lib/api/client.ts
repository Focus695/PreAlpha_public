/**
 * Core API Client
 * Base fetch wrapper and utility functions
 */

import { getApiBaseUrl } from '../api-config';
import { logger } from '../logger';
import type { MarketItem, PaginatedApiResponse, UserPosition, UserTrade } from './types';

// API base URL configuration
// - Development: Proxied through dev server at /api -> remote API
// - Production: Direct requests to remote API (configured via env var)
const API_BASE = getApiBaseUrl();

/**
 * Get JWT token from localStorage for authenticated requests
 *
 * This function is used internally by fetchApi to include authentication
 * in API requests when available.
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

/**
 * Base fetch wrapper with error handling and automatic JWT authentication
 *
 * If a JWT token is present in localStorage, it will be automatically
 * included in the Authorization header for all requests.
 *
 * TODO: Backend integration
 * If your API endpoints require authentication, ensure they:
 * 1. Accept Authorization: Bearer <token> header
 * 2. Return 401 status for invalid/expired tokens
 * 3. Verify JWT signature and extract user info
 */
export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // Get auth token if available
  const token = getAuthToken();

  // Merge headers with auth token if present
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Merge existing headers if present
  if (options?.headers) {
    const existingHeaders = new Headers(options.headers);
    existingHeaders.forEach((value, key) => {
      headers[key] = value;
    });
  }

  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle authentication errors
  if (response.status === 401) {
    // Token is invalid or expired, clear it
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_address');
    }
    throw new Error('Authentication required or token expired');
  }

  if (!response.ok) {
    // Try to parse error response body for more details
    let errorMessage = `API request failed: ${response.statusText} (status: ${response.status})`;
    let errorDetails: unknown = null;

    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorBody = await response.json();
        errorDetails = errorBody;

        // Check if it's the standard API error format
        if (isRecord(errorBody)) {
          if (typeof errorBody.errmsg === 'string' && typeof errorBody.errno === 'number') {
            errorMessage = `API request failed: ${errorBody.errmsg} (errno: ${errorBody.errno})`;
          } else if (typeof errorBody.message === 'string') {
            errorMessage = `API request failed: ${errorBody.message}`;
          } else if (typeof errorBody.error === 'string') {
            errorMessage = `API request failed: ${errorBody.error}`;
          }
        }
      } else {
        // Try to get text response
        const textResponse = await response.text();
        if (textResponse) {
          errorDetails = textResponse;
          errorMessage = `API request failed: ${response.statusText} (status: ${response.status})\nResponse: ${textResponse.substring(0, 200)}`;
        }
      }
    } catch (parseError) {
      // If parsing fails, use the default error message
      logger.warn('[fetchApi] Failed to parse error response:', parseError);
    }

    // Log the error details for debugging
    // For 404 errors (resource not found), use debug level logging as these are often expected
    // (e.g., when checking if an address exists in the database)
    if (response.status === 404) {
      logger.debug('[fetchApi] Resource not found (404):', {
        endpoint,
        url: `${API_BASE}${endpoint}`,
      });
    } else {
      // For other errors, use error level logging
      logger.error('[fetchApi] API Error:', {
        endpoint,
        status: response.status,
        statusText: response.statusText,
        errorDetails,
        url: `${API_BASE}${endpoint}`,
      });
    }

    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).details = errorDetails;
    throw error;
  }

  return response.json();
}

// ============================================================
// Utility Functions
// ============================================================

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Normalize address for API requests
 * Ensures address has 0x prefix and is lowercase
 * 
 * @param address - Wallet address (with or without 0x prefix)
 * @returns Normalized address with 0x prefix and lowercase
 * 
 * @example
 * normalizeAddressForApi('0x1234...') => '0x1234...'
 * normalizeAddressForApi('1234...') => '0x1234...'
 */
export function normalizeAddressForApi(address: string): string {
  if (!address) return address;
  const trimmed = address.trim();
  return trimmed.startsWith('0x')
    ? trimmed.toLowerCase()
    : `0x${trimmed.toLowerCase()}`;
}

export function coerceNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export function normalizeOpinionTimestamp(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;

  if (typeof value === 'number') {
    const ms = value > 1e12 ? value : value * 1000;
    return new Date(ms).toISOString();
  }

  if (typeof value === 'string') {
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      const ms = numeric > 1e12 ? numeric : numeric * 1000;
      return new Date(ms).toISOString();
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  return undefined;
}

export function deriveTicker(title: string | undefined): string {
  if (!title) return 'MARKET';
  return title.substring(0, 6).toUpperCase();
}

export function mapOutcomeToSide(value: unknown): 'YES' | 'NO' {
  if (typeof value === 'string') {
    return value.toUpperCase() === 'NO' ? 'NO' : 'YES';
  }
  if (typeof value === 'number') {
    return value === 2 ? 'NO' : 'YES';
  }
  return 'YES';
}

export function mapQuoteSymbol(address: unknown): string | undefined {
  if (typeof address !== 'string') return undefined;
  const lower = address.toLowerCase();
  if (lower === '0x55d398326f99059ff775485246999027b3197955') {
    return 'USDT';
  }
  return undefined;
}

// ============================================================
// Response Converters
// ============================================================

export function buildOpinionMarket(partial: Record<string, unknown>): MarketItem {
  const title = typeof partial.marketTitle === 'string'
    ? partial.marketTitle
    : (partial.market as MarketItem | undefined)?.title;

  return {
    id: coerceNumber(partial.marketId, 0),
    title: title ?? 'Unknown Market',
    status: (partial.marketStatusEnum as string) ?? String(partial.marketStatus ?? 'activated'),
    marketType: 1,
    yesPrice: undefined,
    noPrice: undefined,
  };
}

export function convertOpinionPosition(
  payload: Record<string, unknown>,
  walletAddress: string,
  index: number
): UserPosition {
  const marketId = coerceNumber(payload.marketId, index);
  const size = coerceNumber(payload.shares ?? payload.sharesOwned ?? payload.size, 0);
  const avgPrice = coerceNumber(payload.avgEntryPrice ?? payload.avgPrice, 0);
  const pnl = coerceNumber(payload.unrealizedPnl ?? payload.pnl, 0);
  const currentValue = coerceNumber(payload.currentValueInQuoteToken ?? payload.currentValue, size * avgPrice);
  const currentPrice = size > 0 ? currentValue / size : undefined;
  const tokenId = (payload.tokenId ?? payload.conditionId ?? `${marketId}-${index}`).toString();
  const conditionId = (payload.conditionId as string | undefined) ?? tokenId;
  const market = buildOpinionMarket(payload);

  // Get outcome from API response
  const outcome = (payload.outcome as string | undefined) ?? mapOutcomeToSide(payload.outcomeSideEnum ?? payload.outcome);
  const side = mapOutcomeToSide(payload.outcomeSideEnum ?? payload.outcome);

  const rootTitle = (payload.rootMarketTitle as string | undefined) || '';
  const rootId = coerceNumber(payload.rootMarketId, 0);
  const marketTitle = market.title;

  // Logic:
  // - If rootId > 0, it's a multi-choice market: Title = rootTitle, Outcome = marketTitle
  // - If rootId == 0, it's a binary market: Title = marketTitle
  const finalMarketTitle = rootId > 0 && rootTitle ? rootTitle : marketTitle;
  const outcomeLabel = rootId > 0 ? marketTitle : undefined;

  const ticker = deriveTicker(finalMarketTitle);
  const updatedAt = normalizeOpinionTimestamp(payload.updatedAt ?? payload.marketCutoffAt);

  return {
    id: Number(payload.id ?? `${marketId}${index}`),
    walletAddress,
    marketId,
    marketTitle: finalMarketTitle,
    marketStatus: coerceNumber(payload.marketStatus, 0),
    marketStatusEnum: (payload.marketStatusEnum as string | undefined),
    marketCutoffAt: coerceNumber(payload.marketCutoffAt, 0),
    rootMarketId: rootId,
    rootMarketTitle: rootTitle,
    tokenId,
    conditionId,
    sharesOwned: (payload.sharesOwned as string | undefined) ?? String(size),
    sharesFrozen: (payload.sharesFrozen as string | undefined) ?? undefined,
    avgEntryPrice: (payload.avgEntryPrice as string | undefined) ?? String(avgPrice),
    currentPrice,
    currentValueInQuoteToken: (payload.currentValueInQuoteToken as string | undefined) ?? String(currentValue),
    unrealizedPnl: (payload.unrealizedPnl as string | undefined) ?? String(pnl),
    unrealizedPnlPercent: (payload.unrealizedPnlPercent as string | undefined),
    dailyPnlChange: (payload.dailyPnlChange as string | undefined),
    dailyPnlChangePercent: (payload.dailyPnlChangePercent as string | undefined),
    outcome,
    outcomeSide: coerceNumber(payload.outcomeSide, 0),
    outcomeSideEnum: (payload.outcomeSideEnum as string | undefined),
    claimStatus: coerceNumber(payload.claimStatus, 0),
    claimStatusEnum: (payload.claimStatusEnum as string | undefined),
    quoteToken: (payload.quoteToken as string | undefined),
    // Legacy fields (for backward compatibility with transformers)
    market: { ...market, title: finalMarketTitle },
    outcomeLabel,
    size,
    avgPrice,
    pnl,
    currentValue,
    side,
    ticker,
    quoteSymbol: mapQuoteSymbol(payload.quoteToken),
    updatedAt,
  } as UserPosition;
}

export function convertOpinionTrade(
  payload: Record<string, unknown>,
  walletAddress: string,
  index: number
): UserTrade {
  const marketId = coerceNumber(payload.marketId, index);
  const price = coerceNumber(payload.price, 0);
  const amount = coerceNumber(payload.shares ?? payload.amount, 0);
  const sideValue = typeof payload.side === 'string' ? payload.side.toUpperCase() : '';
  // API 返回的是秒级时间戳，需要转换为毫秒
  // 判断：小于 1e11 的数字通常是秒级时间戳（1e11 毫秒 ≈ 5138-11-09）
  const rawCreatedAt = typeof payload.createdAt === 'number'
    ? payload.createdAt
    : coerceNumber(payload.createdAt, Date.now());
  const createdAtNumber = rawCreatedAt < 1e11 ? rawCreatedAt * 1000 : rawCreatedAt;
  const market = buildOpinionMarket(payload);

  const rootTitle = (payload.rootMarketTitle as string | undefined) || '';
  const rootId = coerceNumber(payload.rootMarketId, 0);
  const marketTitle = market.title;

  const finalMarketTitle = rootId > 0 && rootTitle ? rootTitle : marketTitle;
  const outcomeLabel = rootId > 0 ? marketTitle : undefined;

  // 支持四种交易动作：BUY, SELL, SPLIT, MERGE
  // 如果值不在预期范围内，默认为 BUY
  const validSides = ['BUY', 'SELL', 'SPLIT', 'MERGE'] as const;
  const normalizedSide = validSides.includes(sideValue as any)
    ? (sideValue as 'BUY' | 'SELL' | 'SPLIT' | 'MERGE')
    : 'BUY';

  // Get outcome from API response
  const outcome = (payload.outcome as string | undefined) ?? mapOutcomeToSide(payload.outcomeSideEnum);

  return {
    id: Number(payload.id ?? `${marketId}${index}`),
    txHash: (payload.txHash ?? `0x${marketId.toString(16)}${index}`).toString(),
    walletAddress,
    marketId,
    marketTitle: finalMarketTitle,
    rootMarketId: rootId,
    rootMarketTitle: rootTitle,
    tokenId: (payload.tokenId ?? payload.conditionId ?? `token-${marketId}-${index}`).toString(),
    side: normalizedSide,
    outcome,
    outcomeSide: coerceNumber(payload.outcomeSide, 0),
    outcomeSideEnum: (payload.outcomeSideEnum as string | undefined),
    shares: (payload.shares as string | undefined) ?? String(amount),
    price: (payload.price as string | undefined) ?? String(price),
    amount: (payload.amount as string | undefined),
    fee: (payload.fee as string | undefined),
    profit: (payload.profit as string | undefined),
    quoteToken: (payload.quoteToken as string | undefined),
    quoteTokenUsdPrice: (payload.quoteTokenUsdPrice as string | undefined),
    usdAmount: (payload.usdAmount as string | undefined),
    status: coerceNumber(payload.status, 0),
    statusEnum: (payload.statusEnum as string | undefined),
    chainId: (payload.chainId as string | undefined),
    createdAt: createdAtNumber,
    // Legacy fields (for backward compatibility with transformers)
    market: { ...market, title: finalMarketTitle },
    outcomeLabel,
  } as UserTrade;
}

// ============================================================
// Response Normalizers
// ============================================================

export function normalizeListResponse<T>(
  payload: unknown,
  mapItem?: (item: Record<string, unknown>, index: number) => T
): PaginatedApiResponse<T> {
  const empty: PaginatedApiResponse<T> = {
    items: [],
    total: 0,
    page: 1,
    limit: 10,
    hasMore: false,
  };

  if (!payload) {
    return empty;
  }

  const coerceItems = (itemsSource: unknown): Record<string, unknown>[] => {
    if (Array.isArray(itemsSource)) {
      return itemsSource as Record<string, unknown>[];
    }
    return [];
  };

  if (Array.isArray(payload)) {
    const mappedItems = mapItem ? payload.map(mapItem) : (payload as T[]);
    return {
      ...empty,
      items: mappedItems,
      total: mappedItems.length,
      limit: mappedItems.length,
    };
  }

  if (typeof payload === 'object') {
    const dataRecord = payload as Record<string, unknown>;
    const resultCandidate = dataRecord.result;
    const container = isRecord(resultCandidate) ? (resultCandidate as Record<string, unknown>) : dataRecord;

    const itemsSource =
      container['items'] ??
      container['list'] ??
      dataRecord['items'] ??
      dataRecord['list'] ??
      [];

    const items = coerceItems(itemsSource);
    const mappedItems = mapItem ? items.map(mapItem) : (items as unknown as T[]);

    const total = coerceNumber(container['total'] ?? dataRecord['total'] ?? mappedItems.length, mappedItems.length);
    const page = coerceNumber(container['page'] ?? dataRecord['page'] ?? 0, 0);
    const limit = coerceNumber(container['limit'] ?? dataRecord['limit'] ?? mappedItems.length, mappedItems.length);
    const hasMoreCandidate = container['hasMore'] ?? dataRecord['hasMore'];

    const inferredHasMore =
      typeof hasMoreCandidate === 'boolean'
        ? hasMoreCandidate
        : limit > 0
          ? page * limit + mappedItems.length < total
          : mappedItems.length < total;

    return {
      items: mappedItems,
      total,
      page,
      limit,
      hasMore: Boolean(inferredHasMore),
    };
  }

  return empty;
}

export function buildMockPaginatedResponse<T>(items: T[]): PaginatedApiResponse<T> {
  return {
    items,
    total: items.length,
    page: 1,
    limit: items.length,
    hasMore: false,
  };
}
