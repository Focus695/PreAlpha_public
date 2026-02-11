/**
 * Unified Error Handler
 *
 * Provides centralized error handling with toast notifications.
 */

import { toastError, toastWarning, toastSuccess } from '@/components/ui/toast';
import { logger } from './logger';

// ============================================================
// Error Types
// ============================================================

export interface ApiError {
  status?: number;
  statusText?: string;
  message: string;
  details?: unknown;
}

// ============================================================
// Error Classification
// ============================================================

function isNetworkError(error: Error): boolean {
  return (
    error.message.includes('fetch') ||
    error.message.includes('network') ||
    error.message.includes('ECONNREFUSED') ||
    error.message.includes('Failed to fetch')
  );
}

function isAuthError(error: Error): boolean {
  return (
    error.message.includes('401') ||
    error.message.includes('Authentication') ||
    error.message.includes('Unauthorized') ||
    error.message.includes('token')
  );
}

function isServerError(error: Error): boolean {
  return (
    error.message.includes('500') ||
    error.message.includes('502') ||
    error.message.includes('503') ||
    error.message.includes('504') ||
    error.message.includes('Internal Server Error')
  );
}

function isNotFoundError(error: Error): boolean {
  return (
    error.message.includes('404') ||
    error.message.includes('Not Found')
  );
}

// ============================================================
// Error Message Helpers
// ============================================================

function getErrorMessage(error: Error | ApiError): string {
  const err = error as ApiError;

  // If error has a specific message, use it
  if (err.message && !err.message.includes('API request failed')) {
    return err.message;
  }

  // Otherwise, provide a user-friendly message based on status
  if (err.status) {
    switch (err.status) {
      case 400:
        return '请求参数错误';
      case 401:
        return '登录已过期，请重新登录';
      case 403:
        return '没有权限执行此操作';
      case 404:
        return '请求的资源不存在';
      case 500:
        return '服务器错误，请稍后重试';
      case 502:
      case 503:
        return '服务暂时不可用，请稍后重试';
      case 504:
        return '请求超时，请稍后重试';
      default:
        return `请求失败 (${err.status})`;
    }
  }

  return '操作失败，请重试';
}

// ============================================================
// Public Error Handlers
// ============================================================

/**
 * Handle API error with appropriate toast notification
 *
 * @param error - The error to handle
 * @param context - Additional context about where the error occurred
 * @param fallbackMessage - Fallback message if error can't be parsed
 */
export function handleApiError(
  error: Error | unknown,
  context?: string,
  fallbackMessage?: string
): void {
  // Log error for debugging
  logger.error('[ErrorHandler]', context, error);

  // Normalize error
  const err = error instanceof Error ? error : new Error(String(error));

  // Get user-friendly message
  const message = fallbackMessage ?? getErrorMessage(err);

  // Show appropriate toast based on error type
  if (isAuthError(err)) {
    toastError(message, '认证失败');
  } else if (isServerError(err)) {
    toastError(message, '服务器错误');
  } else if (isNetworkError(err)) {
    toastError('请检查网络连接后重试', '网络错误');
  } else if (isNotFoundError(err)) {
    toastWarning(message, '未找到');
  } else {
    toastError(message, '操作失败');
  }
}

/**
 * Handle mutation error (for useMutation callbacks)
 *
 * @param error - The error to handle
 * @param action - Description of the action that failed (e.g., "关注")
 */
export function handleMutationError(error: Error | unknown, action: string): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const message = getErrorMessage(err);

  if (isServerError(err)) {
    toastError(`${action}失败：服务器错误，请稍后重试`, '服务器错误');
  } else if (isNetworkError(err)) {
    toastError(`${action}失败：网络错误，请检查连接`, '网络错误');
  } else {
    toastError(`${action}失败：${message}`, '操作失败');
  }
}

/**
 * Show a success toast for completed operations
 *
 * @param message - Success message to display
 * @param title - Optional title
 */
export function handleSuccess(message: string, title?: string): void {
  toastSuccess(message, title);
}

// Re-export toast functions for convenience
export { toastError, toastWarning, toastSuccess } from '@/components/ui/toast';
