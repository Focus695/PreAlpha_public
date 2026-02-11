/**
 * Infinite Scroll Component
 *
 * 使用 Intersection Observer API 实现滚动到底部触发加载
 */

import { useEffect, useRef } from 'react';

interface InfiniteScrollProps {
  /** 是否还有更多数据 */
  hasMore: boolean;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 加载更多数据的回调函数 */
  onLoadMore: () => void;
  /** 触发加载的阈值（距离底部多少像素时触发），默认 100px */
  threshold?: number;
  /** 子元素 */
  children: React.ReactNode;
}

export function InfiniteScroll({
  hasMore,
  isLoading,
  onLoadMore,
  threshold = 100,
  children,
}: InfiniteScrollProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 如果没有更多数据或正在加载，不设置 observer
    if (!hasMore || isLoading) {
      return;
    }

    // 创建 Intersection Observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      {
        root: null,
        rootMargin: `${threshold}px`,
        threshold: 0,
      }
    );

    // 观察哨兵元素
    const currentSentinel = sentinelRef.current;
    if (currentSentinel && observerRef.current) {
      observerRef.current.observe(currentSentinel);
    }

    // 清理函数
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [hasMore, isLoading, onLoadMore, threshold]);

  return (
    <div>
      {children}

      {/* 哨兵元素 - 用于检测滚动到底部 */}
      <div ref={sentinelRef} className="flex w-full justify-center py-4">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-txt-muted">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            <span>加载中...</span>
          </div>
        )}

        {!hasMore && !isLoading && (
          <div className="text-xs text-txt-muted">
            已全部加载 ~
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 骨架屏加载指示器
 * 用于显示加载中的行
 */
export function TableSkeletonRow({ colSpan = 6 }: { colSpan?: number }) {
  return (
    <tr className="animate-pulse">
      <td colSpan={colSpan} className="px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-surface2" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 rounded bg-surface2" />
            <div className="h-3 w-32 rounded bg-surface2" />
          </div>
        </div>
      </td>
    </tr>
  );
}
