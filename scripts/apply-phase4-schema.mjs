import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function applyPhase4Schema() {
  console.log('🚀 Aplicando esquemas e índices de la Fase 4 en Neon DB...');

  // 1. Crear tabla schedules si no existe
  console.log('1. Creando tabla schedules...');
  await sql`
    CREATE TABLE IF NOT EXISTS schedules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      school_name VARCHAR(255),
      cct VARCHAR(50),
      cycle_year VARCHAR(20) DEFAULT '2026-2027',
      period VARCHAR(10) DEFAULT 'A',
      status VARCHAR(50) DEFAULT 'published',
      config JSONB DEFAULT '{}'::jsonb,
      grupos JSONB DEFAULT '[]'::jsonb,
      docentes JSONB DEFAULT '[]'::jsonb,
      aulas JSONB DEFAULT '[]'::jsonb,
      cargas JSONB DEFAULT '[]'::jsonb,
      celdas JSONB DEFAULT '[]'::jsonb,
      metricas JSONB DEFAULT '{}'::jsonb,
      ai_optimization_log JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  // 2. Crear tabla notifications si no existe
  console.log('2. Creando tabla notifications...');
  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      link VARCHAR(255),
      severity VARCHAR(20) DEFAULT 'info',
      read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  // 3. Crear índices de alto rendimiento
  console.log('3. Creando índices de optimización...');
  await sql`
    CREATE INDEX IF NOT EXISTS idx_programs_catalog_search ON programs_catalog(semester, component, subsystem);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_programs_catalog_name ON programs_catalog(uac_name);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_plannings_teacher_status ON plannings(teacher_id, status, semester);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_plannings_created ON plannings(created_at DESC);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_audit_results_planning ON audit_results(planning_id, overall_score);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_audit_results_teacher ON audit_results(teacher_id, created_at DESC);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_ffe_continuity_uacs ON ffe_continuity(semester_5_uac, semester_6_uac);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_schedules_teacher ON schedules(teacher_id, status, created_at DESC);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read, created_at DESC);
  `;

  console.log('✅ Tablas schedules, notifications e índices creados exitosamente en Neon DB.');
}

applyPhase4Schema().catch(console.error);
