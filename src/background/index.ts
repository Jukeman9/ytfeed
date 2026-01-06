import { initCache, clearCache as clearCacheData } from './cache';
import { getStoredState, updateStoredState } from './storage';
import { classifyVideos } from './classifier';
import { getStats, loadStats } from './stats';
import { startScheduleChecker, processPromptSchedule } from './scheduler';
import { debug } from '../utils/debug';
import type {
  Message,
  ClassifyVideosResponse,
  GetStateResponse,
  GetStatsResponse,
  GenericResponse,
} from '../types';

// Initialize on service worker start
async function initialize(): Promise<void> {
  debug.info('background', 'Background service worker starting...');

  // Load cache and stats
  debug.info('background', 'Initializing cache...');
  await initCache();
  debug.info('background', 'Loading stats...');
  await loadStats();

  // Start schedule checker
  debug.info('background', 'Starting schedule checker...');
  await startScheduleChecker();

  debug.info('background', 'Background service worker ready');
}

// Handle messages from content script
chrome.runtime.onMessage.addListener(
  (
    message: Message,
    _sender,
    sendResponse: (response: unknown) => void
  ): boolean => {
    handleMessage(message, sendResponse);
    return true; // Keep channel open for async response
  }
);

async function handleMessage(
  message: Message,
  sendResponse: (response: unknown) => void
): Promise<void> {
  debug.info('background', `Handling message: ${message.type}`, message);
  try {
    switch (message.type) {
      case 'CLASSIFY_VIDEOS': {
        debug.info('background', `Classifying ${message.videos.length} videos`);
        const state = await getStoredState();
        const classifications = await classifyVideos(message.videos, state.userPrompt);
        const response: ClassifyVideosResponse = {
          success: true,
          classifications,
        };
        debug.info('background', 'Classification complete', { count: Object.keys(classifications).length });
        sendResponse(response);
        break;
      }

      case 'GET_STATE': {
        const state = await getStoredState();
        debug.state('Returning state', state);
        const response: GetStateResponse = {
          success: true,
          state,
        };
        sendResponse(response);
        break;
      }

      case 'UPDATE_STATE': {
        debug.state('Updating state', message.state);
        await updateStoredState(message.state);

        // If prompt changed, extract schedule
        if (message.state.userPrompt !== undefined) {
          await processPromptSchedule(message.state.userPrompt);
        }

        const response: GenericResponse = { success: true };
        sendResponse(response);
        break;
      }

      case 'GET_STATS': {
        const stats = getStats();
        debug.info('background', 'Returning stats', stats);
        const response: GetStatsResponse = {
          success: true,
          stats,
        };
        sendResponse(response);
        break;
      }

      case 'CLEAR_CACHE': {
        debug.info('background', 'Clearing cache');
        await clearCacheData();
        const response: GenericResponse = { success: true };
        sendResponse(response);
        break;
      }

      case 'SET_ERROR': {
        debug.info('background', `Setting error state: ${message.hasError}`);
        // Update extension icon badge for error state
        if (message.hasError) {
          chrome.action.setBadgeText({ text: '!' });
          chrome.action.setBadgeBackgroundColor({ color: '#ff4444' });
        } else {
          chrome.action.setBadgeText({ text: '' });
        }
        const response: GenericResponse = { success: true };
        sendResponse(response);
        break;
      }

      default: {
        debug.warn('background', `Unknown message type: ${(message as Message).type}`);
        const response: GenericResponse = {
          success: false,
          error: 'Unknown message type',
        };
        sendResponse(response);
      }
    }
  } catch (error) {
    debug.error('background', 'Message handler error', error);
    const response: GenericResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    sendResponse(response);
  }
}

// Initialize
initialize();
