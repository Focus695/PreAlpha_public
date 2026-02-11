/**
 * User Data Types
 * Types for user authentication and personal data storage
 */

import type { EthAddress } from './index';

/**
 * Unified User Data Structure
 *
 * Combines following list + per-address annotations in a single data source.
 * Supports JWT authentication + backend sync + optimistic updates.
 *
 * Storage architecture:
 * - Read: Local first (fast initial load) → Backend sync (ensure data is up-to-date)
 * - Write: Optimistic update (instant UI) → Backend sync (persist) → Rollback on error
 *
 * Version history:
 * - v1: following stored in user_data.following array
 * - v2: following stored in separate follows table, user_data only has annotations
 * - v3: renamed tables (user_follows, user_annotations, address_profiles), 24h cache duration
 */
export interface UserData {
  /** Data structure version for migration support */
  version: 1 | 2 | 3;

  /** List of followed addresses with metadata (v1: in storage, v2: from follows table) */
  following: FollowedAddress[];

  /** Per-address annotations (notes and custom tags) */
  annotations: Record<string, AddressAnnotation>;

  /** Last sync timestamp (ISO 8601) - v1 only, removed in v2 */
  lastSyncedAt?: string;
}

/**
 * Followed address entry
 */
export interface FollowedAddress {
  /** Ethereum address (normalized to lowercase) */
  address: EthAddress;

  /** When this address was first followed (ISO 8601) */
  createdAt: string;

  /** When this follow entry was last updated (ISO 8601) */
  updatedAt: string;

  /** Optional display name for this address */
  userName?: string;

  /** Optional avatar URL for this address */
  avatarUrl?: string;
}

/**
 * Per-address annotation
 * User's private note and custom tags for a specific address
 */
export interface AddressAnnotation {
  /** User's personal note/memo for this address */
  note?: string;

  /** User's custom tags (NOT system tags) */
  customTags: string[];

  /** When this annotation was last updated (ISO 8601) */
  updatedAt: string;
}

/**
 * Empty default user data
 */
export const EMPTY_USER_DATA: UserData = {
  version: 2,
  following: [],
  annotations: {},
};

/**
 * Authentication status for RainbowKit
 */
export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated';

/**
 * Authentication token stored in localStorage
 */
export interface AuthToken {
  /** JWT token for API authentication */
  token: string;

  /** Wallet address associated with this token */
  address: string;

  /** Token expiration timestamp (optional, depends on backend implementation) */
  expiresAt?: number;
}
