# Alternative Filtering Methods

This document captures alternative approaches to video classification that could be explored in future iterations. These methods trade off accuracy, cost, latency, and complexity differently.

---

## Current Approach: Batch LLM Classification

**How it works:**
- Extract metadata from ~20-30 visible videos
- Send ONE batch request to GPT-4o-mini
- LLM classifies each video as SHOW or HIDE
- Apply results to DOM

**Pros:**
- High accuracy (~95%+) - LLM understands semantic meaning
- Simple implementation
- Handles any natural language prompt
- No training data needed

**Cons:**
- Latency: 500-800ms per batch
- Cost: ~$0.06/month for heavy use
- Requires API key
- Depends on external service

---

## Alternative 1: Compiled Code (Keyword Expansion)

**How it works:**
- User enters prompt once
- LLM generates JavaScript filter function with expanded keywords/patterns
- Filter runs locally on all future videos

**Example output:**
```javascript
function shouldShow(title, channel) {
  const t = title.toLowerCase();

  // Expanded from "lofi"
  if (/lo-?fi|chillhop|jazzhop|chill\s*beats|study\s*music/i.test(t)) return true;

  // Expanded from "no politics"
  if (/politic|election|congress|senate|biden|trump|democrat|republican/i.test(t)) return false;

  return false; // default for "only" filters
}
```

**Pros:**
- Zero ongoing API cost
- Instant classification (microseconds)
- Works offline
- Fully transparent/editable rules

**Cons:**
- Accuracy ~60-70% - keywords can't capture semantic meaning
- "Why I Quit Gaming" contains "gaming" but isn't gaming content
- Can't handle nuanced prompts ("nothing depressing")
- Requires manual tuning for edge cases

**Verdict:** Explored and rejected. Keywords fundamentally can't capture meaning.

---

## Alternative 2: Embedding Similarity

**How it works:**
- Convert user prompt to embedding vector (once)
- Convert each video title to embedding
- Compare using cosine similarity
- Show if similarity > threshold

**Example:**
```javascript
// User prompt: "relaxing ambient music"
const promptEmbedding = [0.12, -0.34, 0.56, ...]; // 1536 dimensions

// For each video
const titleEmbedding = embed(video.title);
const similarity = cosineSimilarity(promptEmbedding, titleEmbedding);
return similarity > 0.7; // threshold
```

**Pros:**
- No per-video API calls after initial embedding
- Captures semantic similarity
- Works with any prompt

**Cons:**
- Can't handle negation ("no politics" - how do you embed "not X"?)
- Threshold tuning is tricky
- Still needs embedding API for new videos
- Mixed content is ambiguous

**Potential improvement:** Dual embedding spaces
- Positive centroid for what user WANTS
- Negative centroid for what user DOESN'T want
- Check distance to both

**Verdict:** Interesting for simple positive preferences. Struggles with negation and nuance.

---

## Alternative 3: Synthetic Training Data + Micro-Classifier

**How it works:**
- LLM generates 200+ synthetic video titles with SHOW/HIDE labels
- Train tiny local classifier (TF-IDF + logistic regression)
- Classifier runs in browser

**Example generated training data:**
```
SHOW: "3 Hours Peaceful Rain Sounds for Deep Focus"
SHOW: "Lo-Fi Beats to Study/Relax To"
SHOW: "Cozy Coffee Shop Ambience with Jazz Music"
HIDE: "BREAKING: Election Results Are IN!"
HIDE: "Political Debate Gets HEATED"
HIDE: "Why This Controversy Changes Everything"
```

**Pros:**
- Zero ongoing API cost
- Fast local classification
- LLM's semantic understanding baked into training data
- Privacy-preserving

**Cons:**
- Initial LLM cost to generate training data
- Classifier may not generalize well
- Need to regenerate on prompt change
- Training in browser adds complexity

**Verdict:** Promising for future exploration. Requires more complex implementation.

---

## Alternative 4: Channel-Based Classification

**How it works:**
- Insight: Channels are consistent in content type
- First time seeing channel → LLM classifies the CHANNEL (not video)
- Cache classification forever
- Apply channel classification to all its videos

**Example:**
```javascript
const channelCache = {
  "Lofi Girl": "SHOW",
  "CNN": "HIDE",
  "ChilledCow": "SHOW",
  "Fox News": "HIDE"
};

function shouldShow(video) {
  if (channelCache[video.channel]) {
    return channelCache[video.channel] === "SHOW";
  }
  // New channel: classify via LLM, cache result
  return classifyChannel(video.channel);
}
```

**Pros:**
- Dramatically fewer LLM calls (channels repeat)
- High accuracy for consistent channels
- Cache grows over time, calls approach zero

**Cons:**
- Channels aren't always consistent (variety channels)
- New channels still need classification
- Misses video-specific context
- "Lofi Girl posts gaming collab" - wrong classification

**Verdict:** Great as supplementary signal. Use channel cache + video title for best results.

---

## Alternative 5: Local Small Model (WebGPU)

**How it works:**
- Run tiny LLM in browser (Phi-3-mini, Gemma-2B via WebLLM)
- Classify locally without any external API
- Full privacy, zero cost

