/**
 * Update Carousel Component
 *
 * A floating carousel for update announcements with image + text layout.
 * Features: auto-slide, pause on hover, localStorage persistence.
 */

import { useEffect, useState, useCallback } from 'react';
import { Icons } from './icons';
import { clsx } from 'clsx';
import { zh } from '@/lib/translations';

// ============================================================
// Type Definitions
// ============================================================

export interface UpdateSlide {
  id: string;
  version: string;
  title: string;
  description: string;
  imageUrl?: string;
  linkUrl?: string;
}

export interface UpdateCarouselProps {
  slides: UpdateSlide[];
  storageKey?: string;
  autoPlayInterval?: number;
}

// ============================================================
// Constants
// ============================================================

const DEFAULT_STORAGE_KEY = 'prealpha-update-carousel-dismissed';
const DEFAULT_AUTO_PLAY_INTERVAL = 5000;
const VERSION_KEY = 'prealpha-update-carousel-version';

// ============================================================
// Component
// ============================================================

export function UpdateCarousel({
  slides,
  storageKey = DEFAULT_STORAGE_KEY,
  autoPlayInterval = DEFAULT_AUTO_PLAY_INTERVAL,
}: UpdateCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Get the latest version from slides for storage check
  const latestVersion = slides.length > 0 ? slides[0].version : '';

  // Check localStorage on mount
  useEffect(() => {
    const dismissedVersion = localStorage.getItem(storageKey);
    const storedVersion = localStorage.getItem(VERSION_KEY);

    // Show if: never dismissed, or version has changed
    if (!dismissedVersion || storedVersion !== latestVersion) {
      setIsDismissed(false);
    }
  }, [storageKey, latestVersion]);

  // Auto-slide logic
  useEffect(() => {
    if (isDismissed || isExiting || isPaused || slides.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [isDismissed, isExiting, isPaused, slides.length, autoPlayInterval]);

  // Handle close
  const handleClose = useCallback(() => {
    setIsExiting(true);
    // Save to localStorage after animation
    setTimeout(() => {
      localStorage.setItem(storageKey, latestVersion);
      localStorage.setItem(VERSION_KEY, latestVersion);
      setIsDismissed(true);
    }, 300);
  }, [storageKey, latestVersion]);

  // Handle dot navigation
  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Handle next/prev
  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Don't render if dismissed
  if (isDismissed) return null;
  if (slides.length === 0) return null;

  const currentSlide = slides[currentIndex];
  const hasImage = Boolean(currentSlide.imageUrl);

  return (
    <div
      className={clsx(
        'fixed inset-0 z-50 flex items-center justify-center transition-all duration-300',
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      )}
    >
      {/* Backdrop */}
      <div
        className={clsx(
          'absolute inset-0 bg-black/60 transition-opacity duration-300',
          isExiting ? 'opacity-0' : 'opacity-100'
        )}
        onClick={handleClose}
      />

      {/* Carousel Container */}
      <div
        className={clsx(
          'relative w-full max-w-[600px] mx-4 transition-all duration-300',
          isExiting ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        )}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Main Card */}
        <div className="relative rounded-xl border border-brand/30 bg-surface1 shadow-glow-brand overflow-hidden">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 z-10 flex-shrink-0 rounded-full bg-surface2/80 backdrop-blur-sm p-1.5 text-txt-muted hover:text-txt-main hover:bg-surface2 transition-all"
            aria-label={zh.ui.updateCarousel.close}
          >
            <Icons.X className="h-4 w-4" />
          </button>

          {/* Slide Content */}
          <div className="flex flex-col">
            {/* Image Section - Top */}
            {hasImage && (
              <div className="relative w-full aspect-[16/10] bg-surface2 overflow-hidden">
                <img
                  src={currentSlide.imageUrl}
                  alt={currentSlide.title}
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Content Section - Bottom */}
            <div className={clsx('p-6', !hasImage && 'text-center')}>
              {/* Version Badge */}
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand shadow-glow-brand" />
                <span className="text-xs font-semibold uppercase tracking-wider text-brand">
                  {currentSlide.version}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-heading text-xl font-bold text-txt-main mb-2">
                {currentSlide.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-txt-secondary leading-relaxed">
                {currentSlide.description}
              </p>

              {/* Optional Link */}
              {currentSlide.linkUrl && (
                <a
                  href={currentSlide.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-brand hover:text-brand/80 transition-colors"
                >
                  {zh.ui.updateCarousel.learnMore}
                  <Icons.ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Navigation Section */}
          {slides.length > 1 && (
            <div className="border-t border-border bg-surface2/50 px-6 py-3">
              <div className="flex items-center justify-between">
                {/* Dots Indicator */}
                <div className="flex items-center gap-2">
                  {slides.map((slide, index) => (
                    <button
                      key={slide.id}
                      onClick={() => goToSlide(index)}
                      className={clsx(
                        'rounded-full transition-all duration-300',
                        index === currentIndex
                          ? 'h-2 w-6 bg-brand shadow-glow-brand'
                          : 'h-2 w-2 bg-brand/30 hover:bg-brand/50'
                      )}
                      aria-label={zh.ui.updateCarousel.goToSlide(index + 1)}
                    />
                  ))}
                </div>

                {/* Navigation Arrows */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={goToPrev}
                    className="rounded-lg p-2 text-txt-muted hover:text-txt-main hover:bg-surface1 transition-colors"
                    aria-label={zh.ui.updateCarousel.previous}
                  >
                    <Icons.ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={goToNext}
                    className="rounded-lg p-2 text-txt-muted hover:text-txt-main hover:bg-surface1 transition-colors"
                    aria-label={zh.ui.updateCarousel.next}
                  >
                    <Icons.ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Progress Bar (shows time until next slide) */}
          {slides.length > 1 && !isPaused && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-surface2/50 overflow-hidden">
              <div
                className="h-full bg-brand/50 shadow-glow-brand"
                style={{
                  animation: 'progress linear',
                  animationDuration: `${autoPlayInterval}ms`,
                }}
              />
            </div>
          )}
        </div>

        {/* Hint Text */}
        <p className="text-center mt-3 text-xs text-txt-muted">
          {slides.length > 1 ? zh.ui.updateCarousel.autoPlayHint : zh.ui.updateCarousel.clickToClose}
        </p>
      </div>

      <style>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// Default Slides (Example - Modify imageUrl with your image host links)
// ============================================================

export const DEFAULT_UPDATE_SLIDES: UpdateSlide[] = [
  {
    id: 'v1.1.3-intro',
    version: '1.1.3',
    title: '欢迎使用 PreAlpha',
    description: '追踪聪明钱，捕捉 Alpha 信号。我们现已支持实时信号监控与深度地址分析功能。',
  },
  {
    id: 'v1.1.3-features',
    version: '1.1.3',
    title: '核心功能亮点',
    description: '智能评分系统、实时信号流、胜率分析……全方位助您识别预测市场中的 Alpha 机会。',
  },
  {
    id: 'v1.1.3-tips',
    version: '1.1.3',
    title: '使用小贴士',
    description: '点击关注您感兴趣的交易者，同时支持给交易者打标签和备注。',
    // imageUrl: 'https://your-image-host.com/tips.png', // 图床链接
  },
  {
    id: 'v1.1.3-update1',
    version: '1.1.3',
    title: '版本更新-1',
    description: '优化了交易者组件视图显示，令整体更为统一',
    imageUrl: '/updateimg/update1.png', 
  },
  {
    id: 'v1.1.3-update2',
    version: '1.1.3',
    title: '版本更新-2',
    description: '优化了个人数据管理显示，信息更全面和集中显示',
    imageUrl: '/updateimg/update2.png', 
  },
  {
    id: 'v1.1.3-update3',
    version: '1.1.3',
    title: '版本更新-3',
    description: '优化了数据存储机制，提高了数据获取效率和及时性',
  }
];
