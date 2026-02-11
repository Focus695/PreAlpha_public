/**
 * ViewModeToggle Component
 *
 * Toggle buttons for switching between card and table views
 */

import type { SignalViewMode } from '@/types/signals';
import { Icons } from '@/components/ui/icons';
import { zh } from '@/lib/translations';

interface ViewModeToggleProps {
  viewMode: SignalViewMode;
  onViewModeChange: (mode: SignalViewMode) => void;
}

export function ViewModeToggle({ viewMode, onViewModeChange }: ViewModeToggleProps) {
  return (
    <div className="flex rounded-lg bg-surface2/50 p-1">
      <button
        onClick={() => onViewModeChange('card')}
        className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-all ${
          viewMode === 'card'
            ? 'bg-brand/10 text-brand shadow-sm'
            : 'text-txt-muted hover:bg-surface2 hover:text-txt-main'
        }`}
        title={zh.signalsPage.viewMode.card}
      >
        <Icons.Grid size={14} />
        <span>{zh.signalsPage.viewMode.card}</span>
      </button>
      <button
        onClick={() => onViewModeChange('table')}
        className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-all ${
          viewMode === 'table'
            ? 'bg-brand/10 text-brand shadow-sm'
            : 'text-txt-muted hover:bg-surface2 hover:text-txt-main'
        }`}
        title={zh.signalsPage.viewMode.table}
      >
        <Icons.List size={14} />
        <span>{zh.signalsPage.viewMode.table}</span>
      </button>
    </div>
  );
}
