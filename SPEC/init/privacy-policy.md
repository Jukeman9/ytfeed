# Privacy Policy for YouTube Focus Feed

**Last updated:** [DATE]

## Overview

YouTube Focus Feed is a browser extension that filters your YouTube home page based on your preferences using AI classification. This privacy policy explains what data we collect, how we use it, and your rights.

---

## How the Extension Works (MVP - Local Config)

The MVP version of this extension requires you to provide your own OpenAI API key in a local configuration file. The extension calls OpenAI's API directly from your browser - **no data passes through any server of ours**.

This means:
- **You have full control** over your API usage and costs
- **No middleman** - direct communication between your browser and OpenAI
- **We have no access** to your API key, requests, or video data

---

## What Data We Process

### Video Metadata (Sent for Classification)

When you use the extension with filtering enabled, the following data is sent **directly from your browser to OpenAI's API**:

- **Video titles** - The titles of videos shown on your YouTube home page
- **Channel names** - The names of channels that uploaded those videos

This data is sent **only** for the purpose of classifying whether each video matches your filter preferences.

### What We Do NOT Collect

- Your YouTube account information
- Your watch history
- Your personal information (name, email, etc.)
- Your browsing history outside of YouTube
- Any data when the filter is disabled
- **Your API key** (stored locally, never transmitted to us)

---

## Data Storage

### Local Storage (Your Browser)

The following data is stored locally in your browser using Chrome's storage API:

- **Your filter preferences** - The text you enter describing what you want to see
- **Classification cache** - Temporary cache of video classifications to reduce API calls (expires after 24 hours)
- **Schedule settings** - If you set time-based filtering (e.g., "weekdays 9-5")

This data **never leaves your browser** except when classification requests are made directly to OpenAI.

### Our Servers

**We do not operate any servers for the MVP version.**

- We do **not** receive video titles or channel names
- We do **not** log any requests
- We do **not** track users or generate user IDs
- All API calls go directly from your browser to OpenAI

---

## Third-Party Services

### OpenAI

Video metadata (titles and channel names) is sent directly to OpenAI's API for classification using **your own API key**. OpenAI's privacy policy applies to this data: https://openai.com/privacy

OpenAI states that API data is not used for training models.

### Future Hosted Version (v1.5+)

A future version may offer a hosted service through Cloudflare Workers where you don't need to provide your own API key. That version will have its own privacy policy update. The MVP version described here uses local config only.

---

## Your Rights and Choices

### Disable the Extension

When the extension is disabled or the filter is turned off:
- No data is sent anywhere
- No classification occurs
- YouTube functions normally

### Clear Your Data

You can clear all extension data at any time:
1. Right-click the extension icon
2. Click "Remove from Chrome"
3. All local data is deleted

Or clear just the cache:
1. Open extension settings
2. Click "Clear Cache"

---

## Data Retention

- **Classification cache:** Automatically expires after 24 hours
- **Your preferences:** Stored until you change or delete them
- **Server-side:** N/A - we do not operate any servers for the MVP version

---

## Children's Privacy

This extension is not intended for children under 13. We do not knowingly collect data from children.

---

## Changes to This Policy

We may update this privacy policy from time to time. We will notify users of significant changes through:
- Extension update notes
- GitHub repository

---

## Open Source

This extension is open source. You can review the code at:
https://github.com/[YOUR_USERNAME]/youtube-focus-feed

---

## Contact

If you have questions about this privacy policy:

- **GitHub Issues:** https://github.com/[YOUR_USERNAME]/youtube-focus-feed/issues
- **Email:** [YOUR_EMAIL]

---

## Summary (MVP - Local Config)

| Data | Collected by us? | Stored? | Shared with? |
|------|-----------------|---------|--------------|
| Video titles | **No** | No | OpenAI (direct from your browser) |
| Channel names | **No** | No | OpenAI (direct from your browser) |
| Your preferences | No | Yes (locally in your browser) | No one |
| Your API key | **No** | Yes (locally in config file) | No one |
| User IDs/tracking | No | No | No one |
| Personal info | No | No | No one |
| Browsing history | No | No | No one |
| YouTube account | No | No | No one |

**Key difference from hosted services:** Since you provide your own API key and the extension calls OpenAI directly, we never see or collect any of your data.
