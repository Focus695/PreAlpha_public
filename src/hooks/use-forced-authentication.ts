/**
 * Forced Authentication Hook
 *
 * Provides authentication guard for operations that require JWT authentication.
 * When a user attempts a protected operation without being authenticated,
 * this hook will trigger the SIWE signing flow via RainbowKit.
 *
 * Usage:
 * ```typescript
 * const { requireAuth, withAuth } = useForcedAuthentication();
 *
 * // Option 1: Check before operation
 * const handleClick = async () => {
 *   if (await requireAuth('follow')) {
 *     // Proceed with operation
 *   }
 * };
 *
 * // Option 2: Wrap operation
 * const result = await withAuth('follow', () => doSomething());
 * ```
 */

import { useCallback, useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useAuthStatus } from './use-auth-status';
import { logger } from '@/lib/logger';

type AuthOperation = 'follow' | 'remark' | 'labels' | 'userData';

interface UseForcedAuthenticationOptions {
  onAuthRequired?: () => void;
  onAuthSuccess?: () => void;
  onAuthError?: (error: Error) => void;
}

interface UseForcedAuthenticationReturn {
  /** Check authentication and trigger SIWE flow if needed */
  requireAuth: (operation?: AuthOperation) => Promise<boolean>;
  /** Wrap an operation with authentication check */
  withAuth: <T>(operation: AuthOperation, fn: () => Promise<T> | T) => Promise<T | null>;
  /** Is wallet connected */
  isConnected: boolean;
  /** Is JWT authenticated */
  isAuthenticated: boolean;
  /** Current authentication status */
  authStatus: 'loading' | 'unauthenticated' | 'authenticated';
  /** Is authentication modal currently open */
  isAuthenticating: boolean;
}

const AUTH_CHECK_INTERVAL = 100; // ms
const AUTH_TIMEOUT = 10000; // 10 seconds

/**
 * Get JWT token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

/**
 * Hook for forced authentication
 *
 * This hook checks if the user is authenticated (has valid JWT token)
 * before allowing protected operations. If not authenticated, it triggers
 * the SIWE signing flow via RainbowKit's authentication modal.
 */
export function useForcedAuthentication(
  options?: UseForcedAuthenticationOptions
): UseForcedAuthenticationReturn {
  const { isConnected, address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const authStatus = useAuthStatus();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Reset authenticating state when auth status changes
  useEffect(() => {
    if (authStatus === 'authenticated') {
      setIsAuthenticating(false);
    }
  }, [authStatus]);

  /**
   * Check authentication status, trigger SIWE flow if needed
   * @returns Promise<boolean> - Whether authentication was successful
   */
  const requireAuth = useCallback(
    async (operation: AuthOperation = 'userData'): Promise<boolean> => {
      logger.debug(`[useForcedAuthentication] Checking auth for operation: ${operation}`);

      // Check wallet connection
      if (!isConnected || !address) {
        logger.debug('[useForcedAuthentication] Wallet not connected');
        options?.onAuthRequired?.();
        return false;
      }

      // Check JWT authentication status
      if (authStatus !== 'authenticated') {
        logger.debug('[useForcedAuthentication] Not authenticated, opening auth modal');
        options?.onAuthRequired?.();

        setIsAuthenticating(true);

        try {
          // Open SIWE signing modal (via connect modal which triggers auth)
          await openConnectModal?.();

          // Wait for authentication to complete
          // RainbowKit doesn't provide a callback, so we poll for token
          const startTime = Date.now();
          let token = getAuthToken();

          while (!token && Date.now() - startTime < AUTH_TIMEOUT) {
            await new Promise((resolve) => setTimeout(resolve, AUTH_CHECK_INTERVAL));
            token = getAuthToken();
            // Note: authStatus is checked by getAuthToken() directly
          }

          if (token) {
            logger.debug('[useForcedAuthentication] Authentication successful');
            setIsAuthenticating(false);
            options?.onAuthSuccess?.();
            return true;
          }

          logger.warn('[useForcedAuthentication] Authentication timeout');
          setIsAuthenticating(false);
          return false;
        } catch (error) {
          logger.error('[useForcedAuthentication] Authentication error:', error);
          setIsAuthenticating(false);
          options?.onAuthError?.(error as Error);
          return false;
        }
      }

      // Already authenticated
      logger.debug('[useForcedAuthentication] Already authenticated');
      return true;
    },
    [isConnected, address, authStatus, openConnectModal, options]
  );

  /**
   * Wrap an operation with authentication check
   */
  const withAuth = useCallback(
    async <T,>(
      operation: AuthOperation,
      fn: () => Promise<T> | T
    ): Promise<T | null> => {
      const isAuth = await requireAuth(operation);
      if (!isAuth) {
        return null;
      }
      return fn();
    },
    [requireAuth]
  );

  return {
    requireAuth,
    withAuth,
    isConnected,
    isAuthenticated: authStatus === 'authenticated',
    authStatus,
    isAuthenticating,
  };
}
