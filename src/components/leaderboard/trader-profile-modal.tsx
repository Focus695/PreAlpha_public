import { useEffect, useMemo, useState } from 'react';
import type { LeaderboardEntry } from '@/types';
import { Icons } from '@/components/ui/icons';
import { formatAddressDisplay, formatCurrency, formatPercentage } from '@/lib/utils';
import { leaderboardEntryToDisplayProfile } from '@/lib/transformers';
import { zh } from '@/lib/translations';

type ModalTab = 'overview' | 'history' | 'analysis';

interface TraderProfileModalProps {
  isOpen: boolean;
  trader: LeaderboardEntry | null;
  onClose: () => void;
}

interface TraderHistoryEntry {
  id: string;
  ticker: string;
  market: string;
  side: 'YES' | 'NO';
  avgPrice: number;
  exitPrice: number;
  pnl: number;
  timeAgo: string;
}

const TABS: { id: ModalTab; label: string }[] = [
  { id: 'overview', label: zh.traderProfileModal.tabs.overview },
  { id: 'history', label: zh.traderProfileModal.tabs.history },
  { id: 'analysis', label: zh.traderProfileModal.tabs.analysis },
];

const BASE_HISTORY_DATA: TraderHistoryEntry[] = [
  {
    id: 'history-1',
    ticker: 'TRUMP',
    market: 'Trump 2024 Winner',
    side: 'YES',
    avgPrice: 0.58,
    exitPrice: 0.74,
    pnl: 690,
    timeAgo: '3h ago',
  },
  {
    id: 'history-2',
    ticker: 'FED',
    market: 'Fed Rate Cut 25bps',
    side: 'NO',
    avgPrice: 0.42,
    exitPrice: 0.33,
    pnl: 225,
    timeAgo: '5h ago',
  },
  {
    id: 'history-3',
    ticker: 'ETH',
    market: 'Ethereum ETF Approved',
    side: 'YES',
    avgPrice: 0.49,
    exitPrice: 0.66,
    pnl: 540,
    timeAgo: '8h ago',
  },
  {
    id: 'history-4',
    ticker: 'NBA',
    market: 'Celtics win NBA Finals',
    side: 'YES',
    avgPrice: 0.71,
    exitPrice: 0.92,
    pnl: 160,
    timeAgo: '16h ago',
  },
  {
    id: 'history-5',
    ticker: 'OIL',
    market: 'Oil Above $100 in Q4',
    side: 'NO',
    avgPrice: 0.63,
    exitPrice: 0.48,
    pnl: 310,
    timeAgo: '1d ago',
  },
  {
    id: 'history-6',
    ticker: 'AI',
    market: 'OpenAI IPO in 2025',
    side: 'NO',
    avgPrice: 0.37,
    exitPrice: 0.29,
    pnl: 210,
    timeAgo: '2d ago',
  },
];

function rotateHistoryData(address?: string): TraderHistoryEntry[] {
  if (!address) {
    return BASE_HISTORY_DATA;
  }

  const shift = address.charCodeAt(address.length - 1) % BASE_HISTORY_DATA.length;
  return BASE_HISTORY_DATA.slice(shift).concat(BASE_HISTORY_DATA.slice(0, shift));
}

