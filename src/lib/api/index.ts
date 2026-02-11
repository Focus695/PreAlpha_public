/**
 * API Client
 * Unified API client with modular endpoints
 */

import { fetchApi } from './client';
import { marketApi } from './endpoints/market';
import { tokenApi } from './endpoints/token';
import { tradesApi } from './endpoints/trades';
import { positionsApi } from './endpoints/positions';
import { leaderboardApi } from './endpoints/leaderboard';
import { labelsApi } from './endpoints/labels';
import { profileApi } from './endpoints/profile';
import { signalsApi } from './endpoints/signals';
import { quoteTokenApi } from './endpoints/quote-token';
import { smartWalletsApi } from './endpoints/smart-wallets';
import { authApi } from './endpoints/auth';
import { userApi } from './endpoints/user';

// ============================================================
// Unified API Client
// ============================================================

export const apiClient = {
  // Market endpoints
  getMarkets: marketApi.getMarkets,
  getBinaryMarket: marketApi.getBinaryMarket,
  getCategoricalMarket: marketApi.getCategoricalMarket,

  // Token endpoints
  getTokenLatestPrice: tokenApi.getTokenLatestPrice,
  getTokenOrderbook: tokenApi.getTokenOrderbook,
  getTokenPriceHistory: tokenApi.getTokenPriceHistory,

  // Trade endpoints
  getUserTrades: tradesApi.getUserTrades,

  // Position endpoints
  getUserPositions: positionsApi.getUserPositions,

  // Quote token endpoints
  getQuoteTokens: quoteTokenApi.getQuoteTokens,

  // Leaderboard endpoints
  getLeaderboard: leaderboardApi.getLeaderboard,
  getProfitLeaderboard24h: leaderboardApi.getProfitLeaderboard24h,
  getProfitLeaderboard7d: leaderboardApi.getProfitLeaderboard7d,
  getProfitLeaderboard30d: leaderboardApi.getProfitLeaderboard30d,
  getProfitLeaderboardAllTime: leaderboardApi.getProfitLeaderboardAllTime,
  getVolumeLeaderboard24h: leaderboardApi.getVolumeLeaderboard24h,
  getVolumeLeaderboard7d: leaderboardApi.getVolumeLeaderboard7d,
  getVolumeLeaderboard30d: leaderboardApi.getVolumeLeaderboard30d,
  getVolumeLeaderboardAllTime: leaderboardApi.getVolumeLeaderboardAllTime,
  getLeaderboardEnriched: leaderboardApi.getLeaderboardEnriched,
  getUserProfile: leaderboardApi.getUserProfile,
  getUserVolumeDistribution: leaderboardApi.getUserVolumeDistribution,
  getCategoryDistribution: leaderboardApi.getCategoryDistribution,

  // Label endpoints
  createLabel: labelsApi.createLabel,
  getPopularLabels: labelsApi.getPopularLabels,
  getRecentLabels: labelsApi.getRecentLabels,
  getWalletLabels: labelsApi.getWalletLabels,
  getUserLabels: labelsApi.getUserLabels,
  deleteLabel: labelsApi.deleteLabel,

  // Profile endpoints
  getAddressProfile: profileApi.getAddressProfile,
  getTraderPerformance: profileApi.getTraderPerformance,

  // Signal endpoints
  getSignals: signalsApi.getSignals,

  // Smart Wallet endpoints
  getSmartWallets: smartWalletsApi.getSmartWallets,
  getSmartWallet: smartWalletsApi.getSmartWallet,
  getSmartWalletsStats: smartWalletsApi.getSmartWalletsStatsOverview,

  // Auth endpoints
  getNonce: authApi.getNonce,
  verifySignature: authApi.verifySignature,
  logout: authApi.logout,
  getToken: authApi.getToken,
  getAddress: authApi.getAddress,
  isAuthenticated: authApi.isAuthenticated,

  // User endpoints
  getCurrentUserProfile: userApi.getProfile,
  updateFollowing: userApi.updateFollowing,
  followTarget: userApi.followTarget,
  unfollowTarget: userApi.unfollowTarget,
  addLabels: userApi.addLabels,
  removeLabels: userApi.removeLabels,
  setLabels: userApi.setLabels,
  getAllUserLabels: userApi.getAllLabels,
  getWalletUserLabels: userApi.getWalletLabels,
  clearWalletUserLabels: userApi.clearWalletLabels,
  getUniqueUserLabels: userApi.getUniqueLabels,
  searchUserLabelsByLabel: userApi.searchByLabel,
  setRemark: userApi.setRemark,
  getAllRemarks: userApi.getAllRemarks,
  getWalletRemark: userApi.getWalletRemark,
  deleteRemark: userApi.deleteRemark,
  searchRemarksByKeyword: userApi.searchRemarks,

  // Health check
  async healthCheck(): Promise<unknown> {
    return fetchApi('/');
  },
};

// ============================================================
// Re-exports
// ============================================================

// Export all types
export * from './types';

// Export individual API modules for direct access
export { marketApi } from './endpoints/market';
export { tokenApi } from './endpoints/token';
export { tradesApi } from './endpoints/trades';
export { positionsApi } from './endpoints/positions';
export { leaderboardApi } from './endpoints/leaderboard';
export { labelsApi } from './endpoints/labels';
export { profileApi } from './endpoints/profile';
export { signalsApi } from './endpoints/signals';
export { quoteTokenApi } from './endpoints/quote-token';
export { smartWalletsApi } from './endpoints/smart-wallets';
export { authApi } from './endpoints/auth';
export { userApi } from './endpoints/user';

// Export utilities
export { fetchApi } from './client';
export { withMockFallback, type ApiResource, type DataSourceTag } from './health';
export { USE_MOCK, getEnvValue } from './config';

// Re-export domain types for convenience
export type { AddressProfile, LeaderboardEntry, Signal, ApiResponse, TimeRange } from '@/types';
