/**
 * AI Provider Factory — main entry point.
 *
 * Usage in any API route:
 *   import { getAIProvider } from '@/lib/ai-provider';
 *   const ai = await getAIProvider();
 *   const result = await ai.generate(systemPrompt, userPrompt);
 *
 * The factory reads the active provider + model from platform_config in DB,
 * then uses key-rotator to get the best available API key.
 */

import { neon } from '@neondatabase/serverless';
import { withKeyRotation } from './key-rotator';
import { GeminiProvider } from './gemini';
import { ClaudeProvider } from './claude';
import { OpenAICompatibleProvider } from './openai';
import type { AIProvider } from './types';

export type { AIProvider };

// ── Read active provider config from DB ──────────────────────────────────────

interface ActiveConfig {
  provider: string;
  model: string;
}

async function getActiveConfig(): Promise<ActiveConfig> {
  try {
    if (!process.env.DATABASE_URL) throw new Error('no db');
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      SELECT key, value FROM platform_config
      WHERE key IN ('active_provider', 'active_model')
    `;
    const map: Record<string, string> = {};
    for (const row of rows) map[row.key] = row.value;
    return {
      provider: map['active_provider'] || 'gemini',
      model:    map['active_model']    || 'gemini-2.5-flash',
    };
  } catch {
    // Fallback if DB is unavailable
    return { provider: 'gemini', model: 'gemini-2.5-flash' };
  }
}

// ── Provider factory ─────────────────────────────────────────────────────────

function buildProvider(provider: string, model: string, apiKey: string): AIProvider {
  switch (provider) {
    case 'gemini':
      return new GeminiProvider(apiKey, model);
    case 'claude':
      return new ClaudeProvider(apiKey, model);
    case 'openai':
    case 'nvidia':
    case 'qwen':
    case 'mistral':
      return new OpenAICompatibleProvider(apiKey, provider, model);
    default:
      return new GeminiProvider(apiKey, model);
  }
}

/**
 * Returns an AIProvider instance configured with the active provider, model
 * and the best available API key (from DB with rotation, falling back to env vars).
 */
export async function getAIProvider(): Promise<AIProvider> {
  const { provider, model } = await getActiveConfig();

  // Resolve the API key with fallback to env var
  const { resolveKey } = await import('./key-rotator');
  const resolved = await resolveKey(provider);
  const finalModel = resolved.modelOverride || model;

  return buildProvider(provider, finalModel, resolved.apiKey);
}

/**
 * Generates text with automatic key rotation on quota errors.
 * Convenience wrapper around getAIProvider().
 */
export async function generateWithRotation(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const { provider, model } = await getActiveConfig();

  return withKeyRotation(provider, async (apiKey) => {
    const ai = buildProvider(provider, model, apiKey);
    return ai.generate(systemPrompt, userPrompt);
  });
}

/**
 * Generates a stream with automatic key rotation on quota errors.
 * Returns an AsyncGenerator<string>.
 */
export async function* generateStreamWithRotation(
  systemPrompt: string,
  userPrompt: string
): AsyncGenerator<string> {
  const { provider, model } = await getActiveConfig();
  const { resolveKey } = await import('./key-rotator');
  const resolved = await resolveKey(provider);
  const finalModel = resolved.modelOverride || model;
  const ai = buildProvider(provider, finalModel, resolved.apiKey);
  yield* ai.generateStream(systemPrompt, userPrompt);
}

// ── Activity logging helper ─────────────────────────────────────────────────

export async function logActivity(data: {
  teacherEmail: string;
  action: string;
  entityType?: string;
  entityId?: string;
  providerUsed?: string;
  modelUsed?: string;
  tokensApprox?: number;
  success?: boolean;
  errorMsg?: string;
}) {
  try {
    if (!process.env.DATABASE_URL) return;
    const sql = neon(process.env.DATABASE_URL);
    await sql`
      INSERT INTO activity_log
        (teacher_email, action, entity_type, entity_id, provider_used, model_used, tokens_approx, success, error_msg)
      VALUES
        (${data.teacherEmail}, ${data.action}, ${data.entityType || null},
         ${data.entityId || null}, ${data.providerUsed || null}, ${data.modelUsed || null},
         ${data.tokensApprox || null}, ${data.success ?? true}, ${data.errorMsg || null})
    `;
  } catch { /* Don't fail the request if logging fails */ }
}
