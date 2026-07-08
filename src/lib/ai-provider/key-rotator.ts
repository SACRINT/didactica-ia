/**
 * Key rotation utility.
 * Selects the best available API key for a given provider,
 * handles 429 errors by rotating to the next available key,
 * and records usage/errors in the database.
 */

import { createDecipheriv } from 'crypto';
import { neon } from '@neondatabase/serverless';
import type { ApiKeyRecord } from './types';

// ── Decryption ───────────────────────────────────────────────────────────────

function decryptKey(encrypted: string): string {
  const encKey = process.env.ADMIN_ENCRYPTION_KEY;
  if (!encKey || encKey.length !== 32) {
    throw new Error('ADMIN_ENCRYPTION_KEY is missing or not 32 characters');
  }
  const [ivHex, data] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = createDecipheriv('aes-256-cbc', Buffer.from(encKey), iv);
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ── DB helpers ───────────────────────────────────────────────────────────────

function getDb() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  return neon(process.env.DATABASE_URL);
}

async function getActiveKeys(provider: string): Promise<ApiKeyRecord[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, label, provider, model_default, key_encrypted, key_preview,
           is_active, priority, usage_count, error_count, last_used_at, last_error_at
    FROM api_keys
    WHERE provider = ${provider} AND is_active = true
    ORDER BY priority ASC, usage_count ASC
  `;
  return rows as ApiKeyRecord[];
}

async function recordUsage(keyId: string) {
  const sql = getDb();
  await sql`
    UPDATE api_keys
    SET usage_count = usage_count + 1, last_used_at = NOW()
    WHERE id = ${keyId}
  `;
}

async function recordError(keyId: string, errorMsg: string) {
  const sql = getDb();
  await sql`
    UPDATE api_keys
    SET error_count = error_count + 1, last_error_at = NOW()
    WHERE id = ${keyId}
  `;
}

// ── Fallback: read from env var directly ────────────────────────────────────
// Used when DB has no keys yet (e.g. before first admin setup).

function getFallbackKey(provider: string): string | null {
  if (provider === 'gemini') return process.env.GEMINI_API_KEY || null;
  if (provider === 'claude') return process.env.ANTHROPIC_API_KEY || null;
  if (provider === 'openai') return process.env.OPENAI_API_KEY || null;
  if (provider === 'nvidia') return process.env.NVIDIA_API_KEY || null;
  return null;
}

// ── Main export ──────────────────────────────────────────────────────────────

export interface ResolvedKey {
  apiKey: string;
  keyId: string | null;  // null for env-var fallback
  modelOverride: string | null;
}

/**
 * Resolves the best available API key for a given provider.
 * Tries keys in priority order, returns the first available.
 * Falls back to environment variables if no DB keys are configured.
 */
export async function resolveKey(provider: string): Promise<ResolvedKey> {
  try {
    const keys = await getActiveKeys(provider);
    if (keys.length > 0) {
      // Return the highest-priority available key
      const key = keys[0];
      return {
        apiKey: decryptKey(key.key_encrypted),
        keyId: key.id,
        modelOverride: key.model_default || null,
      };
    }
  } catch (err) {
    console.warn('[key-rotator] DB lookup failed, using env fallback:', err);
  }

  // Fallback to environment variable
  const fallback = getFallbackKey(provider);
  if (fallback) {
    return { apiKey: fallback, keyId: null, modelOverride: null };
  }

  throw new Error(
    `No API key available for provider "${provider}". ` +
    `Add one from the Admin Panel or set the environment variable.`
  );
}

/**
 * Wraps an AI API call with automatic key rotation on 429 errors.
 * Tries each active key in priority order until one succeeds.
 */
export async function withKeyRotation<T>(
  provider: string,
  fn: (apiKey: string, keyId: string | null) => Promise<T>
): Promise<T> {
  let keys: ApiKeyRecord[] = [];

  try {
    keys = await getActiveKeys(provider);
  } catch {
    // DB unavailable — try env fallback directly
  }

  // Build attempt list: DB keys first, then env var fallback
  const attempts: Array<{ apiKey: string; keyId: string | null }> = [];

  for (const k of keys) {
    try {
      attempts.push({ apiKey: decryptKey(k.key_encrypted), keyId: k.id });
    } catch { /* skip unreadable keys */ }
  }

  const fallback = getFallbackKey(provider);
  if (fallback && attempts.length === 0) {
    attempts.push({ apiKey: fallback, keyId: null });
  }

  if (attempts.length === 0) {
    throw new Error(
      `No API key configured for provider "${provider}". ` +
      `Add one from the Admin Panel.`
    );
  }

  let lastError: Error | null = null;

  for (const { apiKey, keyId } of attempts) {
    try {
      const result = await fn(apiKey, keyId);
      if (keyId) await recordUsage(keyId).catch(() => {});
      return result;
    } catch (err: any) {
      lastError = err;
      const is429 = err?.status === 429
        || err?.statusCode === 429
        || (err?.message && (err.message.includes('429') || err.message.toLowerCase().includes('quota')));

      if (keyId) await recordError(keyId, err?.message || 'unknown').catch(() => {});

      if (is429 && attempts.indexOf({ apiKey, keyId } as any) < attempts.length - 1) {
        console.warn(`[key-rotator] Key ${keyId ?? 'env'} hit quota limit, rotating to next key...`);
        continue;
      }

      // Not a 429 or no more keys — throw immediately
      throw err;
    }
  }

  throw lastError || new Error('All API keys exhausted');
}
