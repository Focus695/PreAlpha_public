import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, polygon, bsc } from 'viem/chains';
import { logger } from '@/lib/logger';

/**
 * Get WalletConnect Project ID from environment
 * - In development: reads from process.env (Bun dev server)
 * - In production: reads from window.__PREALPHA_ENV__ (injected at build time)
 */
const getWalletConnectProjectId = (): string => {
  // Production: read from window.__PREALPHA_ENV__ (injected at build time)
  if (typeof window !== 'undefined' && window.__PREALPHA_ENV__) {
    const envId = window.__PREALPHA_ENV__.WALLETCONNECT_PROJECT_ID;
    if (envId) {
       logger.info('✅ [PreAlpha] WalletConnect Project ID found in window.__PREALPHA_ENV__');
       return envId;
    }
    logger.warn('⚠️ [PreAlpha] window.__PREALPHA_ENV__ exists but WALLETCONNECT_PROJECT_ID is missing or empty');
  }

  // Development: read from process.env (Bun dev server)
  if (typeof process !== 'undefined' && process.env) {
    const procId = process.env.WALLETCONNECT_PROJECT_ID;
    if (procId) {
        // logger.debug('✅ [PreAlpha] WalletConnect Project ID found in process.env');
        return procId;
    }
  }

  logger.error('❌ [PreAlpha] No WalletConnect Project ID found in environment!');
  return '';
};
logger.debug("Check chains:", { mainnet, polygon, bsc });
export const config = getDefaultConfig({
  appName: 'PreAlpha',
  projectId: getWalletConnectProjectId(),
  chains: [mainnet, polygon, bsc],
  ssr: false,
  // Optional: Add app metadata for better wallet display
  appDescription: 'Prediction Market Smart Money Analysis',
  appUrl: 'YOUR_APP_URL',
  appIcon: 'YOUR_APP_URL/images/logo-icon.png',
});