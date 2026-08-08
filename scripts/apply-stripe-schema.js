/**
 * apply-stripe-schema.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Migración para alinear la tabla subscriptions con el webhook
 * y crear subscription_subjects.
 *
 * EJECUTAR: node --env-file=.env.local scripts/apply-stripe-schema.js
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
  console.log('🔄  Aplicando migración del esquema Stripe...\n');

  try {
    // 1. Agregar nuevas columnas a subscriptions
    await sql`
      ALTER TABLE subscriptions
      ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
      ADD COLUMN IF NOT EXISTS plan_name TEXT NOT NULL DEFAULT 'free',
      ADD COLUMN IF NOT EXISTS plan_subjects INTEGER NOT NULL DEFAULT 0
    `;
    console.log('✅  Columnas agregadas a subscriptions: OK');

    // 2. Mover datos de plan_tier a plan_name (si plan_tier existe)
    try {
      await sql`
        UPDATE subscriptions SET plan_name = plan_tier WHERE plan_tier IS NOT NULL
      `;
      console.log('✅  Datos migrados de plan_tier a plan_name: OK');
    } catch (e) {
      // Ignorar si plan_tier no existe (ya se eliminó en migraciones previas)
    }

    // 3. Eliminar columnas viejas (safe drop)
    try {
      await sql`ALTER TABLE subscriptions DROP COLUMN IF EXISTS plan_tier`;
      await sql`ALTER TABLE subscriptions DROP COLUMN IF EXISTS materia_limit`;
      console.log('✅  Columnas legacy eliminadas: OK');
    } catch (e) {
      console.log('⚠️  Nota al eliminar columnas legacy:', e.message);
    }

    // 4. Crear tabla subscription_subjects
    await sql`
      CREATE TABLE IF NOT EXISTS subscription_subjects (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        teacher_id          UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        subscription_id     UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
        uac_name            TEXT NOT NULL,
        semester            INTEGER NOT NULL,
        component           TEXT,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(teacher_id, subscription_id, uac_name, semester)
      )
    `;
    console.log('✅  Tabla subscription_subjects creada: OK');

    console.log('\n🎉  Migración Stripe completada exitosamente.');
  } catch (err) {
    console.error('\n❌  Error durante la migración Stripe:', err.message);
    process.exit(1);
  }
}

run();
