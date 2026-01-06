# YouTube Focus Feed - MVP Implementation Plan

## Overview

Chrome extension that filters YouTube home feed using natural language prompts. Users describe what they want to see (e.g., "only lofi and coding tutorials, no politics"), and an LLM classifies each video, hiding non-matching content seamlessly.

**Key UX Principle:** The extension integrates natively into YouTube's UI - users interact with it as if YouTube added this feature.

**MVP Target:** Developer/power users who can fork the repo, add their API key, and build the extension.

---

## Architecture: Local Config (MVP)

MVP uses a **local config file** for the API key.

```
┌─────────────────────────────────────────────────────────────────┐
│  Extension (User's Browser)                                      │
│  └── API key from local config file (secrets.local.ts)          │
│                         ↓                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  OpenAI API (direct call)                                   ││
│  │  └── GPT-5-nano for classification                          ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**Setup Flow:**
1. Fork the repository
2. Copy `src/config/secrets.example.ts` → `secrets.local.ts`
3. Add your OpenAI API key
4. Run `npm install && npm run build`
5. Load extension in Chrome (developer mode)

**Benefits:**
- Zero hosting costs
- Full user control
- Simple architecture
- No server maintenance

**Future (v1.5):** Cloudflare Worker for hosted Chrome Web Store version.

---

## Local Config Files

### secrets.example.ts (committed to repo)
```typescript
// Copy this file to secrets.local.ts and add your API key
export const SECRETS = {
  OPENAI_API_KEY: 'sk-your-key-here'
};
```

### secrets.local.ts (gitignored - user creates this)
```typescript
export const SECRETS = {
  OPENAI_API_KEY: 'sk-actual-key-here'
};
```

### defaults.ts (model config)
```typescript
export const MODEL_CONFIG = {
  model: 'gpt-5-nano',  // Change this to switch models
  maxTokens: 500,
  temperature: 0.1
};
```

---

## Native UI Integration

### 1. Search Bar Icon
- Custom icon to the **left of the search bar** (matching microphone icon style)
- Clicking opens settings modal (prompt editor, schedule)
- Icon shows active/inactive state with subtle color change

```
┌─────────────────────────────────────────────────────────────┐
│  [≡]  YouTube    [⚙]  [    Search...    ] [🔍] [🎤]  [+]   │
│                   ↑                                          │
│            Our icon (native style)                           │
└─────────────────────────────────────────────────────────────┘
```

### 2. "My Feed" Category Chip
- Inject **"My Feed" chip** into the category bar (after "All")
- Styled exactly like native YouTube chips
- When extension enabled: auto-select "My Feed" chip
- Clicking other chips (All, Music, Gaming): **deactivates filter**
- Clicking "My Feed": **reactivates filter**

```
┌─────────────────────────────────────────────────────────────┐
│  [All] [My Feed] [Music] [Gaming] [Playlists] [Live] [→]    │
│         ↑                                                    │
│    Our chip (selected = filter active)                       │
└─────────────────────────────────────────────────────────────┘
```

### Behavior Flow
```
User clicks "My Feed" chip
  → Filter activates
  → "My Feed" chip gets selected styling
  → Videos get classified and filtered
  → User sees their curated feed

User clicks "Music" chip (or any other)
  → Filter deactivates
  → "Music" chip gets selected styling
  → "My Feed" chip loses selection
  → Normal YouTube behavior resumes
```

---

## Core Classification Flow

```
1. User configures prompt via popup/modal: "only lofi and gaming"
   ↓
2. YouTube home page loads
   ↓
3. Extension injects "My Feed" chip + search bar icon
   ↓
4. If filter enabled: auto-select "My Feed" chip
   ↓
5. Content script applies skeleton overlay to video cards
   ↓
6. Extract metadata from all visible videos (~25-30)
   ↓
7. Send ONE batch request to OpenAI (direct API call)
   ↓
