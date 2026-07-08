
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SYSTEM_PROMPT } from './prompts/system-prompt';
import type { GeneratedPlanningContent } from '@/types/planning';

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Generates a complete didactic planning using Google Gemini 2.5 Pro.
 * 
 * @param userPrompt - The dynamic prompt with teacher context and UAC data
 * @returns Parsed GeneratedPlanningContent object
 */
export async function generatePlanning(
  userPrompt: string
): Promise<GeneratedPlanningContent> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const response = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          { text: `System Instructions:\n${SYSTEM_PROMPT}\n\nUser Input:\n${userPrompt}` }
        ]
      }
    ]
  });

  const text = response.response.text();
  if (!text) {
    throw new Error('Unexpected empty response from Gemini API');
  }

  // Parse and validate the JSON response
  let parsed: GeneratedPlanningContent;
  try {
    const cleanJson = text
      .replace(/^```(?:json)?\n?/m, '')
      .replace(/\n?```$/m, '')
      .trim();
    parsed = JSON.parse(cleanJson);
  } catch (err) {
    console.error('Failed to parse Gemini response:', text.substring(0, 500));
    throw new Error('La IA de Google retornó una respuesta JSON inválida. Por favor intenta de nuevo.');
  }

  // Basic validation
  if (!parsed.sectionI || !parsed.sectionII || !parsed.sectionIV) {
    throw new Error('La respuesta de la IA de Google está incompleta. Por favor intenta de nuevo.');
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
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
  });

  const result = await model.generateContentStream({
    contents: [
      {
        role: 'user',
        parts: [
          { text: `System Instructions:\n${SYSTEM_PROMPT}\n\nUser Input:\n${userPrompt}` }
        ]
      }
    ]
  });

  for await (const chunk of result.stream) {
    const textChunk = chunk.text();
    if (textChunk) {
      yield textChunk;
    }
  }
}

/**
 * Generates an extra resource (rubric, material, lesson plan) text using Gemini 2.5 Flash (faster & cheaper).
 */
export async function generateExtraText(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
  });

  const response = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          { text: `System Instructions:\n${systemPrompt}\n\nUser Input:\n${userPrompt}` }
        ]
      }
    ]
  });

  const text = response.response.text();
  if (!text) {
    throw new Error('No response from Gemini API for extra resource');
  }

  return text;
}
