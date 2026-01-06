type ToggleCallback = () => void;
type SettingsCallback = () => void;

let iconWrapper: HTMLElement | null = null;
let iconContainer: HTMLElement | null = null;
let toggleCallback: ToggleCallback | null = null;
let settingsCallback: SettingsCallback | null = null;
let hasError = false;
let isActive = false;

// Filter ON icon SVG (filled funnel - filter is active)
const FILTER_ON_SVG = `
<svg class="ytfeed-icon-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path fill="currentColor" d="M11 20q-.425 0-.712-.288T10 19v-6L4.2 5.6q-.375-.5-.112-1.05T5 4h14q.65 0 .913.55T19.8 5.6L14 13v6q0 .425-.288.713T13 20z"/>
</svg>
`;

// Filter OFF icon SVG (crossed out funnel - filter is disabled)
const FILTER_OFF_SVG = `
<svg class="ytfeed-icon-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path fill="currentColor" d="M14.8 11.975L6.825 4H19q.625 0 .9.55t-.1 1.05zM19.775 22.6L14 16.825V19q0 .425-.288.713T13 20h-2q-.425 0-.712-.288T10 19v-6.175l-8.6-8.6L2.8 2.8l18.4 18.4z"/>
</svg>
`;

// Lucide Settings icon SVG
const SETTINGS_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
  <circle cx="12" cy="12" r="3"/>
</svg>
`;

/**
 * Create the icon wrapper with icon and settings dropdown
 */
function createIconElement(): HTMLElement {
  // Create wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'ytfeed-icon-wrapper';

  // Create icon container (the clickable filter button)
  const container = document.createElement('div');
  container.className = 'ytfeed-icon-container';
  container.setAttribute('role', 'button');
  container.setAttribute('tabindex', '0');
  container.setAttribute('title', 'Toggle YouTube Focus Feed filter');
  // Set initial icon based on state (default to off)
  container.innerHTML = isActive ? FILTER_ON_SVG : FILTER_OFF_SVG;

  container.addEventListener('click', handleIconClick);
  container.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleIconClick();
    }
  });

  // Create settings dropdown
  const dropdown = document.createElement('div');
  dropdown.className = 'ytfeed-settings-dropdown';

  // Create settings button
  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'ytfeed-settings-btn';
  settingsBtn.innerHTML = `${SETTINGS_ICON_SVG}<span>Settings</span>`;
  settingsBtn.addEventListener('click', handleSettingsClick);

  dropdown.appendChild(settingsBtn);

  // Assemble
  wrapper.appendChild(container);
  wrapper.appendChild(dropdown);

  // Store reference to container for state updates
  iconContainer = container;

  return wrapper;
}

/**
 * Handle icon click - toggles filter
 */
function handleIconClick(): void {
  if (toggleCallback) {
    toggleCallback();
  }
}

/**
 * Handle settings button click - opens settings modal
 */
function handleSettingsClick(e: Event): void {
  e.stopPropagation(); // Prevent triggering icon click
  if (settingsCallback) {
    settingsCallback();
  }
}

/**
 * Find the search area and insert our icon
 */
function findAndInsertIcon(): boolean {
  // Check if our icon already exists
  if (document.querySelector('.ytfeed-icon-wrapper')) return true;

  // Look for the center section in masthead which contains the search box
  const masthead = document.querySelector('ytd-masthead');
  const center = masthead?.querySelector('#center');
  const searchBox = center?.querySelector('yt-searchbox') || center?.querySelector('ytd-searchbox');

  if (!center || !searchBox) return false;

  // Verify searchBox is a direct child of center before inserting
  if (searchBox.parentElement !== center) {
    console.log('[YTFeed] SearchBox is not a direct child of center, cannot insert icon');
    return false;
  }

  // Create our icon wrapper
  iconWrapper = createIconElement();

  // Insert before the search box in the center section
  center.insertBefore(iconWrapper, searchBox);

  // Update visual state
  updateIconState();

  return true;
}

/**
 * Update icon visual state
 */
function updateIconState(): void {
  if (!iconContainer) return;

  iconContainer.classList.toggle('ytfeed-error', hasError);

  // Update title based on state
  iconContainer.setAttribute(
    'title',
    isActive ? 'Disable YouTube Focus Feed filter' : 'Enable YouTube Focus Feed filter'
  );

  // Swap the icon SVG based on active state
  const svg = iconContainer.querySelector('.ytfeed-icon-svg');
  if (svg) {
    iconContainer.innerHTML = isActive ? FILTER_ON_SVG : FILTER_OFF_SVG;
  }

  // Add or remove error badge
  let errorBadge = iconContainer.querySelector('.ytfeed-error-badge');

  if (hasError && !errorBadge) {
    errorBadge = document.createElement('span');
    errorBadge.className = 'ytfeed-error-badge';
    iconContainer.appendChild(errorBadge);
  } else if (!hasError && errorBadge) {
    errorBadge.remove();
  }
}

/**
 * Inject the icon into YouTube's header
 */
export function injectIcon(onToggle: ToggleCallback, onSettingsClick: SettingsCallback): void {
  toggleCallback = onToggle;
  settingsCallback = onSettingsClick;

  // Try to find and insert icon
  if (findAndInsertIcon()) {
    return;
  }

  // If search container not found, observe for it
  const observer = new MutationObserver(() => {
    if (findAndInsertIcon()) {
      observer.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Timeout after 10 seconds
  setTimeout(() => {
    observer.disconnect();
  }, 10000);
}

/**
 * Set the active state of the icon
 */
export function setIconActive(active: boolean): void {
  isActive = active;
  updateIconState();
}

/**
 * Set the error state of the icon
 */
export function setIconError(error: boolean): void {
  hasError = error;
  updateIconState();
}

/**
 * Remove the icon
 */
export function removeIcon(): void {
  if (iconWrapper) {
    iconWrapper.remove();
    iconWrapper = null;
    iconContainer = null;
  }
}
