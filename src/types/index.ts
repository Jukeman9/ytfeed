// Video metadata extracted from YouTube DOM
export interface VideoMetadata {
  id: string;
  title: string;
  channel: string;
  isShort: boolean;
  element: HTMLElement;
}

// Classification result from LLM
export type Classification = 'SHOW' | 'HIDE';

// Classification result for a batch of videos
export interface ClassificationResult {
  [videoId: string]: Classification;
}

// Cache entry for a classified video
export interface CacheEntry {
  classification: Classification;
  promptHash: string;
  timestamp: number;
}

// Classification cache
export interface ClassificationCache {
  [videoId: string]: CacheEntry;
}

// Schedule configuration
export interface Schedule {
  enabled: boolean;
  days?: string[]; // ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  startTime?: string; // 'HH:MM'
  endTime?: string; // 'HH:MM'
}

// Stats tracking
export interface Stats {
  hiddenThisSession: number;
  totalClassified: number;
  lastUpdated: number;
}

// Extension state stored in chrome.storage
export interface StoredState {
  userPrompt: string;
  filterEnabled: boolean;
  schedule: Schedule;
  hasSeenOnboarding: boolean;
  hideShorts: boolean;
}

// Message types for chrome.runtime messaging
export type MessageType =
  | 'CLASSIFY_VIDEOS'
  | 'GET_STATE'
  | 'UPDATE_STATE'
  | 'GET_STATS'
  | 'CLEAR_CACHE'
  | 'SET_ERROR';

export interface BaseMessage {
  type: MessageType;
}

export interface ClassifyVideosMessage extends BaseMessage {
  type: 'CLASSIFY_VIDEOS';
  videos: Array<{
    id: string;
    title: string;
    channel: string;
  }>;
}

export interface GetStateMessage extends BaseMessage {
  type: 'GET_STATE';
}

export interface UpdateStateMessage extends BaseMessage {
  type: 'UPDATE_STATE';
  state: Partial<StoredState>;
}

export interface GetStatsMessage extends BaseMessage {
  type: 'GET_STATS';
}

export interface ClearCacheMessage extends BaseMessage {
  type: 'CLEAR_CACHE';
}

export interface SetErrorMessage extends BaseMessage {
  type: 'SET_ERROR';
  hasError: boolean;
}

export type Message =
  | ClassifyVideosMessage
  | GetStateMessage
  | UpdateStateMessage
  | GetStatsMessage
  | ClearCacheMessage
  | SetErrorMessage;

// Response types
export interface ClassifyVideosResponse {
  success: boolean;
  classifications?: ClassificationResult;
  error?: string;
}

export interface GetStateResponse {
  success: boolean;
  state?: StoredState;
  error?: string;
}

export interface GetStatsResponse {
  success: boolean;
  stats?: Stats;
  error?: string;
}

export interface GenericResponse {
  success: boolean;
  error?: string;
}
