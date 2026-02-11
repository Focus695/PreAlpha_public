/**
 * Smart Score Badge Component
 */

import { cn } from '@/lib/utils';

interface SmartScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
  if (score >= 60) return 'bg-blue-100 text-blue-800 border-blue-200';
  if (score >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  return 'bg-gray-100 text-gray-800 border-gray-200';
}

export function SmartScoreBadge({ score, size = 'md' }: SmartScoreBadgeProps) {
  const colorClasses = getScoreColor(score);

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full border font-medium',
        colorClasses,
        sizeClasses[size]
      )}
    >
      <span className="font-bold">{score.toFixed(1)}</span>
    </span>
  );
}
