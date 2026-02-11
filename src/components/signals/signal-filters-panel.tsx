/**
 * SignalFiltersPanel Component
 *
 * Comprehensive filtering controls for signals:
 * - Signal type checkboxes (6 types)
 * - SmartScore range slider (0-100)
 * - Time range buttons (15m, 1h, 4h, 1d)
 * - Market category dropdown
 * - Clear all filters button
 */

import { useState } from 'react';
import type { SignalType } from '@/types';
import type { SignalTimeRange } from '@/types/signals';
import { zh } from '@/lib/translations';

interface SignalFiltersPanelProps {
  selectedTypes: SignalType[];
  onTypesChange: (types: SignalType[]) => void;
  smartScoreRange: [number, number];
  onSmartScoreRangeChange: (range: [number, number]) => void;
  timeRange: SignalTimeRange;
  onTimeRangeChange: (range: SignalTimeRange) => void;
  onClearAll: () => void;
}

const SIGNAL_TYPES: { value: SignalType; label: string }[] = [
  { value: 'smart_money_entry', label: zh.signalFeed.types.smart_money_entry },
  { value: 'anomaly_detected', label: zh.signalFeed.types.anomaly_detected },
  { value: 'divergence_alert', label: zh.signalFeed.types.divergence_alert },
  { value: 'early_position', label: zh.signalFeed.types.early_position },
  { value: 'exit_warning', label: zh.signalFeed.types.exit_warning },
  { value: 'reverse_indicator', label: zh.signalFeed.types.reverse_indicator },
];

const TIME_RANGES: { value: SignalTimeRange; label: string }[] = [
  { value: '15m', label: zh.signalsPage.filters.timeRanges['15m'] },
  { value: '1h', label: zh.signalsPage.filters.timeRanges['1h'] },
  { value: '4h', label: zh.signalsPage.filters.timeRanges['4h'] },
  { value: '1d', label: zh.signalsPage.filters.timeRanges['1d'] },
];

export function SignalFiltersPanel({
  selectedTypes,
  onTypesChange,
  smartScoreRange,
  onSmartScoreRangeChange,
  timeRange,
  onTimeRangeChange,
  onClearAll,
}: SignalFiltersPanelProps) {
  const [minScore, setMinScore] = useState(smartScoreRange[0]);
  const [maxScore, setMaxScore] = useState(smartScoreRange[1]);

  const handleTypeToggle = (type: SignalType) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter((t) => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };

  const handleMinScoreChange = (value: number) => {
    const newMin = Math.min(value, maxScore - 10);
    setMinScore(newMin);
    onSmartScoreRangeChange([newMin, maxScore]);
  };

  const handleMaxScoreChange = (value: number) => {
    const newMax = Math.max(value, minScore + 10);
    setMaxScore(newMax);
    onSmartScoreRangeChange([minScore, newMax]);
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-txt-main">
          {zh.signalsPage.rightColumn.filtersTitle}
        </h3>
        <button
          onClick={onClearAll}
          className="text-xs text-txt-muted hover:text-brand transition-colors"
        >
          {zh.signalsPage.filters.clearAll}
        </button>
      </div>

      {/* Signal Types */}
      <div className="space-y-3">
        <label className="text-xs font-medium text-txt-secondary">
          {zh.signalsPage.filters.signalTypes}
        </label>
        <div className="space-y-2">
          {SIGNAL_TYPES.map((type) => (
            <label
              key={type.value}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={selectedTypes.includes(type.value)}
                onChange={() => handleTypeToggle(type.value)}
                className="h-4 w-4 rounded border-border bg-surface2 text-brand focus:ring-2 focus:ring-brand focus:ring-offset-0"
              />
              <span className="text-sm text-txt-secondary group-hover:text-txt-main transition-colors">
                {type.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* SmartScore Range */}
      <div className="space-y-3">
        <label className="text-xs font-medium text-txt-secondary">
          {zh.signalsPage.filters.smartScoreRange}
        </label>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-txt-muted">
            <span>最小: {minScore}</span>
            <span>最大: {maxScore}</span>
          </div>
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max="100"
              value={minScore}
              onChange={(e) => handleMinScoreChange(Number(e.target.value))}
              className="w-full h-2 bg-surface2 rounded-lg appearance-none cursor-pointer accent-brand"
            />
            <input
              type="range"
              min="0"
              max="100"
              value={maxScore}
              onChange={(e) => handleMaxScoreChange(Number(e.target.value))}
              className="w-full h-2 bg-surface2 rounded-lg appearance-none cursor-pointer accent-brand"
            />
          </div>
        </div>
      </div>

      {/* Time Range */}
      <div className="space-y-3">
        <label className="text-xs font-medium text-txt-secondary">
          {zh.signalsPage.filters.timeRange}
        </label>
        <div className="flex rounded-lg bg-surface2/50 p-1">
          {TIME_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => onTimeRangeChange(range.value)}
              className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-all ${
                timeRange === range.value
                  ? 'bg-brand/10 text-brand shadow-sm'
                  : 'text-txt-muted hover:bg-surface2 hover:text-txt-main'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Market Category - 暂时注释 */}
      {/* <div className="space-y-3">
        <label className="text-xs font-medium text-txt-secondary">
          {zh.signalsPage.filters.marketCategory}
        </label>
        <CustomSelect
          options={CATEGORY_OPTIONS}
          value={categoryFilter}
          onChange={onCategoryChange}
          icon={<Icons.Filter size={14} />}
        />
      </div> */}
    </div>
  );
}
