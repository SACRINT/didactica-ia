// scripts/apply-analytics-schema.js
// Run: node --env-file=.env.local scripts/apply-analytics-schema.js
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log('⏳ Applying analytics schema (Módulo 4)...');

  // 1. generation_feedback table
  await sql`
    CREATE TABLE IF NOT EXISTS generation_feedback (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      teacher_id      UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
      entity_type     TEXT NOT NULL,
      entity_id       TEXT NOT NULL,
      rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment         TEXT,
      dimension       TEXT DEFAULT 'general',
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log('  ✅ generation_feedback table ready');

  await sql`
    CREATE INDEX IF NOT EXISTS idx_feedback_teacher_id ON generation_feedback(teacher_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_feedback_entity ON generation_feedback(entity_type, entity_id)
  `;
  console.log('  ✅ Indexes ready');

  // 2. custom_preferences column (idempotent)
  await sql`
    ALTER TABLE teachers
    ADD COLUMN IF NOT EXISTS custom_preferences JSONB
  `;
  console.log('  ✅ teachers.custom_preferences column ready');

  console.log('\n🎉 Analytics schema applied successfully!');
}

main().catch((err) => {
  console.error('❌ Error applying analytics schema:', err);
  process.exit(1);
});
