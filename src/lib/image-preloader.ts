/**
 * Image Preloader Utility
 *
 * Preloads avatar images into browser cache to prevent flickering
 * when components re-render.
 */

import { logger } from './logger';

// Set to track already preloaded URLs
const preloadedUrls = new Set<string>();
const loadingUrls = new Set<string>();

/**
 * Preload a single image URL into browser cache
 *
 * @param url - The image URL to preload
 * @returns Promise that resolves when image is loaded or rejects on error
 */
export function preloadImageUrl(url: string): Promise<void> {
  // Skip if already preloaded or currently loading
  if (!url || preloadedUrls.has(url) || loadingUrls.has(url)) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    loadingUrls.add(url);

    const img = new Image();

    img.onload = () => {
      preloadedUrls.add(url);
      loadingUrls.delete(url);
      logger.debug('[ImagePreloader] Preloaded:', url);
      resolve();
    };

    img.onerror = () => {
      loadingUrls.delete(url);
      // Don't add to preloadedUrls on error - will retry on next call
      logger.warn('[ImagePreloader] Failed to preload:', url);
      reject(new Error(`Failed to preload image: ${url}`));
    };

    // Start loading
    img.src = url;
  });
}

/**
 * Preload multiple image URLs in parallel
 *
 * @param urls - Array of image URLs to preload
 * @returns Promise that resolves when all images are loaded
 */
export async function preloadImageUrls(urls: readonly string[]): Promise<void> {
  const uniqueUrls = Array.from(new Set(urls.filter(Boolean)));

  if (uniqueUrls.length === 0) {
    return;
  }

  logger.debug(`[ImagePreloader] Preloading ${uniqueUrls.length} images...`);

  try {
    // Load all images in parallel, ignore individual failures
    await Promise.allSettled(uniqueUrls.map(preloadImageUrl));
    logger.debug('[ImagePreloader] Batch preload complete');
  } catch (error) {
    // Promise.allSettled never rejects, but log if something unexpected happened
    logger.error('[ImagePreloader] Unexpected error during batch preload:', error);
  }
}

/**
 * Check if a URL has been preloaded
 *
 * @param url - The image URL to check
 * @returns true if the URL has been successfully preloaded
 */
export function isPreloaded(url: string): boolean {
  return preloadedUrls.has(url);
}

/**
 * Clear the preload cache (useful for testing or memory management)
 */
export function clearPreloadCache(): void {
  preloadedUrls.clear();
  loadingUrls.clear();
  logger.debug('[ImagePreloader] Cache cleared');
}

/**
 * Get preload cache statistics
 */
export function getPreloadStats() {
  return {
    preloaded: preloadedUrls.size,
    loading: loadingUrls.size,
  };
}
