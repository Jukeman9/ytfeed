import { SECRETS } from './secrets.local';
import { MODEL_CONFIG } from './defaults';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  error?: {
    message: string;
  };
}

export async function callOpenAI(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SECRETS.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL_CONFIG.model,
      messages,
      max_tokens: MODEL_CONFIG.maxTokens,
      temperature: MODEL_CONFIG.temperature,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `OpenAI API error: ${response.status} - ${(errorData as OpenAIResponse).error?.message || response.statusText}`
    );
  }

  const data: OpenAIResponse = await response.json();
  return data.choices[0]?.message?.content || '';
}
