/**
 * gemini.ts — Backward-compatible wrapper around the AI Provider layer.
 *
 * This file preserves the original API so existing callers don't break.
 * Internally it delegates to getAIProvider() which reads the active
 * provider + API key from the database (with fallback to env vars).
 *
 * All new code should import from '@/lib/ai-provider' directly.
 */

import { SYSTEM_PROMPT } from './prompts/system-prompt';
import { getAIProvider, generateStreamWithRotation } from './ai-provider';
import type { GeneratedPlanningContent } from '@/types/planning';

// ── Planning (non-streaming) ──────────────────────────────────────────────────

export async function generatePlanning(
  userPrompt: string
): Promise<GeneratedPlanningContent> {
  const ai = await getAIProvider();
  const text = await ai.generate(SYSTEM_PROMPT, userPrompt);

  let parsed: GeneratedPlanningContent;
  try {
    const clean = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
    parsed = JSON.parse(clean);
  } catch {
    throw new Error('La IA retornó una respuesta JSON inválida. Por favor intenta de nuevo.');
  }

  if (!parsed.sectionI || !parsed.sectionII || !parsed.sectionIV) {
    throw new Error('La respuesta de la IA está incompleta. Por favor intenta de nuevo.');
  }

  return parsed;
}

// ── Planning (streaming) ──────────────────────────────────────────────────────

export async function* generatePlanningStream(
  userPrompt: string
): AsyncGenerator<string> {
  yield* generateStreamWithRotation(SYSTEM_PROMPT, userPrompt);
}

// ── Extra resources (rubric, material, lesson plan) ──────────────────────────

export async function generateExtraText(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const ai = await getAIProvider();
  return ai.generate(systemPrompt, userPrompt);
}
