/**
 * SignalPageLayout Component
 *
 * Main layout container for the SignalsPage with:
 * - Top-level tab navigation
 * - Two-column grid layout (left: signal stream, right: filters & stats)
 * - Responsive breakpoints for mobile/tablet/desktop
 */

import type { ReactNode } from 'react';
import type { SignalTab } from '@/types/signals';
import { Icons } from '@/components/ui/icons';
import { zh } from '@/lib/translations';

interface SignalPageLayoutProps {
  activeTab: SignalTab;
  onTabChange: (tab: SignalTab) => void;
  leftColumn: ReactNode;
  rightColumn: ReactNode;
}

export function SignalPageLayout({
  activeTab,
  onTabChange,
  leftColumn,
  rightColumn,
}: SignalPageLayoutProps) {
  return (
    <div className="mx-auto flex h-[calc(100vh-80px)] max-w-[1800px] flex-col gap-6 p-6">
      {/* Top Navigation Tabs */}
      <div className="flex items-center gap-8 border-b border-border px-2">
        <button
          onClick={() => onTabChange('all')}
          className={`relative flex items-center gap-2 pb-4 text-sm font-bold transition-all ${
            activeTab === 'all'
              ? 'text-brand'
              : 'text-txt-secondary hover:text-txt-main'
          }`}
        >
          <Icons.Zap size={16} />
          <span>{zh.signalsPage.tabs.all}</span>
          {activeTab === 'all' && (
            <span className="absolute bottom-0 left-0 h-0.5 w-full bg-brand shadow-[0_0_10px_rgba(0,240,255,0.5)]" />
          )}
        </button>

        <button
          onClick={() => onTabChange('followed')}
          className={`relative flex items-center gap-2 pb-4 text-sm font-bold transition-all ${
            activeTab === 'followed'
              ? 'text-brand'
              : 'text-txt-secondary hover:text-txt-main'
          }`}
        >
          <Icons.Heart size={16} />
          <span>{zh.signalsPage.tabs.followed}</span>
          {activeTab === 'followed' && (
            <span className="absolute bottom-0 left-0 h-0.5 w-full bg-brand shadow-[0_0_10px_rgba(0,240,255,0.5)]" />
          )}
        </button>
      </div>

      {/* Main Content Area - Two Column Grid */}
      <div className="grid min-h-0 flex-1 grid-cols-12 gap-6">
        {/* Left Column: Signal Stream */}
        <div className="col-span-12 flex flex-col overflow-hidden rounded-2xl border border-border bg-surface1 lg:col-span-8 xl:col-span-9">
          {leftColumn}
        </div>

        {/* Right Column: Filters & Stats */}
        <div className="col-span-12 flex flex-col overflow-hidden rounded-2xl border border-border bg-surface1 lg:col-span-4 xl:col-span-3">
          {rightColumn}
        </div>
      </div>
    </div>
  );
}
