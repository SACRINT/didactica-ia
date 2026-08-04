/**
 * AI Provider Factory — main entry point.
 *
 * Usage in any API route:
 *   import { getAIProvider } from '@/lib/ai-provider';
 *   const ai = await getAIProvider();
 *   const result = await ai.generate(systemPrompt, userPrompt);
 *
 * The factory reads the active provider + model from platform_config in DB.
 * Supports two tiers:
 *   - Standard (docentes): active_provider / active_model  → gemini-3.5-flash-lite by default
 *   - Premium  (admins / authorized users): admin_provider / admin_model → configurable
 */

import { neon } from '@neondatabase/serverless';
import { withKeyRotation } from './key-rotator';
import { GeminiProvider } from './gemini';
import { ClaudeProvider } from './claude';
import { OpenAICompatibleProvider } from './openai';
import type { AIProvider } from './types';

export type { AIProvider };

// ── Default model constants ──────────────────────────────────────────────────
export const DEFAULT_STANDARD_MODEL = 'gemini-3.5-flash-lite';
export const DEFAULT_STANDARD_PROVIDER = 'gemini';
export const DEFAULT_PREMIUM_MODEL = 'gemini-3.5-flash-lite';
export const DEFAULT_PREMIUM_PROVIDER = 'gemini';

// ── Read active provider config from DB ──────────────────────────────────────

interface ActiveConfig {
  provider: string;
  model: string;
}

/**
 * Returns provider + model config based on user tier.
 * @param isPremium - true for admins, supervisors, or users with is_premium=true
 */
async function getActiveConfig(isPremium = false): Promise<ActiveConfig> {
  try {
    if (!process.env.DATABASE_URL) throw new Error('no db');
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      SELECT key, value FROM platform_config
      WHERE key IN ('active_provider', 'active_model', 'admin_provider', 'admin_model')
    `;
    const map: Record<string, string> = {};
    for (const row of rows) map[row.key] = row.value;

    if (isPremium) {
      return {
        provider: map['admin_provider'] || DEFAULT_PREMIUM_PROVIDER,
        model:    map['admin_model']    || DEFAULT_PREMIUM_MODEL,
      };
    }
    return {
      provider: map['active_provider'] || DEFAULT_STANDARD_PROVIDER,
      model:    map['active_model']    || DEFAULT_STANDARD_MODEL,
    };
  } catch {
    // Fallback if DB is unavailable
    if (isPremium) return { provider: DEFAULT_PREMIUM_PROVIDER, model: DEFAULT_PREMIUM_MODEL };
    return { provider: DEFAULT_STANDARD_PROVIDER, model: DEFAULT_STANDARD_MODEL };
  }
}

/**
 * Checks whether a teacher has is_premium=true OR an elevated role.
 */
export async function resolveUserIsPremium(teacherId?: string): Promise<boolean> {
  if (!teacherId || !process.env.DATABASE_URL) return false;
  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      SELECT role, COALESCE(is_premium, false) AS is_premium
      FROM teachers
      WHERE id = ${teacherId}::uuid
      LIMIT 1
    `;
    if (!rows[0]) return false;
    const { role, is_premium } = rows[0];
    return is_premium === true || role === 'administrador' || role === 'supervisor';
  } catch {
    return false;
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
    case 'openrouter':
      return new OpenAICompatibleProvider(apiKey, provider, model);
    default:
      return new GeminiProvider(apiKey, model);
  }
}

/**
 * Returns an AIProvider instance configured with the active provider, model
 * and the best available API key (from DB with rotation, falling back to env vars).
 * @param isPremium - set true for admins or premium-authorized users
 */
export async function getAIProvider(isPremium = false): Promise<AIProvider> {
  const { provider, model } = await getActiveConfig(isPremium);

  // Resolve the API key with fallback to env var
  const { resolveKey } = await import('./key-rotator');
  const resolved = await resolveKey(provider);
  const finalModel = resolved.modelOverride || model;

  return buildProvider(provider, finalModel, resolved.apiKey);
}

/**
 * Generates text with automatic key rotation on quota errors.
 * If teacherId is provided, the teacher's own API key (if configured) is used first.
 * @param isPremium - set true for admins or premium-authorized users
 */
export async function generateWithRotation(
  systemPrompt: string,
  userPrompt: string,
  teacherId?: string,
  isPremium = false
): Promise<string> {
  const { provider, model } = await getActiveConfig(isPremium);

  return withKeyRotation(provider, async (apiKey) => {
    const ai = buildProvider(provider, model, apiKey);
    return ai.generate(systemPrompt, userPrompt);
  }, teacherId);
}

/**
 * Generates a stream with automatic key rotation on quota errors.
 * Returns an AsyncGenerator<string>.
 * @param isPremium - set true for admins or premium-authorized users
 */
export async function* generateStreamWithRotation(
  systemPrompt: string,
  userPrompt: string,
  teacherId?: string,
  isPremium = false
): AsyncGenerator<string> {
  const { provider, model } = await getActiveConfig(isPremium);
  const { resolveKey } = await import('./key-rotator');
  const resolved = await resolveKey(provider, teacherId);
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
