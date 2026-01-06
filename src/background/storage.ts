import { STORAGE_KEYS } from '../config/defaults';
import type { StoredState, Schedule } from '../types';

/**
 * Get stored state with defaults
 */
export async function getStoredState(): Promise<StoredState> {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.userPrompt,
    STORAGE_KEYS.filterEnabled,
    STORAGE_KEYS.schedule,
    STORAGE_KEYS.hasSeenOnboarding,
    STORAGE_KEYS.hideShorts,
  ]);

  return {
    userPrompt: result[STORAGE_KEYS.userPrompt] || '',
    filterEnabled: result[STORAGE_KEYS.filterEnabled] ?? true,
    schedule: result[STORAGE_KEYS.schedule] || { enabled: false },
    hasSeenOnboarding: result[STORAGE_KEYS.hasSeenOnboarding] ?? false,
    hideShorts: result[STORAGE_KEYS.hideShorts] ?? false,
  };
}

/**
 * Update stored state
 */
export async function updateStoredState(state: Partial<StoredState>): Promise<void> {
  const updates: Record<string, unknown> = {};

  if (state.userPrompt !== undefined) {
    updates[STORAGE_KEYS.userPrompt] = state.userPrompt;
  }
  if (state.filterEnabled !== undefined) {
    updates[STORAGE_KEYS.filterEnabled] = state.filterEnabled;
  }
  if (state.schedule !== undefined) {
    updates[STORAGE_KEYS.schedule] = state.schedule;
  }
  if (state.hasSeenOnboarding !== undefined) {
    updates[STORAGE_KEYS.hasSeenOnboarding] = state.hasSeenOnboarding;
  }
  if (state.hideShorts !== undefined) {
    updates[STORAGE_KEYS.hideShorts] = state.hideShorts;
  }

  await chrome.storage.local.set(updates);
}

/**
 * Get schedule from storage
 */
export async function getSchedule(): Promise<Schedule> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.schedule);
  return result[STORAGE_KEYS.schedule] || { enabled: false };
}

/**
 * Set schedule in storage
 */
export async function setSchedule(schedule: Schedule): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.schedule]: schedule });
}
