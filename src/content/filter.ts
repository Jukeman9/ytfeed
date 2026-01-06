import type { VideoMetadata, ClassificationResult } from '../types';
import { removeSkeleton } from './skeleton';

/**
 * Apply classification results to video elements
 */
export function applyClassifications(
  videos: VideoMetadata[],
  classifications: ClassificationResult,
  hideShorts: boolean = false
): { shown: number; hidden: number } {
  let shown = 0;
  let hidden = 0;

  videos.forEach((video) => {
    const classification = classifications[video.id];
    const element = video.element;

    // Remove skeleton first
    removeSkeleton(element);

    // If hideShorts is enabled and this is a Short, always hide it
    if (hideShorts && video.isShort) {
      hideVideo(element);
      hidden++;
      return;
    }

    if (classification === 'HIDE') {
      hideVideo(element);
      hidden++;
    } else {
      showVideo(element);
      shown++;
    }
  });

  return { shown, hidden };
}

/**
 * Show a video with fade-in animation
 */
export function showVideo(element: HTMLElement): void {
  element.classList.remove('ytfeed-hide', 'ytfeed-skeleton', 'ytfeed-processing');
  element.classList.add('ytfeed-show', 'ytfeed-fade-in');

  // Remove fade-in class after animation completes
  setTimeout(() => {
    element.classList.remove('ytfeed-fade-in');
  }, 300);
}

/**
 * Hide a video (display: none)
 */
export function hideVideo(element: HTMLElement): void {
  element.classList.remove('ytfeed-show', 'ytfeed-skeleton', 'ytfeed-processing', 'ytfeed-fade-in');
  element.classList.add('ytfeed-hide');
}

/**
 * Show all videos (when filter is disabled or on error)
 */
export function showAllVideos(): void {
  const hiddenVideos = document.querySelectorAll<HTMLElement>('.ytfeed-hide');
  hiddenVideos.forEach((element) => {
    element.classList.remove('ytfeed-hide');
    element.classList.add('ytfeed-show');
  });

  // Also remove any skeletons
  const skeletons = document.querySelectorAll<HTMLElement>('.ytfeed-skeleton');
  skeletons.forEach((element) => {
    element.classList.remove('ytfeed-skeleton');
    element.classList.add('ytfeed-show');
  });
}

/**
 * Reset all video states
 */
export function resetAllVideoStates(): void {
  const allVideos = document.querySelectorAll<HTMLElement>(
    '.ytfeed-show, .ytfeed-hide, .ytfeed-skeleton, .ytfeed-processing'
  );

  allVideos.forEach((element) => {
    element.classList.remove(
      'ytfeed-show',
      'ytfeed-hide',
      'ytfeed-skeleton',
      'ytfeed-processing',
      'ytfeed-fade-in'
    );
  });
}

/**
 * Check if there are any visible videos after filtering
 */
export function hasVisibleVideos(): boolean {
  const visibleVideos = document.querySelectorAll<HTMLElement>(
    'ytd-rich-item-renderer:not(.ytfeed-hide)'
  );
  return visibleVideos.length > 0;
}

/**
 * Show empty state message when all videos are filtered
 */
export function showEmptyState(): void {
  // Check if empty state already exists
  if (document.querySelector('.ytfeed-empty-state')) return;

  const container = document.querySelector('ytd-rich-grid-renderer #contents');
  if (!container) return;

  const emptyState = document.createElement('div');
  emptyState.className = 'ytfeed-empty-state';
  emptyState.innerHTML = `
    <div class="ytfeed-empty-state-icon">🔍</div>
    <div class="ytfeed-empty-state-text">No videos match your filter</div>
    <div class="ytfeed-hint">Try adjusting your preferences</div>
  `;

  container.insertBefore(emptyState, container.firstChild);
}

/**
 * Remove empty state message
 */
export function removeEmptyState(): void {
  const emptyState = document.querySelector('.ytfeed-empty-state');
  if (emptyState) {
    emptyState.remove();
  }
}

/**
 * Get count of currently hidden videos
 */
export function getHiddenCount(): number {
  return document.querySelectorAll('.ytfeed-hide').length;
}
