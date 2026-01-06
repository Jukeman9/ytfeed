# Cloudflare Worker Setup Guide

> **Note:** This guide is for **v1.5+** (hosted Chrome Web Store version).
>
> For MVP (v1.0), the extension uses a local config file with the user's own API key. No Cloudflare Worker needed.
> See `implementation-plan-MVP.md` for the local setup approach.

---

This guide walks you through setting up the Cloudflare Worker that securely handles API requests for YouTube Focus Feed.

---

## Why Cloudflare Workers?

- **Free tier:** 100,000 requests/day (more than enough)
- **API key security:** Your OpenAI key is stored as an environment secret, never exposed
- **Built-in analytics:** Free usage tracking (requests, errors, unique users)
- **No server management:** Serverless, auto-scaling
- **Global edge network:** Fast response times worldwide
- **Easy updates:** Change config without updating the extension

---

## Prerequisites

- Node.js installed (v16+)
- OpenAI API key
- 10 minutes of time

---

## Step 1: Create Cloudflare Account

1. Go to https://dash.cloudflare.com/sign-up
2. Sign up with email (free)
3. Verify your email
4. You'll land on the Cloudflare dashboard

No credit card required for Workers free tier.

---

## Step 2: Install Wrangler CLI

Wrangler is Cloudflare's CLI tool for managing Workers.

```bash
npm install -g wrangler
```

Verify installation:
```bash
wrangler --version
```

Should show something like: `wrangler 3.x.x`

---

## Step 3: Login to Cloudflare

```bash
wrangler login
```

This will:
1. Open your browser
2. Ask you to authorize Wrangler
3. Show "Successfully logged in" in terminal

---

## Step 4: Create the Worker

### Directory Structure

In your project, create the `worker/` directory:

```
ytfeed/
└── worker/
    ├── wrangler.toml
    └── src/
        └── index.ts
```

### wrangler.toml

```toml
name = "ytfeed-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[observability]
enabled = true
```

### src/index.ts

```typescript
interface Env {
  OPENAI_API_KEY: string;
}

interface RemoteConfig {
  enabled: boolean;
  messages: {
    maintenance: string;
    announcement: string;
  };
  activeMessage: string | null;
}

// Edit this config to control the extension remotely
// MVP: Keep it simple - just enabled flag and messages
const CONFIG: RemoteConfig = {
  enabled: true,
  messages: {
    maintenance: "Service temporarily unavailable. Please try again later.",
    announcement: ""
  },
  activeMessage: null  // Set to message key to show, e.g., "announcement"
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Config endpoint - returns current configuration
    if (url.pathname === '/config') {
      return new Response(JSON.stringify(CONFIG), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Classify endpoint - proxies to OpenAI
    if (url.pathname === '/classify' && request.method === 'POST') {
      try {
        // Check if service is enabled
        if (!CONFIG.enabled) {
          return new Response(JSON.stringify({
            error: 'Service disabled',
            message: CONFIG.messages.maintenance
          }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const body = await request.json();

        // Forward to OpenAI
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });

        const data = await openaiResponse.json();

        // Check for OpenAI errors
        if (!openaiResponse.ok) {
          console.error('OpenAI error:', data);
          return new Response(JSON.stringify({
            error: 'Classification failed',
            details: data
          }), {
            status: openaiResponse.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error) {
        console.error('Worker error:', error);
        return new Response(JSON.stringify({
          error: 'Internal error',
          message: 'Classification service temporarily unavailable'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // 404 for unknown routes
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};
```

---

## Step 5: Add OpenAI API Key as Secret

This is the most important step - your API key will be securely stored as an encrypted environment variable.

```bash
cd worker
wrangler secret put OPENAI_API_KEY
```

When prompted, paste your OpenAI API key and press Enter.

You should see:
```
✨ Success! Uploaded secret OPENAI_API_KEY
```

**Important:** The key is now stored securely. It's:
- NOT in your code
- NOT in any config files
- NOT visible in Cloudflare dashboard
- Only accessible by your Worker at runtime

---

## Step 6: Deploy the Worker

```bash
wrangler deploy
```

You should see output like:
```
Uploaded ytfeed-api (1.23 sec)
Published ytfeed-api (0.45 sec)
  https://ytfeed-api.YOUR_SUBDOMAIN.workers.dev
```

**Save this URL** - you'll need it for the extension.

---

## Step 7: Test the Worker

### Test Config Endpoint

Open in browser:
```
https://ytfeed-api.YOUR_SUBDOMAIN.workers.dev/config
```

Should return the JSON config.

### Test Health Check

```
https://ytfeed-api.YOUR_SUBDOMAIN.workers.dev/health
```

Should return `{"status":"ok"}`.

