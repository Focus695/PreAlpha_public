/**
 * Header Component
 *
 * 顶部导航栏，包含 Logo、导航链接和钱包连接按钮
 * 从外部前端迁移，适配 React Router
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logger } from '@/lib/logger';
import { Icons } from '@/components/ui/icons';
import { Logo } from '@/components/ui/logo';
import { zh } from '@/lib/translations';
import type { AddressProfile, LeaderboardEntry } from '@/types';
import { useWalletSearch } from '@/hooks/use-wallet-search';
import { PersonalDataModal } from '@/components/layout/personal-data-modal';
import { SearchProgress } from '@/components/ui/search-progress';
import { ParticleEffect } from '@/components/ui/particle-effect';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount, useDisconnect } from 'wagmi';
import { useAuthStatus } from '@/hooks/use-auth-status';
import { authenticationAdapter } from '@/lib/auth/authentication-adapter';

// HeaderProps interface removed - wallet functionality removed

const NAV_ITEMS = [
  { label: zh.header.nav.smartMoney, path: '/' },
  { label: zh.header.nav.market, path: '/market' },
  { label: zh.header.nav.signals, path: '/signals' },
];

/**
 * Wallet Dropdown Component
 * 
 * 钱包下拉菜单，包含查看账户和断开连接选项
 */
interface WalletDropdownProps {
  address: string | undefined;
  authStatus: 'loading' | 'unauthenticated' | 'authenticated';
  onManagePersonalData: () => void;
  onDisconnect: () => void;
  onClose: () => void;
}

