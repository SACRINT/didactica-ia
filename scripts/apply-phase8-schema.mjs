import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env.local');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  });
} catch { /* .env.local not found */ }

const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log('🚀 Applying Phase 8 Schema (Notifications & Automation Rules)...');

  // 1. Extend notifications table
  await sql`
    ALTER TABLE notifications 
    ADD COLUMN IF NOT EXISTS channels JSONB DEFAULT '["in_app"]'::jsonb;
  `;
  await sql`
    ALTER TABLE notifications 
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
  `;
  console.log('✅ notifications table extended with channels and metadata.');

  // 2. Create automation_rules table
  await sql`
    CREATE TABLE IF NOT EXISTS automation_rules (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      trigger TEXT NOT NULL,
      conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
      actions JSONB NOT NULL DEFAULT '{}'::jsonb,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  console.log('✅ automation_rules table created.');

  // 3. Seed default 3 automation rules if empty
  const countRes = await sql`SELECT COUNT(*)::int as count FROM automation_rules`;
  if (countRes[0]?.count === 0) {
    console.log('🌱 Seeding 3 default automation rules...');
    await sql`
      INSERT INTO automation_rules (id, nombre, trigger, conditions, actions, active)
      VALUES 
        (
          'rule_audit_low_score',
          'Alerta y Recomendaciones en Auditoría Baja (<70)',
          'audit_completed',
          '{"maxScore": 70}'::jsonb,
          '{"type": "notification", "channels": ["in_app", "email"], "template": "Tu planeación obtuvo un puntaje de auditoría de {score}/100. Se han generado recomendaciones automáticas para mejorarla."}'::jsonb,
          true
        ),
        (
          'rule_deadline_approaching',
          'Recordatorio de Corte Evaluativo (5 días antes)',
          'deadline_approaching',
          '{"daysBefore": 5}'::jsonb,
          '{"type": "notification", "channels": ["in_app", "email"], "template": "El corte evaluativo de tu UAC vence en 5 días. Revisa tus evidencias formativas."}'::jsonb,
          true
        ),
        (
          'rule_ffe_continuity_sem6',
          'Continuidad de Formación Laboral FFE (Semestre 5 a 6)',
          'planning_generated',
          '{"semester": 5, "component": "laboral"}'::jsonb,
          '{"type": "notification", "channels": ["in_app"], "template": "Has generado la planeación de FFE de 5° Semestre. Recuerda preparar la continuidad formativa para 6° Semestre."}'::jsonb,
          true
        )
    `;
    console.log('✅ Default automation rules seeded successfully.');
  }

  console.log('🎉 Phase 8 database setup completed!');
}

main().catch(err => {
  console.error('❌ Error applying schema:', err);
  process.exit(1);
});