8. LLM responds with classifications (~500-800ms)
   ↓
9. Apply results: SHOW videos fade in, HIDE videos removed
   ↓
10. On scroll: batch classify new videos
    On chip change: activate/deactivate filter
```

---

## Implementation Phases

### Phase 1: Project Setup
1. Initialize npm project with TypeScript
2. Configure Vite for Chrome extension bundling
3. Create manifest.json (Manifest V3)
4. Set up directory structure
5. Configure build scripts
6. Create secrets.example.ts template

**Files:**
- `manifest.json`
- `package.json`, `tsconfig.json`, `vite.config.ts`
- `src/popup/index.html`, `popup.ts`, `popup.css`
- `src/config/secrets.example.ts`

**Manifest permissions:**
```json
{
  "manifest_version": 3,
  "name": "YouTube Focus Feed",
  "permissions": ["storage"],
  "host_permissions": ["https://www.youtube.com/*", "https://api.openai.com/*"],
  "background": { "service_worker": "background.js" },
  "content_scripts": [{
    "matches": ["https://www.youtube.com/*"],
    "js": ["content.js"],
    "css": ["styles.css"],
    "run_at": "document_idle"
  }]
}
```

---

### Phase 2: Content Script - Video Detection & Loading State
1. MutationObserver for video cards (`ytd-rich-item-renderer`)
2. Extract metadata: title, channel, video ID
3. YouTube-native skeleton overlay with shimmer animation
4. Handle SPA navigation (`yt-navigate-finish`)

**Key selectors (verified via browser testing):**
```javascript
// Video cards
'ytd-rich-item-renderer'

// Video title (new YouTube structure)
'.yt-lockup-metadata-view-model__title'

// Video link - extract ID from href
'a[href*="watch?v="]'     // Regular: /watch?v=VIDEO_ID
'a[href*="/shorts/"]'     // Shorts: /shorts/VIDEO_ID

// Channel name
'a[href*="/@"]'

// Chip/category bar
'ytd-feed-filter-chip-bar-renderer #chips'

