/**
 * Type Transformers
 *
 * This file re-exports from the modular transformers structure for backwards compatibility.
 * New code should import directly from '@/lib/transformers' instead.
 *
 * @deprecated Import from '@/lib/transformers' instead
 */

export {
  type DisplayProfile,
  leaderboardEntryToDisplayProfile,
  leaderboardEntriesToDisplayProfiles,
  addressProfileToDisplayProfile,
} from './transformers/index';
