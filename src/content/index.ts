import { isHomePage } from './extractor';
import { startObserver, stopObserver, listenForNavigation, resetProcessedFlags } from './observer';
import { applyClassifications, showAllVideos, removeEmptyState, hasVisibleVideos, showEmptyState } from './filter';
import { injectIcon, setIconActive, setIconError } from './ui/icon';
import { initModal, showModal, updateStats } from './ui/modal';
import { classifyVideos, getState, updateState, getStats, clearCache } from '../utils/messaging';
import { debug } from '../utils/debug';
import type { VideoMetadata, StoredState, Stats } from '../types';

// State
let currentState: StoredState = {
  userPrompt: '',
  filterEnabled: true,
  schedule: { enabled: false },
  hasSeenOnboarding: false,
  hideShorts: false,
};
let currentStats: Stats = {
  hiddenThisSession: 0,
  totalClassified: 0,
  lastUpdated: Date.now(),
};
let pendingVideos: VideoMetadata[] = [];
let isProcessing = false;

/**
 * Initialize the extension
 */
async function initialize(): Promise<void> {
  debug.info('init', 'Initializing...');

  // Load state from background
  try {
    debug.info('init', 'Loading state from background...');
    const response = await getState();
    if (response.success && response.state) {
      currentState = response.state;
      debug.state('State loaded', currentState);
    }
  } catch (error) {
    debug.error('init', 'Failed to load state (using defaults)', error);
  }

  // Load stats
  try {
    const response = await getStats();
    if (response.success && response.stats) {
      currentStats = response.stats;
      debug.info('init', 'Stats loaded', currentStats);
    }
  } catch (error) {
    debug.error('init', 'Failed to load stats (using defaults)', error);
  }

  // Initialize UI components
  debug.ui('Initializing UI components');
  initModal(handleModalSave);
  injectIcon(handleToggleClick, handleSettingsClick);

  // Set initial icon state
  setIconActive(currentState.filterEnabled);

  // Show onboarding modal if first time
  if (!currentState.hasSeenOnboarding && isHomePage()) {
    debug.ui('Showing onboarding modal (first time user)');
    setTimeout(() => {
      showModal(currentState.userPrompt, currentState.filterEnabled, currentState.hideShorts);
    }, 1000);
  }

  // Start observing if on home page and (filter enabled with prompt OR hideShorts enabled)
  const shouldStartObserver = isHomePage() && (
    (currentState.filterEnabled && currentState.userPrompt) || currentState.hideShorts
  );
  debug.info('init', 'Checking observer conditions', {
    isHomePage: isHomePage(),
    filterEnabled: currentState.filterEnabled,
    hasPrompt: !!currentState.userPrompt,
    hideShorts: currentState.hideShorts,
    shouldStartObserver,
  });
  if (shouldStartObserver) {
    debug.info('init', 'Starting video observer...');
    startVideoObserver();
  } else {
    debug.info('init', 'Observer not started - conditions not met');
  }

  // Listen for navigation
  listenForNavigation(handleNavigation);

  debug.info('init', 'Initialization complete');
}

/**
 * Start observing videos
 */
function startVideoObserver(): void {
  startObserver(handleNewVideos);
}

/**
 * Handle new videos detected by observer
 */
async function handleNewVideos(videos: VideoMetadata[]): Promise<void> {
  debug.info('filter', `Received ${videos.length} videos to process`);

  if (!currentState.filterEnabled || !currentState.userPrompt) {
    debug.info('filter', 'Filtering disabled or no prompt - showing videos (respecting hideShorts)');
    videos.forEach((v) => {
      v.element.classList.remove('ytfeed-skeleton');
      // Still respect hideShorts setting even when filter is disabled
      if (currentState.hideShorts && v.isShort) {
        v.element.classList.add('ytfeed-hide');
      } else {
        v.element.classList.add('ytfeed-show');
      }
    });
    return;
  }

  // Add to pending batch
  pendingVideos.push(...videos);
  debug.info('filter', `Added to batch. Pending: ${pendingVideos.length}`);

  // If already processing, wait
  if (isProcessing) {
    debug.info('filter', 'Already processing - will handle in next batch');
    return;
  }

  // Process the batch
  await processPendingVideos();
}

/**
 * Process pending videos
 */
