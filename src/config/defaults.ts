// Debug mode - set to false for production
export const DEBUG_MODE = true;

// Model and API configuration
export const MODEL_CONFIG = {
  model: 'gpt-4o-mini', // gpt-4o-mini is the current cheap model (gpt-5-nano doesn't exist yet)
  maxTokens: 500,
  temperature: 0.1,
};

// System prompt for video classification
export const SYSTEM_PROMPT = `You are a YouTube video classifier. Based on the user's stated preferences, classify each video as SHOW (matches what they want) or HIDE (doesn't match).

Understand semantic meaning, not just keywords:
- "no politics" includes news commentary, economic debates, social issues
- "only lofi" includes chill beats, study music, ambient, jazzhop
- "work related" depends on their field - infer from context

Be decisive. When uncertain, lean toward SHOW (less annoying than hiding wanted content).`;

// User prompt template for classification
export const USER_PROMPT_TEMPLATE = `My preference: "{userPrompt}"

Classify these videos (respond with JSON only):
{videoList}

Format: {"1": "SHOW", "2": "HIDE", ...}`;

// Schedule extraction prompt
export const SCHEDULE_PROMPT = `Extract time schedule from: "{userPrompt}"

Return JSON only:
- If schedule found: {"enabled":true,"days":["mon","tue",...],"startTime":"HH:MM","endTime":"HH:MM"}
- If no schedule: {"enabled":false}

Examples:
- "weekdays 9-5" → {"enabled":true,"days":["mon","tue","wed","thu","fri"],"startTime":"09:00","endTime":"17:00"}
- "only lofi" → {"enabled":false}`;

// Batch settings
export const BATCH_CONFIG = {
  debounceMs: 300,
  maxBatchSize: 50,
};

// Storage keys
export const STORAGE_KEYS = {
  userPrompt: 'ytfeed_userPrompt',
  filterEnabled: 'ytfeed_filterEnabled',
  schedule: 'ytfeed_schedule',
  classificationCache: 'ytfeed_cache',
  stats: 'ytfeed_stats',
  hasSeenOnboarding: 'ytfeed_hasSeenOnboarding',
  hideShorts: 'ytfeed_hideShorts',
};