### Test Classification (with curl)

```bash
curl -X POST https://ytfeed-api.YOUR_SUBDOMAIN.workers.dev/classify \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "system", "content": "Respond with JSON only."},
      {"role": "user", "content": "Say hello"}
    ]
  }'
```

Should return an OpenAI response.

---

## Step 8: Update Extension with Worker URL

In your extension code, update `src/config/constants.ts`:

```typescript
export const WORKER_URL = 'https://ytfeed-api.YOUR_SUBDOMAIN.workers.dev';
```

Rebuild the extension:
```bash
npm run build
```

---

## Managing Your Worker

### View Analytics

1. Go to https://dash.cloudflare.com
2. Click "Workers & Pages"
3. Click "ytfeed-api"
4. Click "Analytics"

You'll see:
- Requests over time
- Success/error rates
- Unique visitors
- Geographic distribution

### Update Configuration

To change the config (rate limits, messages, etc.):

1. Edit `CONFIG` in `worker/src/index.ts`
2. Run `wrangler deploy`
3. Changes are live immediately - no extension update needed!

### Rotate API Key

If you need to change your OpenAI API key:

```bash
cd worker
wrangler secret put OPENAI_API_KEY
# Paste new key
wrangler deploy
```

Done - no extension update needed!

### View Logs (Real-time)

```bash
wrangler tail
```

Shows live logs from your Worker. Press Ctrl+C to stop.

### Check Secrets

```bash
wrangler secret list
```

Shows which secrets are configured (not their values).

---

## Configuration Options Explained (MVP - Simple)

```typescript
const CONFIG = {
  // Master switch - set false to disable hosted service
  enabled: true,

  // Messages that can be shown to users
  messages: {
    maintenance: "...",    // Shown when service disabled
    announcement: "..."    // General announcement
  },

  // Which message to show (null = none)
  activeMessage: null
};
```

### Example: Show Announcement

```typescript
const CONFIG = {
  enabled: true,
  messages: {
    maintenance: "Service temporarily unavailable.",
    announcement: "Thanks for using YouTube Focus Feed! Star us on GitHub!"
  },
  activeMessage: "announcement"
};
```

### Example: Disable Service (Emergency)

```typescript
const CONFIG = {
  enabled: false,
  messages: {
    maintenance: "Service temporarily unavailable. Please try again later.",
    announcement: ""
  },
  activeMessage: "maintenance"
};
```

### Example: Sunset Hosted Service

```typescript
const CONFIG = {
  enabled: false,
  messages: {
    maintenance: "The hosted service has been discontinued. Check GitHub for the self-hosted version. Thank you for your support!",
    announcement: ""
  },
  activeMessage: "maintenance"
};
```

> **Note:** Rate limiting, user IDs, and blacklisting will be added in v1.5. For MVP, just use `enabled: false` if issues arise.

---

## Costs

### Cloudflare Workers

**Free tier includes:**
- 100,000 requests/day
- 10ms CPU time per request
- Unlimited deployments

This is more than enough for a Chrome extension.

### OpenAI

Costs depend on usage. With GPT-5-nano (default):
- ~$0.05/1M input tokens
- ~$0.20/1M output tokens

For reference:
- 1 classification batch (~25 videos) ≈ 500 tokens ≈ $0.000025
- 1000 batches ≈ $0.025

Monitor usage at https://platform.openai.com/usage

---

## Troubleshooting

### "Error: Not logged in"

```bash
wrangler login
```

### "Secret not found"

Make sure you're in the `worker/` directory:
```bash
cd worker
wrangler secret put OPENAI_API_KEY
```

### "Worker not responding"

Check logs:
```bash
wrangler tail
```

### "OpenAI errors"

1. Verify your API key is correct
2. Check you have credits in your OpenAI account
3. Check OpenAI status: https://status.openai.com

### "CORS errors"

The Worker code includes CORS headers. If issues persist:
1. Check browser console for specific error
2. Ensure you're using the correct Worker URL
3. Check the request is going to your Worker (not directly to OpenAI)

---

## Security Best Practices

1. **Never commit secrets** - API keys should only be in Cloudflare secrets
2. **Use wrangler secret** - Not environment variables in wrangler.toml
3. **Monitor usage** - Check Cloudflare analytics regularly
4. **Set up OpenAI alerts** - Enable usage alerts in OpenAI dashboard
5. **Rotate keys if compromised** - Easy to do without updating extension

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `wrangler login` | Authenticate with Cloudflare |
| `wrangler secret put NAME` | Add/update a secret |
| `wrangler secret list` | List secrets |
| `wrangler deploy` | Deploy Worker |
| `wrangler tail` | View live logs |
| `wrangler dev` | Local development server |
