/**
 * Phase 6D: Create document_signatures table
 * Run: node --env-file=.env.local scripts/apply-signature-schema.mjs
 */
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function apply() {
  console.log('🔐 Applying document_signatures schema...\n');

  await sql`
    CREATE TABLE IF NOT EXISTS document_signatures (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      hash TEXT NOT NULL UNIQUE,
      timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
      signer_name TEXT NOT NULL,
      signer_role TEXT NOT NULL,
      cct TEXT NOT NULL,
      document_type TEXT NOT NULL,
      document_id TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  console.log('✅ document_signatures table created');

  await sql`CREATE INDEX IF NOT EXISTS idx_doc_sigs_hash ON document_signatures(hash)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_doc_sigs_doc ON document_signatures(document_type, document_id)`;
  console.log('✅ Indexes created');

  console.log('\n🎉 Signature schema applied!');
}

apply().catch(console.error);
