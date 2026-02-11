/**
 * Auto-Authentication Hook
 *
 * Automatically triggers SIWE signing when wallet connects for the first time.
 * Implements "smart authentication" mode:
 * - First-time connection: Auto-trigger signing
 * - Returning users: Reuse existing token if address matches
 * - User rejection: Remember for 24h cooldown
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAccount, useSignMessage, useChainId } from 'wagmi';
import { useAuthStatus } from '@/hooks/use-auth-status';
import { getAuthToken, getAuthAddress } from '@/lib/auth/authentication-adapter';
import { SiweMessage } from 'siwe';
import { getApiBaseUrl } from '@/lib/api-config';
import { logger } from '@/lib/logger';

/**
 * LocalStorage keys for authentication data
 */
const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_ADDRESS_KEY = 'auth_address';

/**
 * Session storage keys for auto-authentication state management
 */
const STORAGE_KEYS = {
  ATTEMPTED: (address: string) => `autoauth_attempted_${address}`,
  REJECTED: (address: string) => `autoauth_rejected_${address}`,
};

/**
 * Configuration constants
 */
const REJECTION_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours
const TRIGGER_DELAY = 500; // ms delay after connection before triggering

/**
 * Check if an error is a user rejection
 */
function isUserRejection(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('user rejected') ||
      message.includes('user denied') ||
      message.includes('user cancelled') ||
      message.includes('user rejected request') ||
      // Some wallets use error codes
      (error as any).code === 4001 ||
      (error as any).code === 'ACTION_REJECTED'
    );
  }
  return false;
}

/**
 * Options for the auto-authentication hook
 */
export interface UseAutoAuthenticationOptions {
  /** Callback when authentication succeeds */
  onAuthSuccess?: () => void;
  /** Callback when authentication fails */
  onAuthFailed?: (reason: 'user_rejected' | 'network_error' | 'timeout') => void;
  /** Custom rejection cooldown in milliseconds */
  rejectionCooldown?: number;
  /** Delay before triggering auth (ms) */
  triggerDelay?: number;
  /** Disable auto-authentication */
  disabled?: boolean;
}

/**
 * Auto-Authentication Hook
 *
 * Monitors wallet connection state and automatically triggers SIWE signing
 * when appropriate conditions are met.
 *
 * @example
 * ```tsx
 * function AuthWrapper({ children }) {
 *   useAutoAuthentication();
 *   return <RainbowKitAuthenticationProvider>...</RainbowKitAuthenticationProvider>;
 * }
 * ```
 */
