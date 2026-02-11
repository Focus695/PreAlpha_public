/**
 * Authentication Status Hook
 *
 * Manages authentication status for RainbowKitAuthenticationProvider.
 * Checks localStorage for existing JWT token and syncs with wallet connection state.
 */

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import type { AuthStatus } from '@/types/user';
import { getAuthToken, getAuthAddress } from '@/lib/auth/authentication-adapter';

/**
 * Hook to manage authentication status
 *
 * This hook provides the authentication status required by RainbowKitAuthenticationProvider.
 * It determines if the user is authenticated based on:
 * 1. Whether a valid JWT token exists in localStorage
 * 2. Whether the wallet is connected
 * 3. Whether the connected wallet matches the authenticated address
 *
 * Status transitions:
 * - 'loading': Initial state, checking authentication
 * - 'unauthenticated': No token or wallet not connected
 * - 'authenticated': Valid token and wallet connected with matching address
 */
export function useAuthStatus(): AuthStatus {
  const { address, isConnected } = useAccount();
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    // Check authentication status
    const checkAuth = () => {
      // If wallet is not connected, user is unauthenticated
      if (!isConnected || !address) {
        setStatus('unauthenticated');
        return;
      }

      // Check if we have a stored token
      const token = getAuthToken();
      const authAddress = getAuthAddress();

      // If no token, user needs to authenticate
      if (!token) {
        setStatus('unauthenticated');
        return;
      }

      // If token exists but address doesn't match, clear stale auth data
      if (authAddress && authAddress.toLowerCase() !== address.toLowerCase()) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_address');
        setStatus('unauthenticated');
        return;
      }

      // Token exists and address matches (or no address stored), user is authenticated
      setStatus('authenticated');
    };

    // Initial check
    checkAuth();

    // Listen for storage events (for cross-tab synchronization)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token' || e.key === 'auth_address') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [address, isConnected]);

  return status;
}
