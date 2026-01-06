import type { Stats } from '../../types';

type ModalSaveCallback = (prompt: string, enabled: boolean, hideShorts: boolean) => void;

let modalOverlay: HTMLElement | null = null;
let promptTextarea: HTMLTextAreaElement | null = null;
let toggleElement: HTMLElement | null = null;
let hideShortsToggle: HTMLElement | null = null;
let statsElement: HTMLElement | null = null;
let currentEnabled = true;
let currentHideShorts = false;
let saveCallback: ModalSaveCallback | null = null;

/**
 * Create the modal HTML
 */
function createModalElement(): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'ytfeed-modal-overlay';
  overlay.innerHTML = `
    <div class="ytfeed-modal">
      <div class="ytfeed-modal-header">
        <h2 class="ytfeed-modal-title">YouTube Focus Feed</h2>
        <button class="ytfeed-modal-close" aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      <div class="ytfeed-modal-body">
        <div>
          <label class="ytfeed-label" for="ytfeed-prompt">What do you want to see?</label>
          <textarea
            id="ytfeed-prompt"
            class="ytfeed-textarea"
            placeholder="Examples:
• only lofi music and coding tutorials
• no politics or news
• gaming videos, especially Minecraft
• work stuff only, weekdays 9-5"
          ></textarea>
          <p class="ytfeed-hint">Tip: Include time schedules like "weekdays 9-5" to auto-enable during work hours</p>
        </div>

        <div class="ytfeed-toggle-container">
          <span class="ytfeed-label">Filter enabled</span>
          <div class="ytfeed-toggle ytfeed-toggle-on" role="switch" aria-checked="true" tabindex="0" id="ytfeed-filter-toggle"></div>
        </div>

        <div class="ytfeed-toggle-container">
          <span class="ytfeed-label">Hide Shorts</span>
          <div class="ytfeed-toggle" role="switch" aria-checked="false" tabindex="0" id="ytfeed-shorts-toggle"></div>
        </div>

        <div class="ytfeed-stats">
          <span id="ytfeed-stats-text">0 videos filtered this session</span>
        </div>

        <div class="ytfeed-button-row">
          <button class="ytfeed-button ytfeed-button-secondary" id="ytfeed-cancel">Cancel</button>
          <button class="ytfeed-button ytfeed-button-primary" id="ytfeed-save">Save</button>
        </div>
      </div>
    </div>
  `;

  return overlay;
}

/**
 * Setup modal event listeners
 */
function setupModalEvents(): void {
  if (!modalOverlay) return;

  // Close button
  const closeBtn = modalOverlay.querySelector('.ytfeed-modal-close');
  closeBtn?.addEventListener('click', hideModal);

  // Cancel button
  const cancelBtn = modalOverlay.querySelector('#ytfeed-cancel');
  cancelBtn?.addEventListener('click', hideModal);

  // Save button
  const saveBtn = modalOverlay.querySelector('#ytfeed-save');
  saveBtn?.addEventListener('click', handleSave);

  // Filter enabled toggle
  toggleElement = modalOverlay.querySelector('#ytfeed-filter-toggle');
  toggleElement?.addEventListener('click', handleToggle);
  toggleElement?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  });

  // Hide Shorts toggle
  hideShortsToggle = modalOverlay.querySelector('#ytfeed-shorts-toggle');
  hideShortsToggle?.addEventListener('click', handleHideShortsToggle);
  hideShortsToggle?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleHideShortsToggle();
    }
  });

  // Textarea
  promptTextarea = modalOverlay.querySelector('#ytfeed-prompt');

  // Stats element
  statsElement = modalOverlay.querySelector('#ytfeed-stats-text');

  // Close on overlay click
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      hideModal();
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay?.classList.contains('ytfeed-visible')) {
      hideModal();
    }
  });
}

/**
 * Handle filter toggle click
 */
function handleToggle(): void {
  currentEnabled = !currentEnabled;
  updateToggleState();
}

/**
 * Handle hide shorts toggle click
 */
function handleHideShortsToggle(): void {
  currentHideShorts = !currentHideShorts;
  updateHideShortsToggleState();
}

/**
 * Update filter toggle visual state
 */
function updateToggleState(): void {
  if (!toggleElement) return;

  toggleElement.classList.toggle('ytfeed-toggle-on', currentEnabled);
  toggleElement.setAttribute('aria-checked', String(currentEnabled));
}

/**
 * Update hide shorts toggle visual state
 */
function updateHideShortsToggleState(): void {
  if (!hideShortsToggle) return;

  hideShortsToggle.classList.toggle('ytfeed-toggle-on', currentHideShorts);
  hideShortsToggle.setAttribute('aria-checked', String(currentHideShorts));
}

/**
 * Handle save button click
 */
function handleSave(): void {
  if (!promptTextarea || !saveCallback) return;

  const prompt = promptTextarea.value.trim();
  saveCallback(prompt, currentEnabled, currentHideShorts);
  hideModal();
}

/**
 * Initialize the modal (called once)
 */
export function initModal(callback: ModalSaveCallback): void {
  saveCallback = callback;

  // Create modal if not exists
  if (!modalOverlay) {
    modalOverlay = createModalElement();
    document.body.appendChild(modalOverlay);
    setupModalEvents();
  }
}

/**
 * Show the modal
 */
export function showModal(currentPrompt: string = '', enabled: boolean = true, hideShorts: boolean = false): void {
  if (!modalOverlay) return;

  // Set current values
  if (promptTextarea) {
    promptTextarea.value = currentPrompt;
  }

  currentEnabled = enabled;
  currentHideShorts = hideShorts;
  updateToggleState();
  updateHideShortsToggleState();

  // Show modal with animation
  modalOverlay.style.display = 'flex';
  // Trigger reflow for animation
  void modalOverlay.offsetWidth;
  modalOverlay.classList.add('ytfeed-visible');

  // Focus textarea
  setTimeout(() => {
    promptTextarea?.focus();
  }, 100);
}

/**
 * Hide the modal
 */
export function hideModal(): void {
  if (!modalOverlay) return;

  modalOverlay.classList.remove('ytfeed-visible');

  // Wait for animation before hiding
  setTimeout(() => {
    if (modalOverlay) {
      modalOverlay.style.display = 'none';
    }
  }, 200);
}

/**
 * Update stats display
 */
export function updateStats(stats: Stats): void {
  if (!statsElement) return;

  const hiddenCount = stats.hiddenThisSession;
  const totalCount = stats.totalClassified;

  if (totalCount === 0) {
    statsElement.textContent = 'No videos filtered yet';
  } else if (hiddenCount === 0) {
    statsElement.textContent = `${totalCount} videos analyzed, none filtered`;
  } else {
    statsElement.textContent = `${hiddenCount} of ${totalCount} videos filtered this session`;
  }
}

/**
 * Check if modal is visible
 */
export function isModalVisible(): boolean {
  return modalOverlay?.classList.contains('ytfeed-visible') ?? false;
}

/**
 * Destroy the modal
 */
export function destroyModal(): void {
  if (modalOverlay) {
    modalOverlay.remove();
    modalOverlay = null;
    promptTextarea = null;
    toggleElement = null;
    hideShortsToggle = null;
    statsElement = null;
  }
}
