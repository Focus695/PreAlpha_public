/**
 * User Management API Endpoints
 * Handles user profile, following, labels, and remarks
 */

import { fetchApi } from '../client';
import type {
  UserProfileDataResponse,
  UpdateFollowingRequest,
  FollowingUpdateDataResponse,
  FollowTargetRequest,
  LabelData,
  LabelsRequest,
  LabelsDataResponse,
  AllLabelsDataResponse,
  UniqueLabelsDataResponse,
  RemarkData,
  RemarkRequest,
  RemarkDataResponse,
  AllRemarksDataResponse,
  RemarkDeleteDataResponse,
  SearchLabelsDataResponse,
  SearchRemarksDataResponse,
} from '../types';

// Type aliases for internal use
type UserProfileResponse = UserProfileDataResponse;
type FollowingUpdateResponse = FollowingUpdateDataResponse;
type LabelsResponse = LabelsDataResponse;
type AllLabelsResponse = AllLabelsDataResponse;
type UniqueLabelsResponse = UniqueLabelsDataResponse;
type RemarkResponse = RemarkDataResponse;
type AllRemarksResponse = AllRemarksDataResponse;
type RemarkDeleteResponse = RemarkDeleteDataResponse;
type SearchLabelsResponse = SearchLabelsDataResponse;
type SearchRemarksResponse = SearchRemarksDataResponse;

// Re-export types for convenience
export type {
  UserProfileDataResponse as UserProfileResponse,
  UpdateFollowingRequest,
  FollowingUpdateDataResponse as FollowingUpdateResponse,
  FollowTargetRequest,
  LabelData,
  LabelsRequest,
  LabelsDataResponse as LabelsResponse,
  AllLabelsDataResponse as AllLabelsResponse,
  UniqueLabelsDataResponse as UniqueLabelsResponse,
  RemarkData,
  RemarkRequest,
  RemarkDataResponse as RemarkResponse,
  AllRemarksDataResponse as AllRemarksResponse,
  RemarkDeleteDataResponse as RemarkDeleteResponse,
};

// ============================================================
// User API
// ============================================================

