/**
 * StatCard Component
 *
 * 显示统计数据卡片
 * 从外部前端迁移，适配 PreAlpha 设计系统
 */

import React from 'react';
import { Icons } from './icons';

export interface StatCardProps {
  /** 标签文本 */
  label: string;
  /** 值（已格式化为字符串） */
  value: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
}) => {
  const normalizedLabel = label.toLowerCase();
  const isPnlLabel = normalizedLabel.includes('pnl') || label.includes('盈亏');
  const isRateLabel =
    normalizedLabel.includes('rate') || normalizedLabel.includes('win') || label.includes('率');

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-surface1 p-5 transition-all hover:border-brand/30">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-txt-muted">
            {label}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="font-sans text-2xl font-bold tracking-tight text-txt-main tabular-nums">
              {value}
            </h3>
          </div>
        </div>
        {/* 装饰性图标 - 根据标签选择 */}
        <div className="rounded-full bg-surface2 p-2 text-brand">
          {isPnlLabel ? (
            <Icons.TrendingUp size={18} />
          ) : isRateLabel ? (
            <Icons.Target size={18} />
          ) : label.includes('ROI') ? (
            <Icons.Activity size={18} />
          ) : (
            <Icons.User size={18} />
          )}
        </div>
      </div>

      {/* 背景光晕效果 */}
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-brand/5 blur-2xl"></div>
    </div>
  );
};

export default StatCard;
