/**
 * Run admin panel database migration.
 * Usage: npx tsx --env-file=.env.local scripts/run-migration.ts
 *
 * This script:
 * 1. Creates all new admin tables (safe: uses IF NOT EXISTS)
 * 2. Inserts the admin email from ADMIN_EMAIL env var
 * 3. Migrates the existing GEMINI_API_KEY into the api_keys table (encrypted)
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createCipheriv, randomBytes } from 'crypto';

// env vars are loaded via --env-file=.env.local flag (npx tsx --env-file)

const DATABASE_URL = process.env.DATABASE_URL;
const ADMIN_EMAIL  = process.env.ADMIN_EMAIL;
const ADMIN_NAME   = process.env.ADMIN_NAME || 'Administrador';
const ENCRYPTION_KEY = process.env.ADMIN_ENCRYPTION_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!DATABASE_URL) throw new Error('Missing DATABASE_URL in .env.local');
if (!ADMIN_EMAIL)  throw new Error('Missing ADMIN_EMAIL in .env.local');
if (!ENCRYPTION_KEY) throw new Error('Missing ADMIN_ENCRYPTION_KEY in .env.local (must be exactly 32 characters)');
if (ENCRYPTION_KEY.length !== 32) throw new Error('ADMIN_ENCRYPTION_KEY must be exactly 32 characters long');

// ── Encryption helper ────────────────────────────────────────────────────────
function encryptKey(plainText: string): { encrypted: string; preview: string } {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY!), iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const preview = '...' + plainText.slice(-4);
  return { encrypted: iv.toString('hex') + ':' + encrypted, preview };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const sql = neon(DATABASE_URL!);

  console.log('📦 Running admin migration...\n');

  // 1. Run SQL migration file
  const sqlContent = readFileSync(join(process.cwd(), 'scripts', 'migrate-admin.sql'), 'utf8');
  // Split by semicolons to run statement by statement
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    try {
      await sql(statement as any);
    } catch (err: any) {
      console.warn('  ⚠️  Statement warning:', err.message?.slice(0, 80));
    }
  }
  console.log('✅ Tables created.\n');

  // 2. Insert admin email
  await sql`
    INSERT INTO admins (email, name)
    VALUES (${ADMIN_EMAIL}, ${ADMIN_NAME})
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
  `;
  console.log(`✅ Admin registered: ${ADMIN_EMAIL}\n`);

  // 3. Migrate existing GEMINI_API_KEY to api_keys table
  if (GEMINI_API_KEY) {
    const { encrypted, preview } = encryptKey(GEMINI_API_KEY);
    await sql`
      INSERT INTO api_keys (label, provider, model_default, key_encrypted, key_preview, is_active, priority)
      VALUES (
        'Gemini — cuenta principal (migrada)',
        'gemini',
        'gemini-2.5-flash',
        ${encrypted},
        ${preview},
        true,
        1
      )
      ON CONFLICT DO NOTHING
    `;
    console.log(`✅ Gemini API Key migrated to DB (preview: ${preview})\n`);
    console.log('  ⚠️  You can now remove GEMINI_API_KEY from Vercel env vars.\n');
  } else {
    console.log('ℹ️  No GEMINI_API_KEY found — add your keys from the Admin Panel after deploy.\n');
  }

  console.log('🎉 Migration complete!\n');
  console.log('Next steps:');
  console.log('  1. Add ADMIN_ENCRYPTION_KEY to Vercel environment variables');
  console.log('  2. Add ADMIN_EMAIL to Vercel environment variables');
  console.log('  3. Deploy and access /admin to manage API keys\n');
}

main().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
