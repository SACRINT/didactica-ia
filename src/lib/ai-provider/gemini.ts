/**
 * Google Gemini AI Provider implementation.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProvider } from './types';

export class GeminiProvider implements AIProvider {
  providerId = 'gemini';
  modelId: string;
  private apiKey: string;

  constructor(apiKey: string, modelId = 'gemini-2.5-flash') {
    this.apiKey = apiKey;
    this.modelId = modelId;
  }

  async generate(systemPrompt: string, userPrompt: string): Promise<string> {
    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({
      model: this.modelId,
      generationConfig: { responseMimeType: 'application/json' },
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