export function useAutoAuthentication(options: UseAutoAuthenticationOptions = {}) {
  const {
    onAuthSuccess,
    onAuthFailed,
    rejectionCooldown = REJECTION_COOLDOWN,
    triggerDelay = TRIGGER_DELAY,
    disabled = false,
  } = options;

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const authStatus = useAuthStatus();
  const { signMessageAsync } = useSignMessage();

  // Track if auth is in progress to prevent duplicate triggers
  const isAuthenticating = useRef(false);
  // Track the last address we processed to avoid re-processing
  const processedAddress = useRef<string | null>(null);

  /**
   * Listen for auth state changes from sign out
   * Reset internal state when user signs out to ensure re-authentication on reconnect
   */
  useEffect(() => {
    const handleAuthStateChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ authenticated: boolean }>;
      if (customEvent.detail.authenticated === false) {
        // Reset internal state to ensure next connection triggers authentication
        processedAddress.current = null;
        isAuthenticating.current = false;
        logger.debug('[useAutoAuthentication] Auth state reset due to sign out');
      }
    };

    window.addEventListener('auth-state-changed', handleAuthStateChange);
    return () => {
      window.removeEventListener('auth-state-changed', handleAuthStateChange);
    };
  }, []);

  /**
   * Store JWT token and address after successful authentication
   */
  const storeAuthData = useCallback((token: string, addr: string) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_ADDRESS_KEY, addr);
    // Dispatch custom event to notify other parts of the app about auth state change
    window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { authenticated: true } }));
  }, []);

  /**
   * Mark authentication as attempted for this address
   */
  const markAttempted = useCallback((addr: string) => {
    try {
      sessionStorage.setItem(STORAGE_KEYS.ATTEMPTED(addr), Date.now().toString());
    } catch (e) {
      logger.warn('[useAutoAuthentication] Failed to mark attempted:', e);
    }
  }, []);

  /**
   * Mark user rejection for this address with cooldown
   */
  const markRejected = useCallback((addr: string) => {
    try {
      sessionStorage.setItem(
        STORAGE_KEYS.REJECTED(addr),
        JSON.stringify({ timestamp: Date.now() })
      );
    } catch (e) {
      logger.warn('[useAutoAuthentication] Failed to mark rejected:', e);
    }
  }, []);

  /**
   * Check if user recently rejected authentication for this address
   */
  const wasRecentlyRejected = useCallback((addr: string): boolean => {
    try {
      const rejectedData = sessionStorage.getItem(STORAGE_KEYS.REJECTED(addr));
      if (!rejectedData) return false;

      const { timestamp } = JSON.parse(rejectedData);
      const rejectAge = Date.now() - timestamp;
      return rejectAge < rejectionCooldown;
    } catch (e) {
      return false;
    }
  }, [rejectionCooldown]);

  /**
   * Clear rejection state for this address
   */
  const clearRejection = useCallback((addr: string) => {
    try {
      sessionStorage.removeItem(STORAGE_KEYS.REJECTED(addr));
    } catch (e) {
      logger.warn('[useAutoAuthentication] Failed to clear rejection:', e);
    }
  }, []);

  /**
   * Perform complete SIWE authentication flow
   */
  const performSiweAuthentication = useCallback(async () => {
    if (!address || !chainId) {
      throw new Error('Wallet not connected or chain ID not available');
    }

    logger.debug('[useAutoAuthentication] Step 1: Fetching nonce...');

    // Step 1: Get nonce from backend
    const nonceResponse = await fetch(`${getApiBaseUrl()}/auth/nonce`);
    if (!nonceResponse.ok) {
      throw new Error(`Failed to fetch nonce: ${nonceResponse.statusText}`);
    }
    const nonceData = await nonceResponse.json();

    // Backend returns: { code: 0, msg: "success", result: { nonce: "..." } }
    const nonce =
      (nonceData.result?.nonce as string | undefined) ||
      (nonceData.nonce as string | undefined);

    if (!nonce) {
      throw new Error('Invalid nonce response format');
    }

    logger.debug('[useAutoAuthentication] Step 2: Creating SIWE message...');

    // Step 2: Create SIWE message
    const message = new SiweMessage({
      domain: window.location.host,
      address,
      statement: 'Sign in with Ethereum to PreAlpha',
      uri: window.location.origin,
      version: '1',
      chainId,
      nonce,
    });
    const preparedMessage = message.prepareMessage();

    logger.debug('[useAutoAuthentication] Step 3: Requesting signature...');

    // Step 3: Request signature from wallet
    const signature = await signMessageAsync({ message: preparedMessage });

    logger.debug('[useAutoAuthentication] Step 4: Verifying signature...');

    // Step 4: Verify signature with backend
    const verifyResponse = await fetch(`${getApiBaseUrl()}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: preparedMessage, signature }),
    });

    if (!verifyResponse.ok) {
      throw new Error(`Verification failed: ${verifyResponse.statusText}`);
    }

    const verifyData = await verifyResponse.json();

    // Backend returns: { code: 0, msg: "success", result: { token: "..." } }
    const token =
      (verifyData.result?.token as string | undefined) ||
      (verifyData.token as string | undefined);

    if (!token) {
      throw new Error('Invalid verify response format');
    }

    // Step 5: Store auth data
    storeAuthData(token, address);

    logger.info('[useAutoAuthentication] Authentication successful!');
    return token;
  }, [address, chainId, signMessageAsync, storeAuthData]);

  /**
   * Trigger SIWE authentication
   */
  const triggerAuthentication = useCallback(async () => {
    if (!address || isAuthenticating.current) {
      return;
    }

    isAuthenticating.current = true;
    logger.info('[useAutoAuthentication] Triggering SIWE signing for address:', address);

    try {
      // Small delay to ensure wallet connection is fully settled
      await new Promise(resolve => setTimeout(resolve, triggerDelay));

      // Perform SIWE authentication
      await performSiweAuthentication();

      // Success - mark as attempted
      markAttempted(address);
      clearRejection(address);

      logger.info('[useAutoAuthentication] Authentication successful for:', address);
      onAuthSuccess?.();
    } catch (error) {
      logger.error('[useAutoAuthentication] Authentication failed:', error);

      if (isUserRejection(error)) {
        // User rejected - mark with cooldown
        markRejected(address);
        logger.info('[useAutoAuthentication] User rejected signing, cooldown active');
        onAuthFailed?.('user_rejected');
      } else {
        // Network error or other issue - allow retry
        logger.warn('[useAutoAuthentication] Authentication error (will retry):', error);
        onAuthFailed?.('network_error');
      }
    } finally {
      isAuthenticating.current = false;
      processedAddress.current = address;
    }
  }, [address, markAttempted, clearRejection, markRejected, triggerDelay, performSiweAuthentication, onAuthSuccess, onAuthFailed]);

  /**
   * Main effect: Monitor connection and auth status, trigger when needed
   *
   * CRITICAL: Token is the single source of truth for authentication.
   * If token doesn't exist, user MUST sign again, even if wasAttempted returns true.
   */
  useEffect(() => {
    // Disabled or no wallet connected
    if (disabled || !isConnected || !address) {
      return;
    }

    // Already authenticated - no action needed
    if (authStatus === 'authenticated') {
      logger.debug('[useAutoAuthentication] Already authenticated, skipping');
      return;
    }

    // Address hasn't changed since last processing
    if (processedAddress.current === address) {
      logger.debug('[useAutoAuthentication] Address already processed, skipping');
      return;
    }

    // Check if user recently rejected authentication (respect cooldown)
    if (wasRecentlyRejected(address)) {
      logger.debug('[useAutoAuthentication] User recently rejected, respecting cooldown');
      processedAddress.current = address;
      return;
    }

    // Check for existing token in localStorage (silent re-use)
    // This check MUST come before wasAttempted, as token is the source of truth
    const existingToken = getAuthToken();
    const existingAddress = getAuthAddress();

    if (existingToken && existingAddress?.toLowerCase() === address.toLowerCase()) {
      // Token exists for this address - useAuthStatus will detect it
      logger.debug('[useAutoAuthentication] Found existing token for address:', address);
      processedAddress.current = address;
      markAttempted(address); // Mark as attempted since we have a valid token
      return;
    }

    // If we have a token but for a different address, clear it and the old address state
    if (existingToken && existingAddress?.toLowerCase() !== address.toLowerCase()) {
      logger.info('[useAutoAuthentication] Clearing stale token for different address');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_address');

      // Clear the old address's sessionStorage state
      try {
        // existingAddress is non-null here because existingToken exists and address doesn't match
        sessionStorage.removeItem(STORAGE_KEYS.ATTEMPTED(existingAddress!));
        sessionStorage.removeItem(STORAGE_KEYS.REJECTED(existingAddress!));
      } catch (e) {
        logger.warn('[useAutoAuthentication] Failed to clear old address state:', e);
      }
    }

    // NOTE: wasAttempted check was REMOVED from here.
    // Even if this address was attempted before, if there's no valid token now,
    // we MUST trigger authentication. This handles the sign-out -> reconnect case.

    // All checks passed - trigger authentication
    const timer = setTimeout(() => {
      triggerAuthentication();
    }, 100); // Small delay to ensure state is settled

    return () => clearTimeout(timer);
  }, [
    disabled,
    isConnected,
    address,
    authStatus,
    wasRecentlyRejected,
    markAttempted,
    triggerAuthentication,
  ]);

  /**
   * Reset processed address when disconnected
   */
  useEffect(() => {
    if (!isConnected) {
      processedAddress.current = null;
      isAuthenticating.current = false;
    }
  }, [isConnected]);

  return {
    isAuthenticating: isAuthenticating.current,
    triggerAuthentication,
  };
}
