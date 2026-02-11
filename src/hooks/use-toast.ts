/**
 * useToast Hook
 *
 * React hook for displaying toast notifications.
 *
 * @example
 * ```tsx
 * const { toastSuccess, toastError, toastWarning, toastInfo } = useToast();
 *
 * toastSuccess('操作成功！');
 * toastError('操作失败，请重试', '错误');
 * toastWarning('请注意', '警告');
 * toastInfo('加载中...');
 * ```
 */

import { useSyncExternalStore } from 'react';
import { toastStore, type Toast } from '@/components/ui/toast';
import type { ToastType } from '@/components/ui/toast';

export interface UseToastReturn {
  // Toast methods
  toastSuccess: (message: string, title?: string, duration?: number) => string;
  toastError: (message: string, title?: string, duration?: number) => string;
  toastWarning: (message: string, title?: string, duration?: number) => string;
  toastInfo: (message: string, title?: string, duration?: number) => string;
  toast: (type: ToastType, message: string, title?: string, duration?: number) => string;

  // Control methods
  removeToast: (id: string) => void;
  clearAll: () => void;

  // State
  toasts: Toast[];
}

/**
 * Toast hook for displaying notifications
 */
export function useToast(): UseToastReturn {
  // Subscribe to toast store changes
  const toasts = useSyncExternalStore(
    (listener) => toastStore.subscribe(listener),
    () => toastStore.getToasts(),
    () => []
  );

  const toastSuccess = (message: string, title?: string, duration?: number) => {
    return toastStore.add({ type: 'success', title, message, duration });
  };

  const toastError = (message: string, title?: string, duration?: number) => {
    return toastStore.add({ type: 'error', title, message, duration });
  };

  const toastWarning = (message: string, title?: string, duration?: number) => {
    return toastStore.add({ type: 'warning', title, message, duration });
  };

  const toastInfo = (message: string, title?: string, duration?: number) => {
    return toastStore.add({ type: 'info', title, message, duration });
  };

  const toast = (type: ToastType, message: string, title?: string, duration?: number) => {
    return toastStore.add({ type, title, message, duration });
  };

  const removeToast = (id: string) => {
    toastStore.remove(id);
  };

  const clearAll = () => {
    toastStore.clear();
  };

  return {
    toastSuccess,
    toastError,
    toastWarning,
    toastInfo,
    toast,
    removeToast,
    clearAll,
    toasts,
  };
}

// Re-export helper functions for non-React usage
export {
  toastSuccess,
  toastError,
  toastWarning,
  toastInfo,
  toastRemove as removeToast,
  toastClearAll as clearAll,
} from '@/components/ui/toast';
