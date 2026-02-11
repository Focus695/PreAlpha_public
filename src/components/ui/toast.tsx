/**
 * Toast Notification Component
 *
 * Provides unified toast notifications for success, error, warning, and info messages.
 */

'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { logger } from '@/lib/logger';

// ============================================================
// Type Definitions
// ============================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

// ============================================================
// Icon Components
// ============================================================

const ToastIcon = ({ type }: { type: ToastType }) => {
  const icons = {
    success: <CheckCircle className="h-5 w-5 text-success" />,
    error: <AlertCircle className="h-5 w-5 text-loss" />,
    warning: <AlertTriangle className="h-5 w-5 text-warning" />,
    info: <Info className="h-5 w-5 text-brand" />,
  };
  return icons[type];
};

// ============================================================
// Toast Item Component
// ============================================================

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const duration = toast.duration ?? 4000;
    const startTime = Date.now();
    const endTime = startTime + duration;

    const progressInterval = setInterval(() => {
      const remaining = endTime - Date.now();
      const newProgress = (remaining / duration) * 100;
      setProgress(Math.max(0, newProgress));
    }, 50);

    const timeout = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, duration);

    return () => {
      clearTimeout(timeout);
      clearInterval(progressInterval);
    };
  }, [toast.id, toast.duration, onRemove]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const bgColors = {
    success: 'bg-success/10 border-success/30',
    error: 'bg-loss/10 border-loss/30',
    warning: 'bg-warning/10 border-warning/30',
    info: 'bg-brand/10 border-brand/30',
  };

  return (
    <div
      className={clsx(
        'relative flex items-start gap-3 rounded-lg border p-4 shadow-lg transition-all duration-300 min-w-[320px] max-w-md',
        bgColors[toast.type],
        isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
      )}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        <ToastIcon type={toast.type} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="font-medium text-sm text-txt-main">{toast.title}</p>
        )}
        <p className={clsx(
          'text-sm break-words',
          toast.title ? 'text-txt-secondary' : 'text-txt-main'
        )}>
          {toast.message}
        </p>
      </div>

      {/* Close Button */}
      <button
        onClick={handleClose}
        className="flex-shrink-0 text-txt-muted hover:text-txt-main transition-colors"
        aria-label="关闭"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Progress Bar */}
      {toast.duration !== 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/20 rounded-b-lg overflow-hidden">
          <div
            className="h-full bg-current opacity-30 transition-all duration-75 ease-linear"
            style={{
              width: `${progress}%`,
              color: toast.type === 'error' ? 'hsl(var(--loss))' :
                     toast.type === 'success' ? 'hsl(var(--success))' :
                     toast.type === 'warning' ? 'hsl(var(--warning))' :
                     'hsl(var(--brand))',
            }}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================
// Toast Container Component
// ============================================================

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Toast Store (for useToast hook)
// ============================================================

type ToastListener = (toasts: Toast[]) => void;

class ToastStore {
  private toasts: Toast[] = [];
  private listeners: Set<ToastListener> = new Set();
  private idCounter = 0;
  private cachedToasts: Toast[] = [];

  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    // 更新缓存，确保引用稳定
    this.cachedToasts = [...this.toasts];
    // 传递缓存的引用给所有监听器
    this.listeners.forEach((listener) => listener(this.cachedToasts));
  }

  add(toast: Omit<Toast, 'id'>): string {
    const id = `toast-${++this.idCounter}-${Date.now()}`;
    const newToast: Toast = { ...toast, id };
    this.toasts = [...this.toasts, newToast];
    this.notify();
    return id;
  }

  remove(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  clear() {
    this.toasts = [];
    this.notify();
  }

  getToasts() {
    // 返回缓存的引用，而不是每次都创建新数组
    // 这修复了 useSyncExternalStore 的 getSnapshot 警告
    return this.cachedToasts;
  }
}

// Global singleton instance
const toastStore = new ToastStore();

// ============================================================
// Helper Functions for Direct Access
// ============================================================

/**
 * Show a success toast
 */
export function toastSuccess(message: string, title?: string, duration?: number) {
  logger.debug('[Toast] Success:', title, message);
  return toastStore.add({ type: 'success', title, message, duration });
}

/**
 * Show an error toast
 */
export function toastError(message: string, title?: string, duration?: number) {
  logger.error('[Toast] Error:', title, message);
  return toastStore.add({ type: 'error', title, message, duration });
}

/**
 * Show a warning toast
 */
export function toastWarning(message: string, title?: string, duration?: number) {
  logger.warn('[Toast] Warning:', title, message);
  return toastStore.add({ type: 'warning', title, message, duration });
}

/**
 * Show an info toast
 */
export function toastInfo(message: string, title?: string, duration?: number) {
  logger.debug('[Toast] Info:', title, message);
  return toastStore.add({ type: 'info', title, message, duration });
}

/**
 * Remove a toast by id
 */
export function toastRemove(id: string) {
  toastStore.remove(id);
}

/**
 * Clear all toasts
 */
export function toastClearAll() {
  toastStore.clear();
}

// Export store for useToast hook
export { toastStore };