const TraderProfileModal = ({ isOpen, trader, onClose }: TraderProfileModalProps) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('overview');

  const displayData = useMemo(
    () => (trader ? leaderboardEntryToDisplayProfile(trader) : null),
    [trader]
  );

  const historyData = useMemo(() => rotateHistoryData(trader?.address), [trader?.address]);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('overview');
    }
  }, [isOpen]);

  if (!isOpen || !trader || !displayData) {
    return null;
  }
  const lastActiveDate = new Date(displayData.lastActive).toLocaleDateString();

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-10"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl rounded-2xl border border-border bg-base shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface2 text-txt-secondary">
              <Icons.User size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-txt-main">
                  {displayData.ensName || zh.traderDrawer.unknownTrader}
                </h2>
                {displayData.isWhale && (
                  <span className="rounded border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                    {zh.traderDrawer.whaleTag}
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-txt-muted">
                <span className="font-mono text-txt-secondary">{formatAddressDisplay(displayData.address)}</span>
                <button
                  className="text-txt-muted transition-colors hover:text-brand"
                  onClick={() => navigator.clipboard.writeText(displayData.address)}
                  aria-label={zh.traderProfileModal.copyAria}
                >
                  <Icons.Copy size={12} />
                </button>
                <span className="text-xs uppercase tracking-wide text-txt-secondary">
                  {zh.traderProfileModal.rankLabel(displayData.rank)}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-txt-muted">
                <div className="flex items-center gap-1">
                  <Icons.Activity size={12} className="text-brand" />
                  <span>{zh.traderProfileModal.lastActiveLabel(lastActiveDate)}</span>
                </div>
                {displayData.twitterHandle && (
                  <a
                    href={`https://x.com/${displayData.twitterHandle.replace('@', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[#1DA1F2] transition-colors hover:text-brand"
                  >
                    <Icons.Twitter size={12} />
                    <span>{displayData.twitterHandle}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-transparent p-2 text-txt-muted transition-colors hover:border-border hover:text-txt-main"
            aria-label={zh.traderProfileModal.closeAria}
          >
            <Icons.X size={20} />
          </button>
        </header>

        <div className="px-6">
          <div className="flex flex-wrap gap-2 border-b border-border pt-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`rounded-t px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-brand text-brand'
                    : 'text-txt-muted hover:text-txt-main'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <section className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatBlock
                  label={zh.traderProfileModal.stats.totalPnl}
                  value={formatCurrency(displayData.totalPnl, 0)}
                  trend={displayData.totalPnl >= 0 ? 'text-profit' : 'text-down'}
                />
                <StatBlock
                  label={zh.traderProfileModal.stats.roi}
                  value={formatPercentage(displayData.roi / 100)}
                  trend={displayData.roi >= 0 ? 'text-profit' : 'text-down'}
                />
                <StatBlock
                  label={zh.traderProfileModal.stats.winRate}
                  value={displayData.winRate != null ? `${displayData.winRate.toFixed(1)}%` : '/'}
                  trend="text-txt-main"
                />
                <StatBlock
                  label={zh.traderProfileModal.stats.trades}
                  value={displayData.tradesCount.toLocaleString()}
                  trend="text-txt-main"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border bg-surface1 p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-txt-secondary">
                      {zh.traderProfileModal.smartScore.title}
                    </h3>
                    <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand">
                      {displayData.smartScore}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-txt-muted">
                    {zh.traderProfileModal.smartScore.description}
                  </p>
                  <div className="mt-4 grid gap-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-txt-muted">{zh.traderProfileModal.smartScore.platform}</span>
                      <span className="capitalize text-txt-main">{displayData.platform}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-surface1 p-5">
                  <h3 className="text-sm font-medium text-txt-secondary">{zh.traderProfileModal.tagsTitle}</h3>
                  {displayData.tags.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {displayData.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-wide text-txt-secondary"
                        >
                          {tag.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-txt-muted">{zh.traderProfileModal.tagsEmpty}</p>
                  )}
                  <div className="mt-5 flex gap-3 text-sm">
                    <a
                      href={displayData.polymarketLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-brand transition-colors hover:underline"
                    >
                      {zh.traderProfileModal.viewPolymarket} <Icons.ExternalLink size={12} />
                    </a>
                    {displayData.opinionLink && (
                      <a
                        href={displayData.opinionLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-brand transition-colors hover:underline"
                      >
                        {zh.traderProfileModal.viewOpinion} <Icons.ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {historyData.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface1/60 p-4 transition-colors hover:bg-surface1"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface2 font-mono text-xs text-txt-secondary">
                      {trade.ticker}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-txt-main">{trade.market}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-txt-muted">
                        <span className={trade.side === 'YES' ? 'text-profit' : 'text-down'}>{trade.side}</span>
                        <span>•</span>
                        <span>{zh.traderProfileModal.history.entry} ${trade.avgPrice.toFixed(2)}</span>
                        <span>•</span>
                        <span>{zh.traderProfileModal.history.exit} ${trade.exitPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-mono text-sm font-semibold ${
                        trade.pnl >= 0 ? 'text-profit' : 'text-down'
                      }`}
                    >
                      {trade.pnl >= 0 ? '+' : '-'}${Math.abs(trade.pnl).toLocaleString()}
                    </div>
                    <div className="mt-1 flex items-center justify-end gap-1 text-xs text-txt-muted">
                      <Icons.Clock size={10} />
                      <span>{trade.timeAgo}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-surface1/50 p-6 text-center">
              <Icons.Activity size={28} className="text-brand" />
              <div>
                <p className="text-sm text-txt-muted">{zh.traderProfileModal.analysis.description}</p>
                <p className="text-xs text-txt-secondary">{zh.traderProfileModal.analysis.note}</p>
              </div>
              <span className="rounded-full border border-border px-4 py-1 text-[10px] uppercase tracking-[0.4em] text-txt-muted">
                {zh.traderProfileModal.analysis.comingSoon}
              </span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

interface StatBlockProps {
  label: string;
  value: string;
  trend: string;
}

function StatBlock({ label, value, trend }: StatBlockProps) {
  return (
    <div className="rounded-xl border border-border bg-surface1 p-4">
      <span className="text-xs uppercase tracking-wider text-txt-muted">{label}</span>
      <div className={`mt-2 text-xl font-bold ${trend}`}>{value}</div>
    </div>
  );
}

export default TraderProfileModal;