**Example:**
```javascript
import { CreateMLCEngine } from "@anthropic/mlc-llm-web";

const engine = await CreateMLCEngine("Phi-3-mini-4k-instruct-q4f16_1");

async function classifyVideo(title, prompt) {
  const response = await engine.chat.completions.create({
    messages: [
      { role: "system", content: "Classify as SHOW or HIDE based on user preference." },
      { role: "user", content: `Preference: ${prompt}\nVideo: ${title}\nClassification:` }
    ],
    max_tokens: 10
  });
  return response.choices[0].message.content.includes("SHOW") ? "SHOW" : "HIDE";
}
```

**Pros:**
- Zero API cost
- Full privacy
- Works offline
- No API key needed

**Cons:**
- Initial model download ~500MB-2GB
- Slower inference (1-3 seconds per classification)
- Requires WebGPU support
- Less accurate than GPT-4o-mini
- High memory usage

**Verdict:** Interesting for privacy-conscious users. Trade latency/accuracy for zero cost.

---

## Alternative 6: Progressive Self-Learning

**How it works:**
- Phase 1: LLM classifies all videos, logs decisions
- Phase 2: Train local classifier on LLM's decisions
- Phase 3: Local classifier handles most cases
- Phase 4: LLM only for edge cases

**Example flow:**
```
Week 1: LLM classifies 500 videos → log all decisions
        Train local classifier on this data

Week 2: Local classifier handles 80% of videos (high confidence)
        LLM handles 20% (uncertain cases)
        Continue logging, retraining

Week 4: Local classifier handles 95%+
        LLM calls reduced to near-zero
```

**Pros:**
- LLM costs decrease over time
- Personalized to user's actual feed
- Gets smarter with use

**Cons:**
- Complex implementation
- Cold start problem (week 1 has full LLM costs)
- Need to detect confidence levels
- Retraining on prompt change

**Verdict:** Excellent for power users with consistent prompts. Too complex for MVP.

---

## Alternative 7: Hybrid Quick-Check + LLM

**How it works:**
- First pass: Fast regex check for obvious cases
- Second pass: LLM for uncertain videos only

**Example:**
```javascript
function quickCheck(title, prompt) {
  // Obvious HIDE patterns
  if (/BREAKING|election|politic/i.test(title)) return 'HIDE';

  // Obvious SHOW patterns
  if (/lo-?fi|ambient|study beats/i.test(title)) return 'SHOW';

  // Uncertain - needs LLM
  return 'UNCERTAIN';
}

async function classifyBatch(videos, prompt) {
  const results = {};
  const uncertain = [];

  for (const video of videos) {
    const quick = quickCheck(video.title, prompt);
    if (quick !== 'UNCERTAIN') {
      results[video.id] = quick;
    } else {
      uncertain.push(video);
    }
  }

  // Only send uncertain videos to LLM
  if (uncertain.length > 0) {
    const llmResults = await classifyWithLLM(uncertain, prompt);
    Object.assign(results, llmResults);
  }

  return results;
}
```

**Pros:**
- Reduces LLM calls by 50-70%
- Fast for obvious cases
- LLM handles nuance

**Cons:**
- Quick-check patterns need maintenance
- Prompt-specific - can't generalize
- Borderline between approaches

**Verdict:** Good optimization if LLM costs become a concern. Add after MVP if needed.

---

## Comparison Matrix

| Method | Accuracy | Cost | Latency | Complexity | Offline |
|--------|----------|------|---------|------------|---------|
| **Batch LLM** (current) | 95%+ | ~$0.06/mo | 500-800ms | Low | No |
| Compiled Keywords | 60-70% | Free | Instant | Medium | Yes |
| Embedding Similarity | 75-80% | ~$0.02/mo | 100ms | Medium | Partial |
| Synthetic + Classifier | 85%+ | One-time | 10ms | High | Yes |
| Channel Classification | 80-90% | Decreasing | Mixed | Medium | Partial |
| Local Small Model | 80-85% | Free | 1-3s | High | Yes |
| Progressive Learning | 90%+ | Decreasing | Mixed | Very High | Partial |
| Hybrid Quick+LLM | 95%+ | ~$0.03/mo | Mixed | Medium | No |

---

## Recommendation

**For MVP:** Stick with Batch LLM Classification
- Simplest implementation
- Highest accuracy
- Negligible cost ($0.06/month)
- 500-800ms latency is acceptable with loading animation

**For V2:** Consider adding:
1. Channel classification cache (reduces LLM calls)
2. Hybrid quick-check for obvious cases
3. Local classifier trained on user's decisions

**For Privacy-Focused Version:**
- Local small model via WebGPU
- Accept accuracy/latency tradeoff

---

## Ideas for Future Exploration

1. **Fine-tuned micro-model**: Train a tiny model specifically for YouTube video classification

2. **Browser AI APIs**: Chrome is adding built-in AI - could use for free local classification

3. **Community-shared filters**: Users share their prompt → compiled rules for common use cases

4. **Collaborative filtering**: "Users with similar prompts also hid these videos"

5. **Visual classification**: Use thumbnail analysis (via vision model) for better accuracy

6. **Transcript analysis**: Fetch video transcripts for deeper content understanding

7. **Engagement signals**: Factor in like/dislike ratio, comment sentiment