export const userApi = {
  // ==================== Profile ====================

  /**
   * Get current user profile
   * GET /user/profile
   *
   * Returns following list and following count for the authenticated user.
   */
  async getProfile(): Promise<{ followingWallets: string[]; followingCount: number }> {
    const response = await fetchApi<UserProfileResponse>('/user/profile');

    if (response.errno !== 0 || !response.result) {
      throw new Error(response.errmsg || 'Failed to get user profile');
    }

    return response.result;
  },

  // ==================== Following ====================

  /**
   * Update following list (replace all)
   * PUT /user/following
   *
   * Completely replaces the current user's following wallet list.
   */
  async updateFollowing(payload: UpdateFollowingRequest): Promise<{ followingWallets: string[]; followingCount: number }> {
    const response = await fetchApi<FollowingUpdateResponse>('/user/following', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    if (response.errno !== 0 || !response.result) {
      throw new Error(response.errmsg || 'Failed to update following list');
    }

    return response.result;
  },

  /**
   * Follow a single wallet
   * POST /user/following/follow
   *
   * Adds a single wallet to the following list.
   * Returns error if already following.
   */
  async followTarget(payload: FollowTargetRequest): Promise<{ followingWallets: string[]; followingCount: number }> {
    const response = await fetchApi<FollowingUpdateResponse>('/user/following/follow', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (response.errno !== 0 || !response.result) {
      throw new Error(response.errmsg || 'Failed to follow wallet');
    }

    return response.result;
  },

  /**
   * Unfollow a single wallet
   * POST /user/following/unfollow
   *
   * Removes a single wallet from the following list.
   * Returns error if not following.
   */
  async unfollowTarget(payload: FollowTargetRequest): Promise<{ followingWallets: string[]; followingCount: number }> {
    const response = await fetchApi<FollowingUpdateResponse>('/user/following/unfollow', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (response.errno !== 0 || !response.result) {
      throw new Error(response.errmsg || 'Failed to unfollow wallet');
    }

    return response.result;
  },

  // ==================== Labels ====================

  /**
   * Add labels to a wallet (append)
   * POST /user/labels/add
   *
   * Appends new labels to the existing labels list.
   */
  async addLabels(payload: LabelsRequest): Promise<LabelData> {
    const response = await fetchApi<LabelsResponse>('/user/labels/add', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (response.errno !== 0 || !response.result) {
      throw new Error(response.errmsg || 'Failed to add labels');
    }

    return response.result;
  },

  /**
   * Remove labels from a wallet
   * POST /user/labels/remove
   *
   * Removes specified labels from a wallet. Other labels are preserved.
   */
  async removeLabels(payload: LabelsRequest): Promise<LabelData> {
    const response = await fetchApi<LabelsResponse>('/user/labels/remove', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (response.errno !== 0 || !response.result) {
      throw new Error(response.errmsg || 'Failed to remove labels');
    }

    return response.result;
  },

  /**
   * Set labels for a wallet (replace all)
   * PUT /user/labels
   *
   * Replaces all existing labels with the new list.
   */
  async setLabels(payload: LabelsRequest): Promise<LabelData> {
    const response = await fetchApi<LabelsResponse>('/user/labels', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    if (response.errno !== 0 || !response.result) {
      throw new Error(response.errmsg || 'Failed to set labels');
    }

    return response.result;
  },

  /**
   * Get all labels
   * GET /user/labels
   *
   * Returns all labels created by the current user.
   */
  async getAllLabels(): Promise<LabelData[]> {
    const response = await fetchApi<AllLabelsResponse>('/user/labels');

    if (response.errno !== 0 || !response.result) {
      return [];
    }

    return response.result;
  },

  /**
   * Get labels for a specific wallet
   * GET /user/labels/{targetAddress}
   */
  async getWalletLabels(targetAddress: string): Promise<LabelData | null> {
    const response = await fetchApi<LabelsResponse>(`/user/labels/${targetAddress}`);

    if (response.errno !== 0 || !response.result) {
      return null;
    }

    return response.result;
  },

  /**
   * Clear all labels for a wallet
   * DELETE /user/labels/{targetAddress}
   */
  async clearWalletLabels(targetAddress: string): Promise<LabelData> {
    const response = await fetchApi<LabelsResponse>(`/user/labels/${targetAddress}`, {
      method: 'DELETE',
    });

    if (response.errno !== 0 || !response.result) {
      throw new Error(response.errmsg || 'Failed to clear labels');
    }

    return response.result;
  },

  /**
   * Get all unique labels
   * GET /user/labels/unique
   *
   * Returns all unique labels used by the current user.
   */
  async getUniqueLabels(): Promise<string[]> {
    const response = await fetchApi<UniqueLabelsResponse>('/user/labels/unique');

    if (response.errno !== 0 || !response.result) {
      return [];
    }

    return response.result;
  },

  /**
   * Search wallets by label
   * GET /user/labels/search/{label}
   *
   * Returns all wallets with the specified label.
   */
  async searchByLabel(label: string): Promise<LabelData[]> {
    const response = await fetchApi<SearchLabelsResponse>(`/user/labels/search/${label}`);

    if (response.errno !== 0 || !response.result) {
      return [];
    }

    return response.result;
  },

  // ==================== Remarks ====================

  /**
   * Add or update a remark for a wallet
   * POST /user/remarks
   *
   * Each user can have only one remark per wallet.
   * If a remark exists, it will be updated.
   */
  async setRemark(payload: RemarkRequest): Promise<RemarkData> {
    const response = await fetchApi<RemarkResponse>('/user/remarks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (response.errno !== 0 || !response.result) {
      throw new Error(response.errmsg || 'Failed to set remark');
    }

    return response.result;
  },

  /**
   * Get all remarks
   * GET /user/remarks
   *
   * Returns all remarks created by the current user.
   */
  async getAllRemarks(): Promise<RemarkData[]> {
    const response = await fetchApi<AllRemarksResponse>('/user/remarks');

    if (response.errno !== 0 || !response.result) {
      return [];
    }

    return response.result;
  },

  /**
   * Get remark for a specific wallet
   * GET /user/remarks/{targetAddress}
   */
  async getWalletRemark(targetAddress: string): Promise<RemarkData | null> {
    const response = await fetchApi<RemarkResponse>(`/user/remarks/${targetAddress}`);

    if (response.errno !== 0 || !response.result) {
      return null;
    }

    return response.result;
  },

  /**
   * Delete remark for a wallet
   * DELETE /user/remarks/{targetAddress}
   */
  async deleteRemark(targetAddress: string): Promise<boolean> {
    const response = await fetchApi<RemarkDeleteResponse>(`/user/remarks/${targetAddress}`, {
      method: 'DELETE',
    });

    if (response.errno !== 0 || !response.result) {
      throw new Error(response.errmsg || 'Failed to delete remark');
    }

    return response.result.deleted;
  },

  /**
   * Search remarks by keyword
   * GET /user/remarks/search/{keyword}
   *
   * Searches remarks with fuzzy matching on the keyword.
   */
  async searchRemarks(keyword: string): Promise<RemarkData[]> {
    const response = await fetchApi<SearchRemarksResponse>(`/user/remarks/search/${keyword}`);

    if (response.errno !== 0 || !response.result) {
      return [];
    }

    return response.result;
  },
};
