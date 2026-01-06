import { callOpenAI } from '../config/api';
import { SCHEDULE_PROMPT } from '../config/defaults';
import { getSchedule, setSchedule, getStoredState, updateStoredState } from './storage';
import type { Schedule } from '../types';

// Day name mapping
const DAY_MAP: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

let scheduleCheckInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Extract schedule from user prompt using LLM
 */
export async function extractSchedule(userPrompt: string): Promise<Schedule> {
  if (!userPrompt.trim()) {
    return { enabled: false };
  }

  const formattedPrompt = SCHEDULE_PROMPT.replace('{userPrompt}', userPrompt);

  try {
    const response = await callOpenAI(
      'You extract time schedules from text. Respond with JSON only.',
      formattedPrompt
    );

    // Parse response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { enabled: false };
    }

    const parsed = JSON.parse(jsonMatch[0]) as Schedule;

    // Validate schedule
    if (!parsed.enabled) {
      return { enabled: false };
    }

    // Validate days
    if (!parsed.days || !Array.isArray(parsed.days) || parsed.days.length === 0) {
      return { enabled: false };
    }

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timeRegex.test(parsed.startTime || '') || !timeRegex.test(parsed.endTime || '')) {
      return { enabled: false };
    }

    return {
      enabled: true,
      days: parsed.days.map((d) => d.toLowerCase()),
      startTime: parsed.startTime,
      endTime: parsed.endTime,
    };
  } catch (error) {
    console.error('[YTFeed] Failed to extract schedule:', error);
    return { enabled: false };
  }
}

/**
 * Check if current time is within schedule
 */
export function isWithinSchedule(schedule: Schedule): boolean {
  if (!schedule.enabled || !schedule.days || !schedule.startTime || !schedule.endTime) {
    return true; // No schedule = always active
  }

  const now = new Date();
  const currentDay = now.getDay();
  const currentDayName = Object.entries(DAY_MAP).find(([, num]) => num === currentDay)?.[0];

  // Check if today is a scheduled day
  if (!currentDayName || !schedule.days.includes(currentDayName)) {
    return false;
  }

  // Parse times
  const [startHour, startMin] = schedule.startTime.split(':').map(Number);
  const [endHour, endMin] = schedule.endTime.split(':').map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  // Handle overnight schedules (e.g., 22:00 - 06:00)
  if (endMinutes < startMinutes) {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/**
 * Start schedule checking
 */
export async function startScheduleChecker(): Promise<void> {
  // Check every minute
  if (scheduleCheckInterval) {
    clearInterval(scheduleCheckInterval);
  }

  scheduleCheckInterval = setInterval(async () => {
    try {
      const schedule = await getSchedule();
      const state = await getStoredState();

      if (schedule.enabled) {
        const shouldBeEnabled = isWithinSchedule(schedule);

        // Only update if state changed
        if (shouldBeEnabled !== state.filterEnabled) {
          await updateStoredState({ filterEnabled: shouldBeEnabled });
          console.log(`[YTFeed] Schedule: filter ${shouldBeEnabled ? 'enabled' : 'disabled'}`);
        }
      }
    } catch (error) {
      console.error('[YTFeed] Schedule check error:', error);
    }
  }, 60000); // Every minute

  // Initial check
  const schedule = await getSchedule();
  if (schedule.enabled) {
    const state = await getStoredState();
    const shouldBeEnabled = isWithinSchedule(schedule);
    if (shouldBeEnabled !== state.filterEnabled) {
      await updateStoredState({ filterEnabled: shouldBeEnabled });
    }
  }
}

/**
 * Stop schedule checking
 */
export function stopScheduleChecker(): void {
  if (scheduleCheckInterval) {
    clearInterval(scheduleCheckInterval);
    scheduleCheckInterval = null;
  }
}

/**
 * Process user prompt for schedule and save if found
 */
export async function processPromptSchedule(userPrompt: string): Promise<Schedule> {
  const schedule = await extractSchedule(userPrompt);
  await setSchedule(schedule);
  return schedule;
}
