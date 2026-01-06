# Post-MVP Enhancements

Ideas for future versions after the core filtering MVP is complete.

---

## Filtering Scope Expansion

### 1. Sidebar Recommendations (Watch Page)
- Filter the "Up next" sidebar when watching a video
- Same classification logic, different DOM selectors
- `ytd-compact-video-renderer` for sidebar videos

### 2. Search Results Filtering
- Apply filter to YouTube search results
- `ytd-video-renderer` for search result items
- Option to disable for search (user might want unfiltered results)

### 3. Shorts Shelf Control
- Option to hide Shorts shelf entirely
- Or filter Shorts with same prompt logic
- `ytd-reel-shelf-renderer` for Shorts section

### 4. Subscriptions Feed
- Apply filtering to subscriptions page
- Different use case: user explicitly subscribed but may not want all content
- Potential prompt: "only tutorials from my subscriptions"

---

## Multiple Prompts & Presets

### 5. Multiple Saved Prompts
- Save multiple filter configurations
- Quick-switch between them via modal
- Examples: "Work mode", "Relax mode", "Learning mode"

### 6. Prompt Presets / Templates
- Pre-built prompts for common use cases:
  - "Focus: No shorts, no drama, no politics"
  - "Learning: Educational content only"
  - "Relaxation: Music, ambient, ASMR only"

### 7. Context-Aware Auto-Switch
- Automatically switch prompts based on:
  - Time of day
  - Day of week
  - URL patterns
  - Calendar integration (stretch goal)

---

## Channel-Level Features

### 8. Channel Whitelist
- Always show videos from specific channels regardless of filter
- "My trusted channels" list
- Override classification for favorite creators

### 9. Channel Blacklist
- Always hide videos from specific channels
- "Never show me this channel"
- Persistent across prompts

### 10. Channel Classification Cache
- Cache channel classifications (not just video)
- Channels are consistent in content type
- Dramatically reduces LLM calls over time
- See: `alternative-filtering-methods.md` for details

---

## UI Enhancements

### 11. Filter Stats Dashboard
- Videos hidden today/this week/all time
- Most blocked categories
- API usage tracking
- Cost estimation display

### 12. Video Classification Feedback
- "Why was this hidden?" tooltip
- Manual override: "Show this video anyway"
- "Never hide videos like this" learning

### 13. Notification Badge
- Show hidden count on "My Feed" chip
- `[My Feed (12)]` style indicator
- Or small badge number

### 14. Keyboard Shortcuts
- `Ctrl+Shift+F` to toggle filter
- `Ctrl+Shift+M` to open settings modal
- Customizable shortcuts

---

## Performance & Efficiency

### 15. Hybrid Classification (Quick + LLM)
- Fast regex pre-filter for obvious cases
- LLM only for uncertain videos
- Reduces API calls by 50-70%
- See: `alternative-filtering-methods.md` for details

### 16. Progressive Learning
- Log LLM decisions over time
- Train local classifier on decisions
- Reduce LLM dependency after initial learning
- See: `alternative-filtering-methods.md` for details

### 17. Local Model Option
- WebGPU-powered local LLM (Phi-3, Gemma)
- Zero API cost, full privacy
- Trade latency for free classification
- See: `alternative-filtering-methods.md` for details

### 18. Smarter Caching
- Cache by video ID + prompt hash
- Cache channel classifications separately
- Predictive pre-caching for likely videos
- Cache sharing across similar prompts

---

## Privacy & Control

### 19. Privacy Mode
- Local-only classification (no API calls)
- Uses simpler keyword matching
- Less accurate but fully private

### 20. Export/Import Settings
- Export prompt, whitelist, settings as JSON
- Import to new browser/device
- Share configurations with others

### 21. Incognito Mode Support
- Option to run in incognito
- Separate settings/cache per mode
- Privacy considerations

---

## Advanced Features

### 22. Visual Content Analysis
- Use vision model to analyze thumbnails
- Classify based on visual content, not just text
- Detect clickbait thumbnails (shocked faces, arrows)
- Higher accuracy for ambiguous titles

### 23. Transcript Analysis
- Fetch video transcripts (where available)
- Deeper content understanding
- "Hide videos that discuss X topic"
- More accurate than title-only classification

### 24. Engagement Signals
- Factor in like/dislike ratio
- Consider comment sentiment
- Hide controversial content option

### 25. Collaborative Filtering
- "Users with similar prompts also hid..."
- Community-powered filtering
- Opt-in data sharing

### 26. Browser Sync
- Sync settings across Chrome browsers
- Chrome account integration
- Cross-device consistency

---

## Integrations

### 27. YouTube Premium Integration
- Detect Premium status
- Adjust features accordingly
- No need to hide ads (Premium removes them)

### 28. Mobile Companion
- Browser extension for mobile YouTube (Kiwi Browser, Firefox Android)
- Same filtering on mobile
- Sync with desktop settings

### 29. API for Developers
- Expose classification API
- Let other extensions/tools use our filtering
- Plugin ecosystem

---

## Monetization Ideas (If Open Source)

### 30. Premium Tier
- Free: Basic filtering, 100 classifications/day
- Premium: Unlimited, multiple prompts, sync
- Team: Shared presets, admin controls

### 31. Hosted API Option
- We host the classification API
- Users don't need own API key
- Simpler onboarding
- Sustainable funding model

---

## Priority Ranking (Post-MVP)

**High Priority (v1.1):**
1. Channel whitelist/blacklist
2. Multiple saved prompts
3. Shorts shelf control
4. Filter stats display

**Medium Priority (v1.2):**
5. Sidebar recommendations filtering
6. Hybrid classification
7. Channel classification cache
8. Keyboard shortcuts

**Lower Priority (v2.0+):**
9. Local model option
10. Visual content analysis
11. Transcript analysis
12. Collaborative filtering
