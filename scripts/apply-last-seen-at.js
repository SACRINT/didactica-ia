/**
 * apply-last-seen-at.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Migración permanente: garantiza que last_seen_at y custom_preferences
 * existen en la tabla teachers de Neon PostgreSQL.
 *
 * EJECUTAR UNA SOLA VEZ en producción:
 *   node scripts/apply-last-seen-at.js
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
  console.log('🔄  Aplicando migración de last_seen_at y custom_preferences...\n');

  try {
    // 1. Agregar last_seen_at de manera permanente
    await sql`
      ALTER TABLE teachers
      ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW()
    `;
    console.log('✅  Columna last_seen_at: OK');

    // 2. Agregar custom_preferences (perfil de preferencias IA por usuario)
    await sql`
      ALTER TABLE teachers
      ADD COLUMN IF NOT EXISTS custom_preferences JSONB
    `;
    console.log('✅  Columna custom_preferences: OK');

    // 3. Inicializar last_seen_at a created_at para usuarios existentes que la tengan nula
    const updated = await sql`
      UPDATE teachers
      SET last_seen_at = created_at
      WHERE last_seen_at IS NULL
      RETURNING id
    `;
    console.log(`✅  ${updated.length} registro(s) de teachers inicializados con last_seen_at.`);

    // 4. Crear índice para acelerar consultas de Admin (usuarios activos)
    await sql`
      CREATE INDEX IF NOT EXISTS idx_teachers_last_seen_at
      ON teachers (last_seen_at DESC)
    `;
    console.log('✅  Índice idx_teachers_last_seen_at: OK');

    console.log('\n🎉  Migración completada exitosamente.');
  } catch (err) {
    console.error('\n❌  Error durante la migración:', err.message);
    process.exit(1);
  }
}

run();
