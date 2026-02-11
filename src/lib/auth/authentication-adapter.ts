/**
 * SIWE Authentication Adapter for RainbowKit
 *
 * This adapter connects RainbowKit to the backend SIWE authentication flow:
 * 1. Get nonce from backend
 * 2. User signs message with wallet
 * 3. Send signed message to backend for verification
 * 4. Backend returns JWT token
 * 5. Store JWT token in localStorage for API requests
 */

import { createAuthenticationAdapter } from '@rainbow-me/rainbowkit';
import { SiweMessage } from 'siwe';
import { getApiBaseUrl } from '../api-config';
import { logger } from '../logger';

/**
 * LocalStorage key for storing JWT token
 */
const AUTH_TOKEN_KEY = 'auth_token';

/**
 * LocalStorage key for storing authenticated wallet address
 */
const AUTH_ADDRESS_KEY = 'auth_address';

/**
 * SIWE Authentication Adapter
 *
 * This adapter handles the complete authentication flow:
 * - Fetches nonce from backend
 * - Creates SIWE message for signing
 * - Verifies signature with backend
 * - Stores JWT token for authenticated API requests
 */
export const authenticationAdapter = createAuthenticationAdapter({
  /**
   * Step 1: Get Nonce
   *
   * Fetches a random nonce from the backend to prevent replay attacks.
   * This nonce will be included in the SIWE message that the user signs.
   *
   * Backend endpoint: GET /auth/nonce
   * Returns: { nonce: string }
   */
  getNonce: async () => {
    try {
      logger.debug('🔑 Fetching nonce from:', `${getApiBaseUrl()}/auth/nonce`);
      const response = await fetch(`${getApiBaseUrl()}/auth/nonce`);

      if (!response.ok) {
        throw new Error(`Failed to fetch nonce: ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug('📦 Nonce response:', data);

      // Backend returns: { code: 0, msg: "success", result: { nonce: "..." } }
      // Extract nonce from result
      if (data.code === 0 && data.result && data.result.nonce) {
        logger.debug('✅ Nonce received:', data.result.nonce);
        return data.result.nonce;
      }

      // Fallback: check if nonce is at top level (for different backend formats)
      if (data.nonce) {
        logger.debug('✅ Nonce received (fallback):', data.nonce);
        return data.nonce;
      }

      throw new Error('Invalid nonce response format');
    } catch (error) {
      logger.error('❌ Error fetching nonce:', error);
      throw error;
    }
  },

  /**
   * Step 2: Create Message
   *
   * Creates a SIWE message that the user will sign with their wallet.
   * This message includes the nonce from step 1 and proves ownership of the address.
   *
   * This function is automatically called by RainbowKit after getNonce.
   * 
   * IMPORTANT: Must return a STRING (prepared message), not a SiweMessage object.
   * RainbowKit uses this string to request a signature from the wallet.
   */
  createMessage: ({ nonce, address, chainId }) => {
    try {
      logger.debug('📝 Creating SIWE message with params:', {
        nonce,
        address,
        chainId,
        domain: window.location.host,
        uri: window.location.origin,
      });

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
      logger.debug('✅ SIWE message created successfully:', preparedMessage);
      logger.debug('📤 Returning prepared message string to RainbowKit for signing...');

      // CRITICAL: Return the prepared message STRING, not the SiweMessage object
      // RainbowKit needs the string to request wallet signature
      return preparedMessage;
    } catch (error) {
      logger.error('❌ Error creating SIWE message:', error);
      throw error;
    }
  },

  /**
   * Step 3: Verify Signature
   *
   * Sends the signed message to the backend for verification.
   * If verification succeeds, backend returns a JWT token.
   * The token is stored in localStorage for subsequent API requests.
   *
   * Backend endpoint: POST /auth/verify
   * Request: { message: string, signature: string }
   * Response: { ok: boolean, token?: string, error?: string }
   */
  verify: async ({ message, signature }) => {
    try {
      logger.debug('🔐 verify() called - Starting signature verification');
      logger.debug('📨 Message to verify:', message);
      logger.debug('✍️ Signature:', signature);
      logger.debug('🌐 Calling verify endpoint:', `${getApiBaseUrl()}/auth/verify`);

      const verifyRes = await fetch(`${getApiBaseUrl()}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature }),
      });

      logger.debug('📡 Verify response status:', verifyRes.status, verifyRes.statusText);

      const data = await verifyRes.json();
      logger.debug('📦 Verify response data:', data);

      // Backend returns: { code: 0, msg: "success", result: { token: "..." } }
      // Check if verification successful
      if (data.code === 0 && data.result && data.result.token) {
        // Store JWT token in localStorage
        localStorage.setItem(AUTH_TOKEN_KEY, data.result.token);

        // Store wallet address for reference
        // Parse the message string to extract address
        try {
          const siweMessage = new SiweMessage(message);
          localStorage.setItem(AUTH_ADDRESS_KEY, siweMessage.address);
          logger.info('✅ Authentication successful - Token stored, address:', siweMessage.address);
        } catch (parseError) {
          logger.warn('⚠️ Could not parse SIWE message to extract address:', parseError);
          // Try to extract address from message string manually
          const addressMatch = message.match(/address:\s*([0-9a-fA-Fx]+)/);
          if (addressMatch) {
            localStorage.setItem(AUTH_ADDRESS_KEY, addressMatch[1]);
          }
        }

        // Dispatch custom event to notify other parts of the app about auth state change
        window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { authenticated: true } }));

        return true;
      }

      // Also support alternative format: { ok: true, token: "..." }
      if (data.ok && data.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        try {
          const siweMessage = new SiweMessage(message);
          localStorage.setItem(AUTH_ADDRESS_KEY, siweMessage.address);
          logger.info('✅ Authentication successful - Token stored, address:', siweMessage.address);
        } catch (parseError) {
          logger.warn('⚠️ Could not parse SIWE message to extract address:', parseError);
        }

        // Dispatch custom event to notify other parts of the app about auth state change
        window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { authenticated: true } }));

        return true;
      }

      // Verification failed
      logger.error('❌ Authentication failed:', data.msg || data.error || 'Unknown error');
      logger.error('❌ Full response:', JSON.stringify(data, null, 2));
      return false;
    } catch (error) {
      logger.error('❌ Error during verification:', error);
      throw error;
    }
  },

  /**
   * Step 4: Sign Out
   *
   * Clears authentication data from localStorage and sessionStorage.
   *
   * Optional: If backend maintains session state, call backend logout endpoint:
   * POST /auth/logout with Authorization header
   */
  signOut: async () => {
    // Get current address before clearing auth data
    const currentAddress = localStorage.getItem(AUTH_ADDRESS_KEY);

    // Clear authentication data from localStorage
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_ADDRESS_KEY);

    // Clear all user data caches (user_data_<address>)
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('user_data_')) {
        localStorage.removeItem(key);
      }
    });

    // FIX: Clear sessionStorage auto-auth state to force re-signing on next connection
    // This ensures user must sign again after logout, even if they reconnect with the same address
    if (currentAddress) {
      try {
        sessionStorage.removeItem(`autoauth_attempted_${currentAddress}`);
        sessionStorage.removeItem(`autoauth_rejected_${currentAddress}`);
        logger.debug('🔓 Cleared auto-auth state for address:', currentAddress);
      } catch (e) {
        logger.warn('[signOut] Failed to clear sessionStorage:', e);
      }
    }

    // Dispatch custom event to notify other parts of the app about auth state change
    window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { authenticated: false } }));

    logger.info('🔓 Signed out successfully');
  },
});

/**
 * Get stored JWT token
 * Used by API client to include authentication in requests
 */
export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Get authenticated wallet address
 */
export function getAuthAddress(): string | null {
  return localStorage.getItem(AUTH_ADDRESS_KEY);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}
