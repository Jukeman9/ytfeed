import { BATCH_CONFIG } from '../config/defaults';
import { getGridContainer, getUnprocessedCards, extractVideoMetadata, markAsProcessed } from './extractor';
import { applySkeleton } from './skeleton';
import { debug } from '../utils/debug';
import type { VideoMetadata } from '../types';

type VideoCallback = (videos: VideoMetadata[]) => void;

let observer: MutationObserver | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let videoCallback: VideoCallback | null = null;

/**
 * Process newly detected video cards
 */
function processNewCards(): void {
  if (!videoCallback) return;

  const unprocessedCards = getUnprocessedCards();
  debug.info('observer', `Found ${unprocessedCards.length} unprocessed cards`);
  if (unprocessedCards.length === 0) return;

  const videos: VideoMetadata[] = [];

  unprocessedCards.forEach((card) => {
    const metadata = extractVideoMetadata(card);
    if (metadata) {
      // Apply skeleton loading state
      applySkeleton(card);
      // Mark as being processed
      markAsProcessed(card);
      videos.push(metadata);
    }
  });

  debug.info('observer', `Extracted ${videos.length} videos with valid metadata`);
  if (videos.length > 0) {
    videoCallback(videos);
  }
}

/**
 * Debounced handler for mutation events
 */
function handleMutation(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    processNewCards();
    debounceTimer = null;
  }, BATCH_CONFIG.debounceMs);
}

/**
 * Start observing the YouTube grid for new video cards
 */
export function startObserver(callback: VideoCallback): void {
  debug.info('observer', 'Starting observer...');
  videoCallback = callback;

  const gridContainer = getGridContainer();
  if (!gridContainer) {
    debug.warn('observer', 'Grid container not found, retrying in 500ms...');
    setTimeout(() => startObserver(callback), 500);
    return;
  }

  debug.info('observer', 'Grid container found', { element: gridContainer.tagName });

  // Stop existing observer if any
  stopObserver();

  observer = new MutationObserver((mutations) => {
    let hasNewVideos = false;

    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          // Check if it's a video card or contains video cards
          if (
            node.nodeName === 'YTD-RICH-ITEM-RENDERER' ||
            node.querySelector?.('ytd-rich-item-renderer')
          ) {
            hasNewVideos = true;
          }
        }
      });
    });

    if (hasNewVideos) {
      debug.info('observer', 'New video cards detected via mutation');
      handleMutation();
    }
  });

  observer.observe(gridContainer, {
    childList: true,
    subtree: true,
  });

  debug.info('observer', 'MutationObserver attached, processing existing cards...');
  // Process any existing cards
  processNewCards();
}

/**
 * Stop the MutationObserver
 */
export function stopObserver(): void {
  if (observer) {
    debug.info('observer', 'Stopping observer');
    observer.disconnect();
    observer = null;
  }

  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

/**
 * Reset all processed flags and re-scan
 */
export function resetProcessedFlags(): void {
  const cards = document.querySelectorAll<HTMLElement>('[data-ytfeed-processed]');
  debug.info('observer', `Resetting processed flags on ${cards.length} cards`);
  cards.forEach((card) => {
    delete card.dataset.ytfeedProcessed;
  });
}

/**
 * Listen for YouTube SPA navigation events
 */
export function listenForNavigation(callback: () => void): void {
  // YouTube uses custom navigation events
  document.addEventListener('yt-navigate-finish', () => {
    // Reset processed flags on navigation
    resetProcessedFlags();
    callback();
  });

  // Also listen for popstate (browser back/forward)
  window.addEventListener('popstate', () => {
    resetProcessedFlags();
    callback();
  });
}
