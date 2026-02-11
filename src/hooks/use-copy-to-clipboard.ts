/**
 * useCopyToClipboard Hook
 *
 * 提供统一的地址复制功能，带复制成功反馈
 * 功能：
 * - 复制文本到剪贴板
 * - 显示复制成功状态（3秒后自动恢复）
 * - 错误处理
 */

import { useState, useCallback, useRef } from 'react';

/** 复制反馈自动恢复时间（毫秒） */
const COPY_FEEDBACK_DURATION = 3000;

export function useCopyToClipboard() {
  const [isCopied, setIsCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(async (text: string): Promise<boolean> => {
    if (!text) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);

      // 设置复制成功状态
      setIsCopied(true);

      // 清除之前的 timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // 3秒后恢复原样
      timerRef.current = setTimeout(() => {
        setIsCopied(false);
      }, COPY_FEEDBACK_DURATION);

      return true;
    } catch {
      return false;
    }
  }, []);

  return { isCopied, copy };
}
