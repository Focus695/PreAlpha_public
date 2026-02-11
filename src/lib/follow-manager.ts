/**
 * Follow Manager - 全量更新关注列表的工具模块
 *
 * 职责：管理关注列表的全量更新逻辑，避免重复获取和竞态条件
 *
 * 核心设计：
 * 1. 使用单一的 updateFollowing API（全量替换模式）
 * 2. 调用方负责提供完整的关注列表
 * 3. 通过 React Query 缓存作为数据源，避免额外的 API 调用
 */

import { logger } from '@/lib/logger';
import type { EthAddress } from '@/types';
import type { UserData } from '@/types/user';
import { updateFollowing } from '@/lib/api/endpoints/user-data';

/**
 * 地址标准化函数（与 user-data-migration 中的实现保持一致）
 */
export function normalizeAddress(address: string): string {
  return address.toLowerCase().trim();
}

/**
 * 从现有用户数据中提取关注地址列表（不包含元数据）
 *
 * @param userData - 用户数据
 * @returns 标准化后的关注地址数组
 */
export function extractFollowingAddresses(userData: UserData | null | undefined): EthAddress[] {
  if (!userData?.following) {
    return [];
  }

  return userData.following.map((f) => f.address);
}

/**
 * 构建添加关注后的新列表
 *
 * @param currentList - 当前关注地址列表
 * @param newAddress - 要添加的新地址
 * @returns 新的关注地址列表（如果已存在则返回原列表）
 */
export function buildFollowedList(
  currentList: EthAddress[],
  newAddress: EthAddress
): EthAddress[] {
  const normalizedNew = normalizeAddress(newAddress);

  // 检查是否已关注（使用大小写不敏感比较）
  const alreadyFollowing = currentList.some(
    (addr) => normalizeAddress(addr) === normalizedNew
  );

  if (alreadyFollowing) {
    logger.debug('[FollowManager] Address already followed:', newAddress);
    return currentList;
  }

  return [...currentList, newAddress];
}

/**
 * 构建取消关注后的新列表
 *
 * @param currentList - 当前关注地址列表
 * @param addressToRemove - 要移除的地址
 * @returns 新的关注地址列表
 */
export function buildUnfollowedList(
  currentList: EthAddress[],
  addressToRemove: EthAddress
): EthAddress[] {
  const normalizedTarget = normalizeAddress(addressToRemove);

  return currentList.filter((addr) => normalizeAddress(addr) !== normalizedTarget);
}

/**
 * 执行关注操作（全量更新）
 *
 * @param currentFollowingList - 当前的完整关注列表
 * @param addressToFollow - 要关注的地址
 * @returns Promise<void>
 * @throws 如果 API 调用失败
 */
export async function executeFollow(
  currentFollowingList: EthAddress[],
  addressToFollow: EthAddress
): Promise<void> {
  const newList = buildFollowedList(currentFollowingList, addressToFollow);

  // 如果列表没变（已关注），则跳过 API 调用
  if (newList === currentFollowingList) {
    logger.debug('[FollowManager] Skipping follow API call (already following)');
    return;
  }

  logger.debug('[FollowManager] Executing follow:', {
    address: addressToFollow,
    currentCount: currentFollowingList.length,
    newCount: newList.length,
  });

  await updateFollowing(newList);
  logger.debug('[FollowManager] Follow API call completed');
}

/**
 * 执行取消关注操作（全量更新）
 *
 * @param currentFollowingList - 当前的完整关注列表
 * @param addressToUnfollow - 要取消关注的地址
 * @returns Promise<void>
 * @throws 如果 API 调用失败
 */
export async function executeUnfollow(
  currentFollowingList: EthAddress[],
  addressToUnfollow: EthAddress
): Promise<void> {
  const newList = buildUnfollowedList(currentFollowingList, addressToUnfollow);

  // 如果列表没变（本来就没关注），则跳过 API 调用
  if (newList.length === currentFollowingList.length) {
    logger.debug('[FollowManager] Skipping unfollow API call (not following)');
    return;
  }

  logger.debug('[FollowManager] Executing unfollow:', {
    address: addressToUnfollow,
    currentCount: currentFollowingList.length,
    newCount: newList.length,
  });

  await updateFollowing(newList);
  logger.debug('[FollowManager] Unfollow API call completed');
}

/**
 * 检查地址是否在关注列表中
 *
 * @param userData - 用户数据
 * @param address - 要检查的地址
 * @returns 是否已关注
 */
export function isAddressFollowed(
  userData: UserData | null | undefined,
  address: string | null | undefined
): boolean {
  if (!address || !userData?.following) {
    return false;
  }

  const normalized = normalizeAddress(address);
  return userData.following.some((f) => normalizeAddress(f.address) === normalized);
}

/**
 * Follow Manager 统一导出
 *
 * 使用示例：
 * ```ts
 * import { useUserData } from '@/hooks/use-user-data';
 * import { extractFollowingAddresses, executeFollow } from '@/lib/follow-manager';
 *
 * function MyComponent() {
 *   const { data } = useUserData();
 *
 *   const handleFollow = async (address: string) => {
 *     const currentList = extractFollowingAddresses(data);
 *     await executeFollow(currentList, address);
 *   };
 * }
 * ```
 */
export const followManager = {
  normalizeAddress,
  extractFollowingAddresses,
  buildFollowedList,
  buildUnfollowedList,
  executeFollow,
  executeUnfollow,
  isAddressFollowed,
};
