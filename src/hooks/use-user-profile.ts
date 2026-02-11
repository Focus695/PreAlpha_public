/**
 * User Profile Hook
 *
 * Fetches user profile data from /leaderboard/user/{walletAddress}/profile
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient, type UserProfileResponse } from '@/lib/api-client';

interface UseUserProfileResult {
  profile: UserProfileResponse | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Fetch user profile from Opinion API
 */
export function useUserProfile(walletAddress: string | undefined): UseUserProfileResult {
  const {
    data: profileData,
    isLoading: isProfileLoading,
    isError: isProfileError,
    error: profileError,
    refetch,
  } = useQuery({
    queryKey: ['user-profile', walletAddress],
    queryFn: async () => {
      if (!walletAddress) {
        return null;
      }
      return apiClient.getUserProfile(walletAddress);
    },
    enabled: !!walletAddress,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    profile: profileData ?? null,
    isLoading: isProfileLoading,
    isError: isProfileError,
    error: profileError as Error | null,
    refetch,
  };
}

