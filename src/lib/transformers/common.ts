/**
 * Common Transformer Utilities
 * Shared utility functions for data transformation
 */

/** 缺失字符串字段的默认值 */
export const MISSING_STRING = '/';

/**
 * 安全地将 API 返回的数字/字符串转换为 number
 */
export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

/**
 * 计算时间差的可读格式
 */
export function formatTimeAgo(dateInput: string | number | Date): string {
  let date: Date;

  if (dateInput instanceof Date) {
    date = dateInput;
  } else if (typeof dateInput === 'number') {
    const ms = dateInput > 1e12 ? dateInput : dateInput * 1000;
    date = new Date(ms);
  } else if (/^\d+$/.test(dateInput)) {
    const numeric = Number(dateInput);
    const ms = numeric > 1e12 ? numeric : numeric * 1000;
    date = new Date(ms);
  } else {
    date = new Date(dateInput);
  }

  if (Number.isNaN(date.getTime())) {
    return MISSING_STRING;
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return 'just now';
}

/**
 * 计算时间差的可读格式（中文）
 */
export function formatTimeAgoZh(dateInput: string | number | Date): string {
  let date: Date;

  if (dateInput instanceof Date) {
    date = dateInput;
  } else if (typeof dateInput === 'number') {
    const ms = dateInput > 1e12 ? dateInput : dateInput * 1000;
    date = new Date(ms);
  } else if (/^\d+$/.test(dateInput)) {
    const numeric = Number(dateInput);
    const ms = numeric > 1e12 ? numeric : numeric * 1000;
    date = new Date(ms);
  } else {
    date = new Date(dateInput);
  }

  if (Number.isNaN(date.getTime())) {
    return MISSING_STRING;
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}天前`;
  if (diffHours > 0) return `${diffHours}小时前`;
  if (diffMins > 0) return `${diffMins}分钟前`;
  return '现在';
}

/**
 * Format relative time from minutes
 */
export function formatRelativeTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Format relative time from Date
 */
export function formatRelativeTimeFromDate(date?: string | Date): string {
  if (!date) {
    return '—';
  }

  const parsedDate = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(parsedDate.getTime())) {
    return '—';
  }

  const diffMinutes = Math.max(
    0,
    Math.floor((Date.now() - parsedDate.getTime()) / (1000 * 60))
  );

  return formatRelativeTime(diffMinutes || 1);
}

/**
 * Create a seeded random number generator for deterministic mock data
 */
export function createSeededRandom(seedSource: string) {
  let seed = 0;
  for (let i = 0; i < seedSource.length; i++) {
    seed = (seed << 5) - seed + seedSource.charCodeAt(i);
    seed |= 0;
  }
  if (seed === 0) {
    seed = 1;
  }

  return () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };
}

/**
 * Normalize percentage values to ensure they sum to 100%
 */
export function normalizePercentages<T extends { value: number }>(segments: T[]): T[] {
  if (!segments.length) {
    return segments;
  }

  const total = segments.reduce((sum, segment) => sum + Math.max(segment.value, 0), 0);

  if (total === 0) {
    const fallback = Number((100 / segments.length).toFixed(1));
    return segments.map((segment) => ({ ...segment, value: fallback }));
  }

  let running = 0;
  return segments.map((segment, index) => {
    if (index === segments.length - 1) {
      return { ...segment, value: Number((100 - running).toFixed(1)) };
    }

    const nextValue = Number(((segment.value / total) * 100).toFixed(1));
    running += nextValue;
    return { ...segment, value: nextValue };
  });
}

/**
 * Generate a UUID v4 (cross-platform compatible)
 * Falls back to a simple implementation if crypto.randomUUID is not available
 */
export function generateUUID(): string {
  // Try to use native crypto.randomUUID if available (browser or Node.js 16.7+)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback: Generate UUID v4 manually
  // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
