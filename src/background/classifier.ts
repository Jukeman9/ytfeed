import { callOpenAI } from '../config/api';
import { SYSTEM_PROMPT, USER_PROMPT_TEMPLATE } from '../config/defaults';
import { getCachedBatch, setCachedBatch, setPromptHash } from './cache';
import { updateStats } from './stats';
import { debug } from '../utils/debug';
import type { Classification, ClassificationResult } from '../types';

interface VideoInput {
  id: string;
  title: string;
  channel: string;
}

/**
 * Classify a batch of videos using the LLM
 */
export async function classifyVideos(
  videos: VideoInput[],
  userPrompt: string
): Promise<ClassificationResult> {
  debug.info('classifier', `classifyVideos called with ${videos.length} videos`);

  if (videos.length === 0) {
    debug.info('classifier', 'No videos to classify');
    return {};
  }
  if (!userPrompt.trim()) {
    debug.info('classifier', 'No prompt set - showing all videos');
    // No prompt = show all
    const result: ClassificationResult = {};
    videos.forEach((v) => {
      result[v.id] = 'SHOW';
    });
    return result;
  }

  debug.info('classifier', `User prompt: "${userPrompt.slice(0, 50)}..."`);

  // Update prompt hash for cache
  setPromptHash(userPrompt);

  // Check cache first
  const videoIds = videos.map((v) => v.id);
  const cached = getCachedBatch(videoIds);
  debug.info('classifier', `Cache check: ${cached.size} hits out of ${videos.length}`);

  // Filter out cached videos
  const uncachedVideos = videos.filter((v) => !cached.has(v.id));

  // If all cached, return immediately
  if (uncachedVideos.length === 0) {
    const result: ClassificationResult = {};
    cached.forEach((classification, id) => {
      result[id] = classification;
    });
    debug.info('classifier', `All ${videos.length} videos from cache`);
    return result;
  }

  debug.info('classifier', `Classifying ${uncachedVideos.length} videos (${cached.size} from cache)`);

  // Build the video list for the prompt
  const videoList = uncachedVideos
    .map((v, i) => `${i + 1}. "${v.title}" by ${v.channel}`)
    .join('\n');

  // Format user prompt
  const formattedPrompt = USER_PROMPT_TEMPLATE
    .replace('{userPrompt}', userPrompt)
    .replace('{videoList}', videoList);

  try {
    // Call OpenAI
    debug.api('Calling OpenAI API', { videoCount: uncachedVideos.length, promptLength: formattedPrompt.length });
    const response = await callOpenAI(SYSTEM_PROMPT, formattedPrompt);
    debug.api('OpenAI response received', { responseLength: response.length, preview: response.slice(0, 100) });

    // Parse response
    const classifications = parseClassificationResponse(response, uncachedVideos);
    debug.info('classifier', 'Parsed classifications', classifications);

    // Cache new classifications
    const newClassifications: Record<string, Classification> = {};
    uncachedVideos.forEach((v) => {
      newClassifications[v.id] = classifications[v.id] || 'SHOW';
    });
    setCachedBatch(newClassifications);

    // Merge with cached results
    const result: ClassificationResult = { ...classifications };
    cached.forEach((classification, id) => {
      result[id] = classification;
    });

    // Update stats
    const hiddenCount = Object.values(result).filter((c) => c === 'HIDE').length;
    const showCount = Object.values(result).filter((c) => c === 'SHOW').length;
    debug.info('classifier', `Final result: ${showCount} SHOW, ${hiddenCount} HIDE`);
    updateStats(hiddenCount, videos.length);

    return result;
  } catch (error) {
    debug.error('classifier', 'Classification error', error);
    throw error;
  }
}

/**
 * Parse the LLM response into classifications
 */
function parseClassificationResponse(
  response: string,
  videos: VideoInput[]
): ClassificationResult {
  const result: ClassificationResult = {};
  debug.info('classifier', 'Parsing response', { response: response.slice(0, 200) });

  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      debug.error('classifier', 'No JSON found in response', { response });
      // Default to SHOW for all
      videos.forEach((v) => {
        result[v.id] = 'SHOW';
      });
      return result;
    }

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, string>;
    debug.info('classifier', 'Parsed JSON', parsed);

    // Map numbered results back to video IDs
    videos.forEach((video, index) => {
      const key = String(index + 1);
      const classification = parsed[key]?.toUpperCase();

      if (classification === 'HIDE') {
        result[video.id] = 'HIDE';
      } else {
        result[video.id] = 'SHOW';
      }
    });
  } catch (error) {
    debug.error('classifier', 'Failed to parse classification response', error);
    // Default to SHOW for all on parse error
    videos.forEach((v) => {
      result[v.id] = 'SHOW';
    });
  }

  return result;
}
