import type { VideoMetadata } from '../types';
import { debug } from '../utils/debug';

// Selectors for YouTube DOM elements
const SELECTORS = {
  // Video card container
  videoCard: 'ytd-rich-item-renderer',

  // Video title - multiple fallbacks for YouTube's changing structure
  // New 2024/2025 structure uses yt-lockup-view-model with yt-core-attributed-string
  title: [
    // New structure (2024/2025)
    'yt-lockup-view-model span.yt-core-attributed-string[role="text"]',
    'yt-lockup-view-model h3 span.yt-core-attributed-string',
    // Shorts structure on home page (uses ytm- prefix)
    'ytm-shorts-lockup-view-model h3 span.yt-core-attributed-string',
    '.shortsLockupViewModelHostMetadataTitle span.yt-core-attributed-string',
    // Old structure fallbacks
    '#video-title',
    '.ytd-rich-grid-media #video-title',
    'a#video-title-link',
    'yt-formatted-string#video-title',
  ],

  // Video link to extract ID
  videoLink: 'a[href*="watch?v="]',
  shortsLink: 'a[href*="/shorts/"]',

  // Channel name - new structure uses links with channel URLs
  channel: [
    // New structure (2024/2025) - channel link inside lockup
    'yt-lockup-view-model a.yt-core-attributed-string__link[href*="/channel/"]',
    'yt-lockup-view-model a.yt-core-attributed-string__link[href*="/@"]',
    // Shorts structure on home page
    'ytm-shorts-lockup-view-model a[href*="/@"]',
    // Old structure fallbacks
    '#channel-name a',
    'ytd-channel-name a',
    '.ytd-channel-name a',
    '#text.ytd-channel-name',
  ],

  // Grid container for observing new videos
  gridContainer: 'ytd-rich-grid-renderer #contents',

  // Chip bar
  chipBar: 'ytd-feed-filter-chip-bar-renderer #chips, yt-chip-cloud-chip-renderer',
};

/**
 * Extract video ID from a URL
 */
function extractVideoId(url: string): string | null {
  // Regular video: /watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch) return watchMatch[1];

  // Shorts: /shorts/VIDEO_ID
  const shortsMatch = url.match(/\/shorts\/([^/?]+)/);
  if (shortsMatch) return shortsMatch[1];

  return null;
}

/**
 * Find an element using multiple selector fallbacks
 */
function findElement(parent: Element, selectors: string[]): Element | null {
  for (const selector of selectors) {
    const element = parent.querySelector(selector);
    if (element) return element;
  }
  return null;
}

/**
 * Extract metadata from a single video card element
 */
export function extractVideoMetadata(cardElement: HTMLElement): VideoMetadata | null {
  // Find video link
  let videoLink = cardElement.querySelector(SELECTORS.videoLink) as HTMLAnchorElement | null;
  let isShort = false;

  if (!videoLink) {
    videoLink = cardElement.querySelector(SELECTORS.shortsLink) as HTMLAnchorElement | null;
    isShort = true;
  }

  if (!videoLink) {
    debug.warn('extractor', 'No video link found in card');
    return null;
  }

  const videoId = extractVideoId(videoLink.href);
  if (!videoId) {
    debug.warn('extractor', 'Could not extract video ID from link', { href: videoLink.href });
    return null;
  }

  // Find title - try multiple methods
  let title = '';

  // Method 1: Use aria-label on watch link (most reliable for new structure)
  const ariaLabel = videoLink.getAttribute('aria-label');
  if (ariaLabel) {
    // aria-label contains full title, sometimes with extra info like duration
    // Format: "Title by Channel Duration ago Views"
    // We just want the title part - take content before " by " if present
    title = ariaLabel.split(' by ')[0]?.trim() || ariaLabel.trim();
  }

  // Method 2: Find title element using selectors
  if (!title) {
    const titleElement = findElement(cardElement, SELECTORS.title);
    title = titleElement?.textContent?.trim() || '';
  }

  if (!title) {
    debug.warn('extractor', 'No title found for video', { videoId });
    return null;
  }

  // Find channel name
  let channel = 'Unknown Channel';
  const channelElement = findElement(cardElement, SELECTORS.channel);
  if (channelElement) {
    channel = channelElement.textContent?.trim() || 'Unknown Channel';
  }

  debug.info('extractor', `Extracted video: "${title.slice(0, 40)}..." by ${channel}`);

  return {
    id: videoId,
    title,
    channel,
    isShort,
    element: cardElement,
  };
}

/**
 * Extract metadata from all visible video cards
 */
export function extractAllVideos(): VideoMetadata[] {
  const videos: VideoMetadata[] = [];
  const cards = document.querySelectorAll<HTMLElement>(SELECTORS.videoCard);

  cards.forEach((card) => {
    // Skip if already processed
    if (card.dataset.ytfeedProcessed === 'true') return;

    const metadata = extractVideoMetadata(card);
    if (metadata) {
      videos.push(metadata);
    }
  });

  return videos;
}

/**
 * Get new unprocessed video cards
 */
export function getUnprocessedCards(): HTMLElement[] {
  const cards = document.querySelectorAll<HTMLElement>(SELECTORS.videoCard);
  return Array.from(cards).filter(
    (card) => card.dataset.ytfeedProcessed !== 'true'
  );
}

/**
 * Mark a video card as processed
 */
export function markAsProcessed(element: HTMLElement): void {
  element.dataset.ytfeedProcessed = 'true';
}

/**
 * Get the grid container element for MutationObserver
 */
export function getGridContainer(): Element | null {
  const grid = document.querySelector(SELECTORS.gridContainer);
  debug.info('extractor', `getGridContainer: ${grid ? 'found' : 'not found'}`, { selector: SELECTORS.gridContainer });
  return grid;
}

/**
 * Get the chip bar element
 */
export function getChipBar(): Element | null {
  return document.querySelector(SELECTORS.chipBar);
}

/**
 * Check if we're on the YouTube home page
 */
export function isHomePage(): boolean {
  const path = window.location.pathname;
  const result = path === '/' || path === '/feed/subscriptions';
  debug.info('extractor', `isHomePage: ${result}`, { path });
  return result;
}