// Grid container (for MutationObserver)
'ytd-rich-grid-renderer #contents'
```

**Skeleton CSS (YouTube-native):**
```css
@keyframes ytfeed-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.ytfeed-skeleton {
  background: linear-gradient(90deg, #282828 0%, #383838 50%, #282828 100%);
  background-size: 200% 100%;
  animation: ytfeed-shimmer 1.2s ease-in-out infinite;
}
```

**Files:**
- `src/content/index.ts`
- `src/content/observer.ts`
- `src/content/extractor.ts`
- `src/content/skeleton.ts`
- `src/styles/skeleton.css`

---

### Phase 3: Background Worker + Classification
1. Receive video batches from content script
2. Load API key from local config
3. Call OpenAI API directly
4. Return classifications to content script
5. Cache results by video ID

**LLM System Prompt:**
```
You are a YouTube video classifier. Based on the user's stated preferences,
classify each video as SHOW (matches what they want) or HIDE (doesn't match).

Understand semantic meaning, not just keywords:
- "no politics" includes news commentary, economic debates, social issues
- "only lofi" includes chill beats, study music, ambient, jazzhop
- "work related" depends on their field - infer from context

Be decisive. When uncertain, lean toward SHOW (less annoying than hiding wanted content).
```

**User Prompt Template:**
```
My preference: "${userPrompt}"

Classify these videos (respond with JSON only):
${videos.map((v, i) => `${i + 1}. "${v.title}" by ${v.channel}`).join('\n')}

Format: {"1": "SHOW", "2": "HIDE", ...}
```

**Files:**
- `src/background/index.ts`
- `src/background/classifier.ts`
- `src/background/cache.ts`
- `src/config/api.ts` (direct OpenAI call)
- `src/config/defaults.ts` (model selection, prompts)
- `src/config/secrets.local.ts` (gitignored)

---

### Phase 4: DOM Filtering
1. Apply classifications (SHOW/HIDE)
2. Smooth transitions (fade-in for approved, instant hide for rejected)
3. Grid auto-fills on hide (`display: none`)
4. Empty state handling ("No videos match your filter")

**Files:**
- `src/content/filter.ts`

---

### Phase 5: Schedule Parsing
1. Extract schedule from user prompt via LLM
2. Store in chrome.storage.local
3. Background checks time periodically
4. Enable/disable based on schedule

**Schedule Extraction Prompt:**
```
Extract time schedule from: "${userPrompt}"

Return JSON only:
- If schedule found: {"enabled":true,"days":["mon","tue",...],
  "startTime":"HH:MM","endTime":"HH:MM"}
- If no schedule: {"enabled":false}

Examples:
- "weekdays 9-5" → {"enabled":true,"days":["mon","tue","wed","thu","fri"],
  "startTime":"09:00","endTime":"17:00"}
- "only lofi" → {"enabled":false}
```

**Files:**
- `src/background/scheduler.ts`

---

### Phase 6: Popup UI (YouTube-native theme)
1. Prompt textarea
2. Save/toggle controls
3. Status display ("12 videos hidden")

**YouTube Theme Colors:**
- Background: #0f0f0f
- Card/Modal: #181818
- Input/Inactive: #272727
- Hover: #3f3f3f
- Text primary: #f1f1f1
- Text secondary: #aaaaaa
- Selected chip: #f1f1f1 (white bg, dark text)
- Unselected chip: #272727 (dark bg, light text)

**Files:**
- `src/popup/index.html`
- `src/popup/popup.ts`
- `src/popup/popup.css`

---

### Phase 7: "My Feed" Chip + Settings Modal
1. Inject chip into YouTube category bar
2. Toggle filtering on/off via chip click
3. Settings modal (icon near search bar)
4. Handle chip selection/deselection state

**Files:**
- `src/content/ui/chip.ts`
- `src/content/ui/modal.ts`
- `src/content/ui/icon.ts`

---

### Phase 8: Testing & Polish
1. Test with local API key
2. Test schedule parsing variations
3. Test infinite scroll (batched classification)
4. Handle edge cases (API errors, empty state, SPA navigation)
5. Verify API key is not exposed in built extension

---

### Phase 9: Open Source + Launch
1. Clean up code, add comments
2. Create README.md with setup instructions
3. Add MIT LICENSE
4. Ensure secrets.local.ts is in .gitignore
5. Push to GitHub

---

## File Structure

```
ytfeed/
├── manifest.json
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .gitignore
├── README.md
├── LICENSE
├── src/
│   ├── background/
│   │   ├── index.ts             # Service worker entry
│   │   ├── classifier.ts        # OpenAI API batch classification
│   │   ├── scheduler.ts         # Time-based enable/disable
│   │   ├── cache.ts             # Video classification cache
│   │   └── storage.ts           # Chrome storage helpers
│   ├── content/
│   │   ├── index.ts             # Content script entry
│   │   ├── observer.ts          # MutationObserver for video cards
│   │   ├── extractor.ts         # Video metadata extraction
│   │   ├── skeleton.ts          # Loading overlay
│   │   ├── filter.ts            # DOM show/hide with transitions
│   │   └── ui/
│   │       ├── chip.ts          # "My Feed" category chip
│   │       ├── modal.ts         # Settings modal
│   │       └── icon.ts          # Search bar icon
│   ├── popup/
│   │   ├── index.html
│   │   ├── popup.ts
│   │   └── popup.css
│   ├── styles/
│   │   └── skeleton.css         # YouTube-native loading styles
│   ├── config/
│   │   ├── defaults.ts          # Model selection, prompts, batch settings
│   │   ├── api.ts               # Direct OpenAI API call
│   │   ├── secrets.example.ts   # Template (committed)
│   │   └── secrets.local.ts     # Actual key (gitignored)
│   ├── types/
│   │   └── index.ts             # Shared type definitions
│   └── utils/
│       └── messaging.ts         # Chrome messaging helpers
├── assets/
│   └── icons/
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
├── SPEC/
│   ├── init/
│   │   ├── implementation-plan-MVP.md
│   │   ├── launch-checklist.md
│   │   ├── privacy-policy.md
│   │   └── cloudflare-worker-guide.md  # For v1.5+
│   └── ideas/
└── dist/                         # Build output
```

---

## .gitignore

```gitignore
# Secrets - IMPORTANT!
src/config/secrets.local.ts
.env
*.pem

# Private files
LAUNCH_CHECKLIST.md
SPEC/init/priv-roadmap.md

# Build
dist/
node_modules/
*.zip

# IDE
.idea/
.vscode/
*.swp
```

---

## Model Selection

| Model        | Input $/1M | Output $/1M | Accuracy | Recommendation |
|--------------|------------|-------------|----------|----------------|
| GPT-5-nano   | $0.05      | $0.20       | ~85%     | **Default** - Newest, cheapest, best |
| GPT-4o-mini  | $0.15      | $0.60       | ~82%     | Fallback option  |

**Default:** GPT-5-nano - newest model, cheapest pricing, more accurate for classification.

### Config-Driven Model Selection

Easy to change the model via `src/config/defaults.ts`:

```typescript
// src/config/defaults.ts
export const MODEL_CONFIG = {
  model: 'gpt-5-nano',  // Change this to switch models
  maxTokens: 500,
  temperature: 0.1
};
```

---

## Cost Estimate (User's Own Key)

With GPT-5-nano at ~$0.05/1M input tokens:
- Per batch (~25 videos, ~500 tokens): ~$0.000025
- Heavy daily use (500 videos/day) = 20 batches = ~$0.0005/day
- Monthly (heavy use): ~$0.015

**Very cheap for personal use!**

---

## Infinite Scroll Behavior (Verified)

| Metric               | Value                                   |
|----------------------|-----------------------------------------|
| Initial load         | ~39 video cards                         |
| Batch size on scroll | 24-31 videos per batch                  |
| Trigger point        | ~72% scroll ratio                       |
| DOM insertion        | All videos added simultaneously         |

**MutationObserver Strategy:**
```javascript
const gridContents = document.querySelector('ytd-rich-grid-renderer #contents');
const observer = new MutationObserver((mutations) => {
    const newVideoCards = [];
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.nodeName === 'YTD-RICH-ITEM-RENDERER') {
                newVideoCards.push(node);
            }
        });
    });
    if (newVideoCards.length > 0) {
        handleNewVideos(newVideoCards); // Debounced, 300ms
    }
});
observer.observe(gridContents, { childList: true, subtree: true });
```

---

## Success Criteria

### Native UI Integration
- [ ] Search bar icon injected (matches YouTube style)
- [ ] "My Feed" chip injected in category bar
- [ ] Settings modal opens on icon click
- [ ] Chip selection/deselection works correctly
- [ ] Light/dark mode support

### Core Filtering
- [ ] Videos batch-classified on page load
- [ ] Non-matching videos hidden seamlessly
- [ ] YouTube-native loading animation (skeleton)
- [ ] Smooth fade-in transitions
- [ ] Grid layout stays intact after hiding
- [ ] Infinite scroll handled

### Local Config
- [ ] API key loads from secrets.local.ts
- [ ] secrets.local.ts is gitignored
- [ ] Extension works with user's own API key
- [ ] Clear error if API key missing/invalid

### Schedule & Persistence
- [ ] Prompt saved and persisted
- [ ] Schedule parsing from natural language
- [ ] Schedule auto-enables/disables filter
- [ ] Classification cache working

### Publishing
- [ ] Open sourced on GitHub
- [ ] Clear setup instructions in README
- [ ] secrets.example.ts template included

---
