/**
 * Authentication API Endpoints
 * Handles SIWE (Sign-In with Ethereum) authentication flow
 *
 * SECURITY NOTE:
 * - Tokens are stored in localStorage for simplicity, which is vulnerable to XSS attacks.
 * - For production, consider using httpOnly cookies or a more secure storage mechanism.
 * - Always use HTTPS in production to prevent token interception.
 */

import { fetchApi } from '../client';
import type {
  AuthNonceResponse,
  AuthVerifyResponse,
  AuthVerifyRequest,
} from '../types';

// ============================================================
// Token Storage Constants
// ============================================================

const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  ADDRESS: 'auth_address',
  TOKEN_EXPIRES_AT: 'auth_token_expires_at',
} as const;

/** Default token expiry time in milliseconds (7 days) */
const DEFAULT_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

// ============================================================
// Authentication API
// ============================================================

export const authApi = {
  /**
   * Get nonce for SIWE signature
   * GET /auth/nonce
   *
   * Generates a random nonce for the frontend to use in SIWE signing.
   * Frontend must call this endpoint before signing.
   */
  async getNonce(): Promise<string> {
    const response = await fetchApi<AuthNonceResponse>('/auth/nonce');

    if (response.errno !== 0 || !response.result) {
      throw new Error(response.errmsg || 'Failed to get nonce');
    }

    return response.result.nonce;
  },

  /**
   * Verify SIWE signature and login
   * POST /auth/verify
   *
   * Verifies the SIWE signature and returns a JWT token.
   * The token should be included in subsequent requests' Authorization header.
   */
  async verifySignature(payload: AuthVerifyRequest): Promise<{ token: string; address: string }> {
    const response = await fetchApi<AuthVerifyResponse>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (response.errno !== 0 || !response.result) {
      throw new Error(response.errmsg || 'Signature verification failed');
    }

    // Store token in localStorage for future requests
    // SECURITY: localStorage is vulnerable to XSS. Consider httpOnly cookies for production.
    if (typeof window !== 'undefined') {
      const expiresAt = Date.now() + DEFAULT_TOKEN_EXPIRY_MS;
      localStorage.setItem(STORAGE_KEYS.TOKEN, response.result.token);
      localStorage.setItem(STORAGE_KEYS.ADDRESS, response.result.address);
      localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES_AT, expiresAt.toString());
    }

    return {
      token: response.result.token,
      address: response.result.address,
    };
  },

  /**
   * Logout and clear stored credentials
   */
  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.ADDRESS);
      localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);
    }
  },

  /**
   * Get current authentication token from localStorage
   */
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  },

  /**
   * Get current authenticated address from localStorage
   */
  getAddress(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.ADDRESS);
  },

  /**
   * Get token expiry timestamp
   * Returns null if no expiry time is stored
   */
  getTokenExpiresAt(): number | null {
    if (typeof window === 'undefined') return null;
    const expiresAt = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);
    return expiresAt ? parseInt(expiresAt, 10) : null;
  },

  /**
   * Check if token is expired or will expire soon (within 5 minutes)
   */
  isTokenExpired(): boolean {
    const expiresAt = this.getTokenExpiresAt();
    if (!expiresAt) return false;
    // Consider token expired if it expires within 5 minutes
    return Date.now() >= expiresAt - 5 * 60 * 1000;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken() && !this.isTokenExpired();
  },

  /**
   * Refresh the authentication token
   * This is a placeholder for future implementation.
   * The backend needs to support a token refresh endpoint.
   *
   * TODO: Implement when backend adds /auth/refresh endpoint
   */
  async refreshToken(): Promise<{ token: string; address: string } | null> {
    // TODO: Implement token refresh when backend endpoint is available
    // For now, this is a no-op that returns null
    console.warn('[authApi] Token refresh not yet implemented - requires backend /auth/refresh endpoint');
    return null;
  },
};
