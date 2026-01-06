import { STORAGE_KEYS } from '../config/defaults';
import { hashPrompt } from '../utils/messaging';
import type { Classification, CacheEntry, ClassificationCache } from '../types';

// In-memory cache (faster than storage for frequent access)
let memoryCache: ClassificationCache = {};
let currentPromptHash: string = '';

/**
 * Initialize cache from storage
 */
export async function initCache(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.classificationCache);
    memoryCache = result[STORAGE_KEYS.classificationCache] || {};
  } catch (error) {
    console.error('[YTFeed] Failed to load cache:', error);
    memoryCache = {};
  }
}

/**
 * Save cache to storage
 */
async function persistCache(): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.classificationCache]: memoryCache });
  } catch (error) {
    console.error('[YTFeed] Failed to persist cache:', error);
  }
}

/**
 * Set the current prompt hash (called when prompt changes)
 */
export function setPromptHash(prompt: string): void {
  currentPromptHash = hashPrompt(prompt);
}

/**
 * Get cached classification for a video
 */
export function getCached(videoId: string): Classification | null {
  const entry = memoryCache[videoId];

  if (!entry) return null;

  // Check if prompt hash matches
  if (entry.promptHash !== currentPromptHash) {
    return null;
  }

  // Check if cache is too old (24 hours)
  const maxAge = 24 * 60 * 60 * 1000;
  if (Date.now() - entry.timestamp > maxAge) {
    delete memoryCache[videoId];
    return null;
  }

  return entry.classification;
}

/**
 * Get cached classifications for multiple videos
 * Returns map of videoId -> classification for cached videos
 */
export function getCachedBatch(videoIds: string[]): Map<string, Classification> {
  const cached = new Map<string, Classification>();

  videoIds.forEach((id) => {
    const classification = getCached(id);
    if (classification) {
      cached.set(id, classification);
    }
  });

  return cached;
}

/**
 * Cache a classification result
 */
export function setCached(videoId: string, classification: Classification): void {
  memoryCache[videoId] = {
    classification,
    promptHash: currentPromptHash,
    timestamp: Date.now(),
  };
}

/**
 * Cache multiple classification results
 */
export function setCachedBatch(
  classifications: Record<string, Classification>
): void {
  Object.entries(classifications).forEach(([videoId, classification]) => {
    setCached(videoId, classification);
  });

  // Persist to storage (debounced)
  debouncedPersist();
}

// Debounce persistence to avoid too many storage writes
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedPersist(): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
  }
  persistTimer = setTimeout(() => {
    persistCache();
    persistTimer = null;
  }, 1000);
}

/**
 * Clear all cache
 */
export async function clearCache(): Promise<void> {
  memoryCache = {};
  await chrome.storage.local.remove(STORAGE_KEYS.classificationCache);
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; promptHash: string } {
  return {
    size: Object.keys(memoryCache).length,
    promptHash: currentPromptHash,
  };
}
