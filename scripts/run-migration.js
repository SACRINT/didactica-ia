// Script de migración para las tablas de suscripciones
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno manualmente
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      const key = trimmed.substring(0, idx).trim();
      const val = trimmed.substring(idx + 1).trim();
      envVars[key] = val;
    }
  }
}

const DATABASE_URL = envVars['DATABASE_URL'];
if (!DATABASE_URL) {
  console.error('No DATABASE_URL found');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function runMigration() {
  console.log('Starting migration...');

  try {
    // 1. Agregar columnas a teachers
    await sql`ALTER TABLE teachers ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false`;
    console.log('OK: profile_completed column');
    
    await sql`ALTER TABLE teachers ADD COLUMN IF NOT EXISTS school_locked BOOLEAN DEFAULT false`;
    console.log('OK: school_locked column');

    // 2. Crear tabla subscriptions
    await sql`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        teacher_id              UUID        NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        stripe_customer_id      TEXT        UNIQUE,
        stripe_subscription_id  TEXT        UNIQUE,
        stripe_price_id         TEXT,
        plan_name               TEXT        NOT NULL DEFAULT 'basico',
        plan_subjects           INTEGER     NOT NULL DEFAULT 1,
        status                  TEXT        NOT NULL DEFAULT 'inactive',
        current_period_start    TIMESTAMPTZ,
        current_period_end      TIMESTAMPTZ,
        cancel_at_period_end    BOOLEAN     DEFAULT false,
        created_at              TIMESTAMPTZ DEFAULT NOW(),
        updated_at              TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('OK: subscriptions table');

    await sql`CREATE INDEX IF NOT EXISTS idx_subscriptions_teacher_id ON subscriptions(teacher_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id)`;
    console.log('OK: subscriptions indexes');

    // 3. Crear tabla subscription_subjects
    await sql`
      CREATE TABLE IF NOT EXISTS subscription_subjects (
        id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        teacher_id      UUID        NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        subscription_id UUID        NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
        uac_name        TEXT        NOT NULL,
        semester        INTEGER     NOT NULL,
        component       TEXT        NOT NULL,
        locked_at       TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('OK: subscription_subjects table');

    await sql`CREATE INDEX IF NOT EXISTS idx_sub_subjects_teacher ON subscription_subjects(teacher_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sub_subjects_subscription ON subscription_subjects(subscription_id)`;
    console.log('OK: subscription_subjects indexes');

    // 4. Crear tabla subscription_changes
    await sql`
      CREATE TABLE IF NOT EXISTS subscription_changes (
        id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        teacher_id          UUID        NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        change_type         TEXT        NOT NULL,
        stripe_payment_id   TEXT,
        amount_mxn          NUMERIC(10,2),
        metadata            JSONB       DEFAULT '{}',
        status              TEXT        DEFAULT 'pending',
        created_at          TIMESTAMPTZ DEFAULT NOW(),
        completed_at        TIMESTAMPTZ
      )
    `;
    console.log('OK: subscription_changes table');

    await sql`CREATE INDEX IF NOT EXISTS idx_sub_changes_teacher ON subscription_changes(teacher_id)`;
    console.log('OK: subscription_changes index');

    console.log('\nMigration completed successfully!');
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
}

runMigration().then(() => process.exit(0));
