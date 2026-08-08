/**
 * apply-biblioteca-schema.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Migración para crear la tabla user_library_docs (Módulo 3)
 *
 * EJECUTAR: node --env-file=.env.local scripts/apply-biblioteca-schema.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌  DATABASE_URL no encontrada en .env.local');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function run() {
  console.log('🔄  Aplicando migración del esquema Biblioteca Personal...\n');

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS user_library_docs (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        teacher_email TEXT NOT NULL,
        file_name     TEXT NOT NULL,
        file_type     TEXT NOT NULL,
        file_size     INTEGER NOT NULL,
        extracted_text TEXT,
        embedding     TEXT, -- En el futuro pgvector, por ahora TEXT
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    console.log('✅  Tabla user_library_docs creada: OK');

    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_library_docs_email
      ON user_library_docs (teacher_email)
    `;
    console.log('✅  Índice idx_user_library_docs_email creado: OK');

    console.log('\n🎉  Migración Biblioteca Personal completada exitosamente.');
  } catch (err) {
    console.error('\n❌  Error durante la migración Biblioteca Personal:', err.message);
    process.exit(1);
  }
}

run();
