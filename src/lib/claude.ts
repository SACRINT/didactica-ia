import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from './prompts/system-prompt';
import type { GeneratedPlanningContent } from '@/types/planning';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY environment variable is not set');
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Generates a complete didactic planning using Claude Haiku 4.5.
 * Uses Prompt Caching for the system prompt to reduce costs ~60-70%.
 * 
 * @param userPrompt - The dynamic prompt with teacher context and UAC data
 * @returns Parsed GeneratedPlanningContent object
 */
export async function generatePlanning(
  userPrompt: string
): Promise<GeneratedPlanningContent> {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 8192,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        // Prompt Caching: cache the system prompt (saves ~60-70% per call)
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude API');
  }

  // Parse and validate the JSON response
  let parsed: GeneratedPlanningContent;
  try {
    // Remove any potential markdown code blocks
    const cleanJson = content.text
      .replace(/^```(?:json)?\n?/m, '')
      .replace(/\n?```$/m, '')
      .trim();
    parsed = JSON.parse(cleanJson);
  } catch (err) {
    console.error('Failed to parse Claude response:', content.text.substring(0, 500));
    throw new Error('La IA retornó una respuesta inválida. Por favor intenta de nuevo.');
  }

  // Basic validation
  if (!parsed.sectionI || !parsed.sectionII || !parsed.sectionIV) {
    throw new Error('La respuesta de la IA está incompleta. Por favor intenta de nuevo.');
  }

  return parsed;
}

/**
 * Streaming version for real-time feedback in the UI.
 * Returns an async generator that yields text chunks.
 */
export async function* generatePlanningStream(
  userPrompt: string
): AsyncGenerator<string> {
  const stream = anthropic.messages.stream({
    model: 'claude-haiku-4-5',
    max_tokens: 8192,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userPrompt }],
  });

  for await (const chunk of stream) {
    if (
      chunk.type === 'content_block_delta' &&
      chunk.delta.type === 'text_delta'
    ) {
      yield chunk.delta.text;
    }
  }
}

/**
 * Generates an extra resource (rubric, material, lesson plan) text using Claude Haiku 4.5.
 * Uses Prompt Caching to optimize costs.
 */
export async function generateExtraText(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 8192,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude API');
  }

  return content.text;
}

