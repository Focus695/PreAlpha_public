/**
 * Labels API Endpoints
 *
 * API endpoints for managing wallet labels.
 */

import type { EthAddress } from '@/types';
import { fetchApi } from '../client';
import { withMockFallback } from '../health';
import type {
  WalletLabel,
  PopularLabel,
  UserLabelsResponse,
  LabelAuth,
} from '../types';

export const labelsApi = {
  // ============================================================
  // Stats endpoints (existing - keep for compatibility)
  // ============================================================

  /**
   * Get popular labels
   * GET /labels/stats/popular
   */
  async getPopularLabels(limit?: number): Promise<PopularLabel[]> {
    const params = limit !== undefined ? `?limit=${limit}` : '';
    return fetchApi(`/labels/stats/popular${params}`);
  },

  /**
   * Get recent labels
   * GET /labels/stats/recent
   */
  async getRecentLabels(limit?: number): Promise<WalletLabel[]> {
    const params = limit !== undefined ? `?limit=${limit}` : '';
    return fetchApi(`/labels/stats/recent${params}`);
  },

  // ============================================================
  // User label management (per OpenAPI spec)
  // ============================================================

  /**
   * Add labels to a wallet address
   * POST /user/labels/add
   *
   * New labels are appended to existing labels.
   */
  async addLabels(
    targetAddress: EthAddress,
    labels: string[]
  ): Promise<{ targetAddress: string; labels: string[]; createdAt: number; updatedAt: number }> {
    const response = await fetchApi<{
      errno: number;
      errmsg: string;
      result: { targetAddress: string; labels: string[]; createdAt: number; updatedAt: number } | null;
    }>('/user/labels/add', {
      method: 'POST',
      body: JSON.stringify({
        targetAddress,
        labels,
      }),
    });

    if (response.errno !== 0 || !response.result) {
      throw new Error(response.errmsg || 'Failed to add labels');
    }

    return response.result;
  },

  /**
   * Remove labels from a wallet address
   * POST /user/labels/remove
   *
   * Only the specified labels are removed; other labels remain.
   */
  async removeLabels(
    targetAddress: EthAddress,
    labels: string[]
  ): Promise<{ targetAddress: string; labels: string[]; createdAt: number; updatedAt: number }> {
    const response = await fetchApi<{
      errno: number;
      errmsg: string;
      result: { targetAddress: string; labels: string[]; createdAt: number; updatedAt: number } | null;
    }>('/user/labels/remove', {
      method: 'POST',
      body: JSON.stringify({
        targetAddress,
        labels,
      }),
    });

    if (response.errno !== 0 || !response.result) {
      throw new Error(response.errmsg || 'Failed to remove labels');
    }

    return response.result;
  },

  /**
   * Set all labels for a wallet (replaces existing)
   * PUT /user/labels
   */
  async setLabels(
    targetAddress: EthAddress,
    labels: string[]
  ): Promise<{ targetAddress: string; labels: string[]; createdAt: number; updatedAt: number }> {
    const response = await fetchApi<{
      errno: number;
      errmsg: string;
      result: { targetAddress: string; labels: string[]; createdAt: number; updatedAt: number } | null;
    }>('/user/labels', {
      method: 'PUT',
      body: JSON.stringify({
        targetAddress,
        labels,
      }),
    });

    if (response.errno !== 0 || !response.result) {
      throw new Error(response.errmsg || 'Failed to set labels');
    }

    return response.result;
  },

  /**
   * Get labels for a specific wallet address
   * GET /user/labels/{targetAddress}
   */
  async getWalletLabels(targetAddress: EthAddress): Promise<{ targetAddress: string; labels: string[]; createdAt: number; updatedAt: number } | null> {
    const response = await fetchApi<{
      errno: number;
      errmsg: string;
      result: { targetAddress: string; labels: string[]; createdAt: number; updatedAt: number } | null;
    }>(`/user/labels/${targetAddress}`);

    if (response.errno !== 0 || !response.result) {
      return null;
    }

    return response.result;
  },

  /**
   * Clear all labels for a wallet address
   * DELETE /user/labels/{targetAddress}
   */
  async clearAllLabels(targetAddress: EthAddress): Promise<{ targetAddress: string; labels: string[]; createdAt: number; updatedAt: number }> {
    const response = await fetchApi<{
      errno: number;
      errmsg: string;
      result: { targetAddress: string; labels: string[]; createdAt: number; updatedAt: number } | null;
    }>(`/user/labels/${targetAddress}`, {
      method: 'DELETE',
    });

    if (response.errno !== 0 || !response.result) {
      throw new Error(response.errmsg || 'Failed to clear labels');
    }

    return response.result;
  },

  /**
   * Get all user's labels
   * GET /user/labels
   *
   * Returns all labels across all wallets.
   */
  async getAllUserLabels(): Promise<Array<{ targetAddress: string; labels: string[]; createdAt: number; updatedAt: number }>> {
    const response = await fetchApi<{
      errno: number;
      errmsg: string;
      result: Array<{ targetAddress: string; labels: string[]; createdAt: number; updatedAt: number }> | null;
    }>('/user/labels');

    if (response.errno !== 0 || !response.result) {
      return [];
    }

    return response.result;
  },

  /**
   * Get all unique label names
   * GET /user/labels/unique
   */
  async getUniqueLabels(): Promise<string[]> {
    const response = await fetchApi<{
      errno: number;
      errmsg: string;
      result: string[] | null;
    }>('/user/labels/unique');

    if (response.errno !== 0 || !response.result) {
      return [];
    }

    return response.result;
  },

  /**
   * Search wallets by label
   * GET /user/labels/search/{label}
   */
  async searchByLabel(label: string): Promise<Array<{ targetAddress: string; labels: string[]; createdAt: number; updatedAt: number }>> {
    const response = await fetchApi<{
      errno: number;
      errmsg: string;
      result: Array<{ targetAddress: string; labels: string[]; createdAt: number; updatedAt: number }> | null;
    }>(`/user/labels/search/${label}`);

    if (response.errno !== 0 || !response.result) {
      return [];
    }

    return response.result;
  },

  // ============================================================
  // Legacy methods (for backward compatibility)
  // ============================================================

  /**
   * Create wallet label (legacy)
   * POST /labels/
   * @deprecated Use addLabels() instead
   */
  async createLabel(
    walletAddress: EthAddress,
    labelName: string,
    auth: LabelAuth
  ): Promise<WalletLabel> {
    return fetchApi('/labels/', {
      method: 'POST',
      body: JSON.stringify({
        walletAddress,
        labelName,
        auth,
      }),
    });
  },

  /**
   * Get user labels (string array format) - legacy
   * @deprecated Use getWalletLabels() instead
   */
  async getUserLabels(walletAddress: string): Promise<UserLabelsResponse> {
    return withMockFallback(
      'userLabels',
      () => fetchApi(`/user/labels/${walletAddress}`),
      () => ({
        code: 0,
        msg: 'success',
        result: [],
      })
    );
  },

  /**
   * Delete a label by ID (legacy)
   * DELETE /labels/{id}
   * @deprecated Use removeLabels() instead
   */
  async deleteLabel(id: number, auth: LabelAuth): Promise<{ success: boolean }> {
    return fetchApi(`/labels/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ auth }),
    });
  },
};