function WalletDropdown({
  address,
  authStatus,
  onManagePersonalData,
  onDisconnect,
  onClose,
}: WalletDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Add event listener with a slight delay to avoid immediate closure
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-border bg-base shadow-lg z-[100] animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div className="p-1">
        {/* 钱包地址显示 */}
        <div className="px-3 py-2 border-b border-border">
          <div className="text-xs text-txt-muted mb-1">钱包地址</div>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${
              authStatus === 'authenticated' 
                ? 'bg-brand shadow-[0_0_8px_rgba(0,240,255,0.6)]' 
                : 'bg-txt-muted'
            }`} />
            <span className="font-mono text-xs text-txt-main break-all">
              {address || '未知地址'}
            </span>
          </div>
          {authStatus === 'authenticated' && (
            <div className="mt-1 text-[10px] text-brand">已认证</div>
          )}
        </div>

        {/* 管理个人数据 */}
        <button
          onClick={onManagePersonalData}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-txt-secondary transition-colors hover:bg-surface1 hover:text-txt-main"
        >
          <Icons.Tag size={16} />
          <span>管理个人数据</span>
        </button>

        {/* 分隔线 */}
        <div className="my-1 border-t border-border" />

        {/* 断开连接 */}
        <button
          onClick={onDisconnect}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-txt-secondary transition-colors hover:bg-surface1 hover:text-loss"
        >
          <Icons.X size={16} />
          <span>断开连接</span>
        </button>
      </div>
    </div>
  );
}

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedItemRef = useRef<HTMLDivElement>(null);
  const [isPersonalDataModalOpen, setIsPersonalDataModalOpen] = useState(false);
  const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false);
  const walletButtonRef = useRef<HTMLButtonElement>(null);
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [logoRect, setLogoRect] = useState<DOMRect | null>(null);
  const logoRef = useRef<HTMLAnchorElement>(null);
  const [shouldAutoTrigger, setShouldAutoTrigger] = useState(false);

  // Wallet connection hooks
  const { openConnectModal } = useConnectModal();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const authStatus = useAuthStatus();

  // Handle wallet disconnect
  const handleDisconnect = async () => {
    try {
      // Sign out from authentication adapter (clears JWT token)
      await authenticationAdapter.signOut();
      // Disconnect wallet
      disconnect();
      // Close dropdown
      setIsWalletDropdownOpen(false);
    } catch (error) {
      logger.error('Error disconnecting wallet:', error);
      // Still disconnect wallet even if signOut fails
      disconnect();
      setIsWalletDropdownOpen(false);
    }
  };

  const {
    filteredResults,
    isLoading,
    isLoadingMore,
    loadingProgress,
    searchQuery: walletSearchQuery,
    setSearchQuery: setWalletSearchQuery,
    clearSearch,
  } = useWalletSearch({
    pageSize: 100,
    maxResults: 20,
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global shortcuts
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
        return;
      }

      // Modal-only shortcuts
      if (!isSearchOpen) return;

      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredResults.length - 1));
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredResults[selectedIndex]) {
          handleTraderClick(filteredResults[selectedIndex].profile.address);
        }
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, selectedIndex, filteredResults]);

  // Reset search query and selected index when modal closes
  useEffect(() => {
    if (!isSearchOpen) {
      clearSearch();
      setSelectedIndex(0);
    }
  }, [isSearchOpen, clearSearch]);

  // Reset selected index when search query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [walletSearchQuery]);

  // Scroll selected item into view
  useEffect(() => {
    if (isSearchOpen && selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedIndex, isSearchOpen]);

  // 首次加载时触发粒子特效
  useEffect(() => {
    // 检查是否是首次访问（使用sessionStorage，页面会话期间只触发一次）
    const hasTriggered = sessionStorage.getItem('particle-effect-triggered');

    if (!hasTriggered && logoRef.current) {
      // 等待一小段时间确保logo已渲染
      const timer = setTimeout(() => {
        if (logoRef.current) {
          setLogoRect(logoRef.current.getBoundingClientRect());
          setShouldAutoTrigger(true);
          sessionStorage.setItem('particle-effect-triggered', 'true');
        }
      }, 500);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  // Update logo position when hovered
  useEffect(() => {
    if (isLogoHovered && logoRef.current) {
      setLogoRect(logoRef.current.getBoundingClientRect());
    }
  }, [isLogoHovered]);

  // Update logo position on scroll/resize
  useEffect(() => {
    const updateLogoRect = () => {
      if ((isLogoHovered || shouldAutoTrigger) && logoRef.current) {
        setLogoRect(logoRef.current.getBoundingClientRect());
      }
    };

    window.addEventListener('scroll', updateLogoRect);
    window.addEventListener('resize', updateLogoRect);

    return () => {
      window.removeEventListener('scroll', updateLogoRect);
      window.removeEventListener('resize', updateLogoRect);
    };
  }, [isLogoHovered, shouldAutoTrigger]);

  const handleTraderClick = (address: string) => {
    setIsSearchOpen(false);
    navigate(`/address/${address}`);
  };

  const renderSearchResults = () => {
    // Show loading state
    if (isLoading) {
      return (
        <div className="flex min-h-[200px] items-center justify-center text-sm text-txt-muted">
          <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" /> {zh.common.loading}
        </div>
      );
    }

    if (filteredResults.length === 0) {
      // When searching with no results, show a temp entry for untracked addresses
      if (walletSearchQuery.trim()) {
        const tempProfile: AddressProfile = {
          userName: '',
          address: walletSearchQuery as any,
          platform: 'polymarket',
          totalPnl: 0,
          totalRoi: 0,
          winRate: 0,
          smartScore: 0,
          totalVolume: 0,
          tradeCount: 0,
          tags: [],
          specializations: {},
          lastActiveAt: new Date(),
          updatedAt: new Date(),
        };
        const tempEntry = { rank: 0, address: walletSearchQuery as any, platform: 'polymarket' as const, value: 0, profile: tempProfile };
        return (
          <>
            {renderSingleResult(tempEntry, 0)}
            {/* Show progress indicator even with no results - still searching */}
            {isLoadingMore && (
              <SearchProgress
                progress={loadingProgress}
                isVisible={true}
              />
            )}
          </>
        );
      }

      return (
        <div className="flex min-h-[200px] items-center justify-center text-sm text-txt-muted">
          {zh.common.noData}
        </div>
      );
    }

    return (
      <>
        {filteredResults.map((entry, index) => renderSingleResult(entry, index))}
        {/* Show progress indicator at bottom when loading more */}
        {isLoadingMore && (
          <SearchProgress
            progress={loadingProgress}
            isVisible={true}
          />
        )}
      </>
    );
  };

  const renderSingleResult = (entry: LeaderboardEntry, index: number) => {
      const trader = entry.profile;
      const isUntracked = entry.rank === 0;
      const isSelected = index === selectedIndex;

      return (
        <div
          key={`${trader.address}-${index}`}
          ref={isSelected ? selectedItemRef : null}
          className={`group grid grid-cols-12 gap-2 px-6 py-3 transition-colors cursor-pointer border-t border-border/50 first:border-0 ${
            isSelected ? 'bg-brand/10 border-brand/30' : 'hover:bg-surface1/50'
          }`}
          onClick={() => handleTraderClick(trader.address)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          {/* Trader Info */}
          <div className="col-span-5 flex items-center gap-3">
            <div className="relative">
              {/* Avatar: Use avatarUrl if available, otherwise show icon */}
              {trader.avatarUrl ? (
                <img
                  src={trader.avatarUrl}
                  alt={trader.userName || trader.address}
                  className="h-8 w-8 rounded-full object-cover border border-border group-hover:scale-105 transition-all"
                  onError={(e) => {
                    // Fallback to icon if image fails to load
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) {
                      fallback.style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-surface2 text-txt-secondary group-hover:text-brand group-hover:scale-105 transition-all ${trader.avatarUrl ? 'hidden' : ''}`}>
                {isUntracked ? (
                  <Icons.Search size={14} />
                ) : trader.tags.includes('sports_whale') ? (
                  <Icons.Crown size={14} />
                ) : (
                  <Icons.User size={14} />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-base border border-border text-[8px] font-bold text-txt-muted">
                {isUntracked ? '?' : entry.rank}
              </div>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-bold text-sm text-txt-main truncate group-hover:text-brand transition-colors">
                  {trader.userName || trader.ensName ||
                    (trader.address.length > 24
                      ? trader.address.slice(0, 8) + '...' + trader.address.slice(-6)
                      : trader.address)}
                </span>
                {trader.tags.includes('sports_whale') && (
                  <span className="text-[8px] px-1 rounded bg-accent/10 text-accent font-bold">W</span>
                )}
                {isUntracked && (
                  <span className="text-[8px] px-1 rounded bg-surface2 border border-border text-txt-muted font-bold">
                    持续分析中，可点击查看详细分析
                  </span>
                )}
              </div>
              <span className="text-[10px] text-txt-muted font-mono truncate">
                {trader.address}
              </span>
            </div>
          </div>

          {/* PnL */}
          <div className="col-span-3 flex flex-col items-end justify-center">
            <span
              className={`text-sm font-mono font-bold ${
                isUntracked
                  ? 'text-txt-muted'
                  : trader.totalPnl >= 0
                  ? 'text-profit'
                  : 'text-loss'
              }`}
            >
              {isUntracked
                ? '-'
                : (trader.totalPnl >= 0 ? '+' : '') +
                  '$' +
                  Math.abs(trader.totalPnl).toLocaleString()}
            </span>
            <span className="text-[10px] text-txt-muted">
              ROI:{' '}
              <span
                className={
                  isUntracked
                    ? 'text-txt-muted'
                    : trader.totalRoi >= 0
                    ? 'text-profit'
                    : 'text-loss'
                }
              >
                {isUntracked ? '-' : (trader.totalRoi * 100).toFixed(1) + '%'}
              </span>
            </span>
          </div>

          {/* Win Rate */}
          <div className="col-span-2 flex flex-col items-end justify-center">
            <span className="text-sm font-mono font-medium text-txt-main">
              {isUntracked || trader.winRate == null ? '-' : (trader.winRate * 100).toFixed(1) + '%'}
            </span>
            {trader.winRate != null && (
              <div className="h-1 w-12 rounded-full bg-surface2 mt-1">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${trader.winRate * 100}%` }}
                ></div>
              </div>
            )}
          </div>

          {/* Action */}
          <div className="col-span-2 flex items-center justify-end">
            <button className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-brand/10 text-txt-muted hover:text-brand transition-colors">
              <Icons.ArrowUpRight size={16} />
            </button>
          </div>
        </div>
      );
    };

  return (
    <>
    <header className="sticky top-0 z-50 w-full border-b border-border bg-base/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Logo 区域 */}
        <Link
          ref={logoRef}
          to="/"
          className="flex items-center gap-3 transition-opacity hover:opacity-90"
          onMouseEnter={() => setIsLogoHovered(true)}
          onMouseLeave={() => setIsLogoHovered(false)}
        >
          <img
            src="/images/logo-noCN.png"
            alt="PreAlpha"
            className="h-16 w-auto object-contain"
            onError={(e) => {
              // Fallback to text if image fails to load
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
              if (fallback) {
                fallback.style.display = 'flex';
              }
            }}
          />
          {/* Fallback layout in case image is missing */}
          <div style={{ display: 'none' }} className="items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center text-brand drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]">
              <Logo size={32} />
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-lg font-bold tracking-tight text-txt-main">
                PreAlpha <span className="text-brand">.</span>
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-txt-muted">
                Prediction Analytics
              </span>
            </div>
          </div>
        </Link>

        {/* 导航 */}
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-sm font-medium transition-colors hover:text-brand ${
                location.pathname === item.path ? 'text-brand' : 'text-txt-secondary'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* 搜索栏 */}
        <div className="hidden flex-1 max-w-md mx-8 lg:block">
          <div
            className="group relative flex items-center cursor-pointer"
            onClick={() => setIsSearchOpen(true)}
          >
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Icons.Search className="h-4 w-4 text-txt-muted transition-colors group-hover:text-brand" />
            </div>
            <div className="block w-full rounded-lg border border-border bg-surface1 py-2 pl-9 pr-16 text-sm text-txt-muted shadow-sm transition-all group-hover:border-brand/50 group-hover:bg-surface2">
              {zh.common.searchAddressPlaceholder}
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2">
              <kbd className="rounded border border-border bg-surface2 px-2 py-0.5 text-xs text-txt-muted">
                ⌘K
              </kbd>
            </div>
          </div>
        </div>

        {/* 操作区域 */}
        <div className="flex items-center gap-3">
          {/* 社交媒体链接 */}
          <a
            href="https://x.com/prealpha_trade"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface1 text-txt-muted transition-all duration-300 hover:border-brand/50 hover:bg-surface2 hover:text-brand hover:shadow-[0_0_12px_rgba(0,240,255,0.15)]"
            aria-label="Follow on X"
          >
            <img src="/images/x-logo.png" alt="X" className="h-5 w-5 object-contain transition-transform duration-300 group-hover:scale-110" />
          </a>
          <a
            href="https://t.me/prealpha_trade"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface1 text-txt-muted transition-all duration-300 hover:border-brand/50 hover:bg-surface2 hover:text-brand hover:shadow-[0_0_12px_rgba(0,240,255,0.15)]"
            aria-label="Join Telegram"
          >
            <img src="/images/tg-logo.png" alt="Telegram" className="h-5 w-5 object-contain transition-transform duration-300 group-hover:scale-110" />
          </a>

          {/* 分隔线 */}
          <div className="h-8 w-px border-l border-border" />

          {/* 钱包连接按钮 - 自定义样式 */}
          {!isConnected ? (
            <button
              onClick={openConnectModal}
              className="group flex items-center gap-2 rounded-lg border border-border bg-surface1 px-4 py-2.5 text-sm font-medium text-txt-secondary transition-all duration-300 hover:border-brand/50 hover:bg-surface2 hover:text-brand hover:shadow-[0_0_20px_rgba(0,240,255,0.2)]"
            >
              <Icons.Wallet size={16} className="transition-transform duration-300 group-hover:scale-110" />
              <span>连接钱包</span>
            </button>
          ) : (
            <div className="relative">
              <button
                ref={walletButtonRef}
                onClick={() => setIsWalletDropdownOpen(!isWalletDropdownOpen)}
                className={`group flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] ${
                  authStatus === 'authenticated'
                    ? 'border-brand/30 bg-surface1 text-txt-main hover:border-brand/50 hover:bg-surface2 hover:text-brand'
                    : 'border-border bg-surface1 text-txt-secondary hover:border-brand/50 hover:bg-surface2 hover:text-brand'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full transition-all duration-300 ${
                    authStatus === 'authenticated' 
                      ? 'bg-brand shadow-[0_0_8px_rgba(0,240,255,0.6)] animate-pulse' 
                      : 'bg-txt-muted'
                  }`} />
                  <span className="font-mono text-xs">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                  <Icons.ChevronDown 
                    size={14} 
                    className={`transition-transform duration-300 ${isWalletDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>
              
              {/* 钱包下拉菜单 */}
              {isWalletDropdownOpen && address && (
                <WalletDropdown
                  address={address}
                  authStatus={authStatus}
                  onManagePersonalData={() => {
                    setIsPersonalDataModalOpen(true);
                    setIsWalletDropdownOpen(false);
                  }}
                  onDisconnect={handleDisconnect}
                  onClose={() => setIsWalletDropdownOpen(false)}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </header>

    {/* Search Modal Overlay */}
    {isSearchOpen && (
      <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
          onClick={() => setIsSearchOpen(false)}
        />

        {/* Modal Container */}
        <div className="relative w-full max-w-3xl flex flex-col overflow-hidden rounded-2xl border border-brand/20 bg-[#0B0E14] shadow-[0_0_50px_-12px_rgba(0,240,255,0.15)] transition-all animate-in zoom-in-95 slide-in-from-top-4 duration-200">
          {/* Input Header */}
          <div className="flex items-center gap-4 border-b border-border p-5">
            <Icons.Search className="h-6 w-6 text-brand" />
            <input
              autoFocus
              type="text"
              value={walletSearchQuery}
              onChange={(e) => setWalletSearchQuery(e.target.value)}
              placeholder={zh.common.searchAddressModalPlaceholder}
              className="flex-1 bg-transparent text-xl font-medium text-txt-main placeholder:text-txt-muted focus:outline-none"
            />
            <button
              onClick={() => setIsSearchOpen(false)}
              className="rounded p-1 text-txt-muted hover:bg-surface2 hover:text-txt-main transition-colors"
            >
              <span className="text-[10px] font-mono border border-border rounded px-1.5 py-0.5 mr-2">
                ESC
              </span>
              <Icons.X size={20} className="inline" />
            </button>
          </div>

          {/* Content Area */}
          <div className="bg-surface1/20 flex-1 min-h-[300px] flex flex-col">
            {/* Conditional Header: Trending Filters vs Search Results Label */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50">
              {!walletSearchQuery ? (
                <>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-txt-muted uppercase tracking-wider shrink-0">
                    <Icons.TrendingUp size={14} /> {zh.header.trending}:
                  </span>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    <button className="whitespace-nowrap rounded-full bg-brand/10 px-3 py-1 text-[11px] font-bold text-brand border border-brand/20 hover:bg-brand/20 transition-colors">
                      {zh.header.hotSmartMoney}
                    </button>
                    {/* <button className="whitespace-nowrap rounded-full bg-surface2 px-3 py-1 text-[11px] font-medium text-txt-secondary hover:text-txt-main hover:bg-surface2/80 transition-colors border border-transparent hover:border-border">
                      Whales
                    </button>
                    <button className="whitespace-nowrap rounded-full bg-surface2 px-3 py-1 text-[11px] font-medium text-txt-secondary hover:text-txt-main hover:bg-surface2/80 transition-colors border border-transparent hover:border-border">
                      High Frequency
                    </button>
                    <button className="whitespace-nowrap rounded-full bg-surface2 px-3 py-1 text-[11px] font-medium text-txt-secondary hover:text-txt-main hover:bg-surface2/80 transition-colors border border-transparent hover:border-border">
                      Snipers
                    </button> */}
                  </div>
                </>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-bold text-txt-muted uppercase tracking-wider">
                  <Icons.Wallet size={14} /> {zh.header.walletSection}
                </span>
              )}
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 px-6 py-2 text-[10px] font-bold uppercase text-txt-muted tracking-wider bg-surface1/30">
              <div className="col-span-5">交易者</div>
              <div className="col-span-3 text-right">PnL</div>
              <div className="col-span-2 text-right">胜率</div>
              <div className="col-span-2 text-right">查看详情</div>
            </div>

            {/* Results List */}
            <div className="max-h-[400px] overflow-y-auto">{renderSearchResults()}</div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border bg-surface1/50 px-4 py-3 text-[10px] text-txt-muted mt-auto">
              <div className="flex gap-4">
                <span className="flex items-center gap-1">
                  <span className="rounded bg-surface2 px-1">↑↓</span> {zh.header.instructions.navigate}
                </span>
                <span className="flex items-center gap-1">
                  <span className="rounded bg-surface2 px-1">↵</span> {zh.header.instructions.select}
                </span>
                <span className="flex items-center gap-1">
                  <span className="rounded bg-surface2 px-1">esc</span> {zh.header.instructions.close}
                </span>
              </div>
              <button
                className="hover:text-brand transition-colors flex items-center gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSearchOpen(false);
                  navigate('/');
                }}
              >
                {zh.header.viewAllRankings} <Icons.ArrowUpRight size={10} />
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Personal Data Management Modal */}
    <PersonalDataModal
      isOpen={isPersonalDataModalOpen}
      onClose={() => setIsPersonalDataModalOpen(false)}
    />

    {/* Magic Particle Effect */}
    <ParticleEffect isActive={isLogoHovered} sourceRect={logoRect} autoTrigger={shouldAutoTrigger} />
    </>
  );
};

export default Header;
