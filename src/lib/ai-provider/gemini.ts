import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProvider } from './types';

/**
 * Normalizes Gemini model names to enforce strictly authorized models:
 * - gemini-3.5-flash-lite (default)
 * - gemini-3.1-flash-lite
 * Any legacy or prohibited models (e.g. gemini-2.5-flash, gemini-1.5-flash)
 * are mapped safely to gemini-3.5-flash-lite.
 */
export function sanitizeGeminiModel(model?: string | null): string {
  if (!model) return 'gemini-3.5-flash-lite';
  const clean = model.trim().toLowerCase();
  if (clean === 'gemini-3.1-flash-lite') return 'gemini-3.1-flash-lite';
  return 'gemini-3.5-flash-lite';
}

export class GeminiProvider implements AIProvider {
  providerId = 'gemini';
  modelId: string;
  private apiKey: string;

  constructor(apiKey: string, modelId = 'gemini-3.5-flash-lite') {
    this.apiKey = apiKey;
    this.modelId = sanitizeGeminiModel(modelId);
  }

  async generate(systemPrompt: string, userPrompt: string): Promise<string> {
    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({
      model: this.modelId,
    });

    const response = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: `System Instructions:\n${systemPrompt}\n\nUser Input:\n${userPrompt}` }],
      }],
    });

    const text = response.response.text();
    if (!text) throw new Error('Empty response from Gemini API');
    return text;
  }

  async *generateStream(systemPrompt: string, userPrompt: string): AsyncGenerator<string> {
    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({ model: this.modelId });

    const result = await model.generateContentStream({
      contents: [{
        role: 'user',
        parts: [{ text: `System Instructions:\n${systemPrompt}\n\nUser Input:\n${userPrompt}` }],
      }],
    });

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield text;
    }
  }
}