async function processPendingVideos(): Promise<void> {
  if (isProcessing || pendingVideos.length === 0) return;

  isProcessing = true;
  const videosToProcess = [...pendingVideos];
  pendingVideos = [];

  debug.info('filter', `Processing batch of ${videosToProcess.length} videos`);

  try {
    // Prepare data for classification
    const videoData = videosToProcess.map((v) => ({
      id: v.id,
      title: v.title,
      channel: v.channel,
    }));

    debug.api('Sending videos for classification', { count: videoData.length });

    // Call background script for classification
    const response = await classifyVideos(videoData);

    if (response.success && response.classifications) {
      // Apply classifications (with hideShorts setting)
      const { hidden, shown } = applyClassifications(videosToProcess, response.classifications, currentState.hideShorts);

      debug.info('filter', `Classification complete: ${shown} shown, ${hidden} hidden`);

      // Update local stats
      currentStats.hiddenThisSession += hidden;
      currentStats.totalClassified += videosToProcess.length;
      currentStats.lastUpdated = Date.now();

      // Update modal stats if visible
      updateStats(currentStats);

      // Clear error state
      setIconError(false);

      // Check for empty state
      removeEmptyState();
      if (!hasVisibleVideos()) {
        showEmptyState();
      }
    } else {
      // On error, show all videos
      debug.error('filter', 'Classification failed', response.error);
      showAllVideos();
      setIconError(true);
    }
  } catch (error) {
    debug.error('filter', 'Error processing videos', error);
    showAllVideos();
    setIconError(true);
  }

  isProcessing = false;

  // Process any new pending videos
  if (pendingVideos.length > 0) {
    debug.info('filter', `More videos pending: ${pendingVideos.length}`);
    await processPendingVideos();
  }
}

/**
 * Handle modal save
 */
async function handleModalSave(prompt: string, enabled: boolean, hideShorts: boolean): Promise<void> {
  const promptChanged = prompt !== currentState.userPrompt;
  const hideShortsChanged = hideShorts !== currentState.hideShorts;

  currentState.userPrompt = prompt;
  currentState.filterEnabled = enabled;
  currentState.hasSeenOnboarding = true;
  currentState.hideShorts = hideShorts;

  // Update icon state
  setIconActive(enabled);

  // Save state
  try {
    await updateState({
      userPrompt: prompt,
      filterEnabled: enabled,
      hasSeenOnboarding: true,
      hideShorts: hideShorts,
    });

    // If prompt or hideShorts changed, clear cache and re-process
    if (promptChanged || hideShortsChanged) {
      await clearCache();
      resetProcessedFlags();
      removeEmptyState();

      // Reset stats for this session
      currentStats.hiddenThisSession = 0;
      currentStats.totalClassified = 0;
    }

    // Start or stop observer based on enabled state
    const shouldObserve = isHomePage() && ((enabled && prompt) || hideShorts);
    if (shouldObserve) {
      startVideoObserver();
    } else if (!enabled && !hideShorts) {
      stopObserver();
      showAllVideos();
      removeEmptyState();
    }
  } catch (error) {
    console.error('[YTFeed] Failed to save state:', error);
  }
}

/**
 * Handle toggle click - toggle filter on/off
 */
async function handleToggleClick(): Promise<void> {
  const newState = !currentState.filterEnabled;
  currentState.filterEnabled = newState;
  setIconActive(newState);

  // Save state
  try {
    await updateState({ filterEnabled: newState });
  } catch (error) {
    console.error('[YTFeed] Failed to save state:', error);
  }

  const shouldObserve = isHomePage() && ((newState && currentState.userPrompt) || currentState.hideShorts);
  if (shouldObserve) {
    resetProcessedFlags();
    startVideoObserver();
  } else if (!newState && !currentState.hideShorts) {
    stopObserver();
    showAllVideos();
    removeEmptyState();
  }
}

/**
 * Handle settings click - open modal
 */
function handleSettingsClick(): void {
  showModal(currentState.userPrompt, currentState.filterEnabled, currentState.hideShorts);
  updateStats(currentStats);
}

/**
 * Handle YouTube navigation
 */
function handleNavigation(): void {
  console.log('[YTFeed] Navigation detected');

  // Reset stats on navigation
  currentStats.hiddenThisSession = 0;
  currentStats.totalClassified = 0;

  removeEmptyState();

  const shouldObserve = isHomePage() && (
    (currentState.filterEnabled && currentState.userPrompt) || currentState.hideShorts
  );
  if (shouldObserve) {
    startVideoObserver();
  } else {
    stopObserver();
    showAllVideos();
  }
}

// Initialize when DOM is ready
console.log('[YTFeed] Content script loaded, readyState:', document.readyState);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initialize().catch((err) => console.error('[YTFeed] Init error:', err));
  });
} else {
  initialize().catch((err) => console.error('[YTFeed] Init error:', err));
}
