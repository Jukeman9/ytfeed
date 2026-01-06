# YouTube Focus Feed

A Chrome extension that filters your YouTube home feed using natural language prompts. Describe what you want to see (e.g., "only lofi and coding tutorials, no politics"), and AI classifies each video, hiding non-matching content seamlessly.

## Features

- **Natural Language Filtering**: Describe your preferences in plain English
- **Seamless Integration**: Native YouTube UI - "My Feed" chip and settings icon
- **Smart Caching**: Results cached by video ID + prompt hash
- **Schedule Support**: Include time schedules like "weekdays 9-5"
- **Both Themes**: Works with YouTube's light and dark modes
- **Shorts Support**: Filters both regular videos and Shorts

## Installation (Developer Mode)

### Prerequisites
- Node.js 18+
- An OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ytfeed.git
   cd ytfeed
   ```

2. **Configure your API key**
   ```bash
   cp src/config/secrets.example.ts src/config/secrets.local.ts
   ```
   Then edit `src/config/secrets.local.ts` and add your OpenAI API key.

3. **Install dependencies and build**
   ```bash
   npm install
   npm run build
   ```

4. **Load in Chrome**
   - Go to `chrome://extensions`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `dist` folder

5. **Visit YouTube**
   - Go to [youtube.com](https://www.youtube.com)
   - Click the filter icon (⚙) next to the search bar
   - Enter your preferences and click Save

## Usage

### Writing Prompts

Be descriptive about what you want to see:

```
only lofi music and coding tutorials
```

```
no politics, no news commentary, no drama
```

```
gaming videos, especially Minecraft and indie games
```

### Schedule Support

Include time constraints directly in your prompt:

```
work stuff only, weekdays 9-5
```

```
entertainment only, evenings after 6pm
```

### How It Works

1. The extension injects a "My Feed" chip into YouTube's category bar
2. When enabled, it extracts video titles and channels from the page
3. Videos are batch-sent to GPT-4o-mini for classification
4. Matching videos appear normally; non-matching videos are hidden
5. Results are cached to minimize API calls

## Cost

Using GPT-4o-mini, costs are extremely low:
- ~$0.0005 per day with heavy use (500 videos)
- ~$0.015 per month

## Development

```bash
# Install dependencies
npm install

# Build extension
npm run build

# Clean build
npm run clean
```

## File Structure

```
ytfeed/
├── src/
│   ├── background/     # Service worker (classification, caching)
│   ├── content/        # Content script (DOM manipulation, UI)
│   ├── config/         # API config and secrets
│   ├── styles/         # CSS styles
│   ├── types/          # TypeScript definitions
│   └── utils/          # Shared utilities
├── assets/icons/       # Extension icons
├── dist/               # Built extension (load this in Chrome)
└── scripts/            # Build scripts
```

## Privacy

- Your API key stays on your machine
- Video metadata (titles, channels) is sent to OpenAI for classification
- No data is collected or stored externally
- Classification results are cached locally

## License

MIT
