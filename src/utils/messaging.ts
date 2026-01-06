import type {
  Message,
  ClassifyVideosMessage,
  UpdateStateMessage,
  ClassifyVideosResponse,
  GetStateResponse,
  GetStatsResponse,
  GenericResponse,
} from '../types';
import { debug } from './debug';

// Message timeout in milliseconds
const MESSAGE_TIMEOUT = 5000;

// Send a message to the background script with timeout
export function sendMessage<T>(message: Message): Promise<T> {
  debug.info('messaging', `Sending: ${message.type}`, message);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      debug.error('messaging', `TIMEOUT: ${message.type} after ${MESSAGE_TIMEOUT}ms`);
      reject(new Error(`Message timeout: ${message.type}`));
    }, MESSAGE_TIMEOUT);

    chrome.runtime.sendMessage(message, (response: T) => {
      clearTimeout(timeout);
      if (chrome.runtime.lastError) {
        debug.error('messaging', `Error: ${message.type}`, chrome.runtime.lastError.message);
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        debug.info('messaging', `Response: ${message.type}`, response);
        resolve(response);
      }
    });
  });
}

// Convenience methods for specific message types
export async function classifyVideos(
  videos: ClassifyVideosMessage['videos']
): Promise<ClassifyVideosResponse> {
  return sendMessage<ClassifyVideosResponse>({
    type: 'CLASSIFY_VIDEOS',
    videos,
  });
}

export async function getState(): Promise<GetStateResponse> {
  return sendMessage<GetStateResponse>({
    type: 'GET_STATE',
  });
}

export async function updateState(
  state: UpdateStateMessage['state']
): Promise<GenericResponse> {
  return sendMessage<GenericResponse>({
    type: 'UPDATE_STATE',
    state,
  });
}

export async function getStats(): Promise<GetStatsResponse> {
  return sendMessage<GetStatsResponse>({
    type: 'GET_STATS',
  });
}

export async function clearCache(): Promise<GenericResponse> {
  return sendMessage<GenericResponse>({
    type: 'CLEAR_CACHE',
  });
}

export async function setError(hasError: boolean): Promise<GenericResponse> {
  return sendMessage<GenericResponse>({
    type: 'SET_ERROR',
    hasError,
  });
}

// Simple hash function for prompt caching
export function hashPrompt(prompt: string): string {
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    const char = prompt.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}
