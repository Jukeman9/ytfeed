import { STORAGE_KEYS } from '../config/defaults';
import type { Stats } from '../types';

// In-memory stats (reset on service worker restart)
let sessionStats: Stats = {
  hiddenThisSession: 0,
  totalClassified: 0,
  lastUpdated: Date.now(),
};

/**
 * Get current stats
 */
export function getStats(): Stats {
  return { ...sessionStats };
}

/**
 * Update stats after classification
 */
export function updateStats(hidden: number, total: number): void {
  sessionStats.hiddenThisSession += hidden;
  sessionStats.totalClassified += total;
  sessionStats.lastUpdated = Date.now();

  // Persist to storage
  persistStats();
}

/**
 * Reset session stats
 */
export function resetStats(): void {
  sessionStats = {
    hiddenThisSession: 0,
    totalClassified: 0,
    lastUpdated: Date.now(),
  };
  persistStats();
}

/**
 * Persist stats to storage
 */
async function persistStats(): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.stats]: sessionStats });
  } catch (error) {
    console.error('[YTFeed] Failed to persist stats:', error);
  }
}

/**
 * Load stats from storage (on startup)
 */
export async function loadStats(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.stats);
    if (result[STORAGE_KEYS.stats]) {
      sessionStats = result[STORAGE_KEYS.stats];
    }
  } catch (error) {
    console.error('[YTFeed] Failed to load stats:', error);
  }
}
