const fs = require('fs');
const { neon } = require('@neondatabase/serverless');

async function main() {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  const dbUrlMatch = envFile.match(/DATABASE_URL=(.*)/);
  if (!dbUrlMatch) {
    console.error('DATABASE_URL no encontrada en .env.local');
    return;
  }
  const dbUrl = dbUrlMatch[1].replace(/['"]/g, '').trim();
  const sql = neon(dbUrl);

  console.log('Ejecutando schema-horarios.sql en Neon PostgreSQL...');

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS horario_config (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        teacher_id      UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        dias_lectivos   INTEGER NOT NULL DEFAULT 5,
        horas_por_dia   INTEGER NOT NULL DEFAULT 6,
        hora_inicio     TEXT    NOT NULL DEFAULT '08:00',
        periodo_activo  TEXT    NOT NULL DEFAULT 'A',
        g1              INTEGER NOT NULL DEFAULT 1,
        g2              INTEGER NOT NULL DEFAULT 1,
        g3              INTEGER NOT NULL DEFAULT 1,
        mapa_curricular_completado BOOLEAN NOT NULL DEFAULT FALSE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(teacher_id)
      );
    `;
    console.log('✅ Tabla horario_config creada/verificada');
  } catch (e) {
    console.error('❌ Error creando horario_config:', e.message);
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS horario_grupos (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        teacher_id            UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        nombre                TEXT NOT NULL,
        semestre              INTEGER NOT NULL,
        capacitacion_nombre   TEXT,
        ffeo_socioemocional   TEXT,
        ffe_optativas         JSONB,
        created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(teacher_id, nombre)
      );
    `;
    console.log('✅ Tabla horario_grupos creada/verificada');
  } catch (e) {
    console.error('❌ Error creando horario_grupos:', e.message);
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS horario_cargas (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        teacher_id          UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        grupo_nombre        TEXT NOT NULL,
        uac_name            TEXT NOT NULL,
        personal_id         TEXT NOT NULL,
        horas_semanales     INTEGER NOT NULL DEFAULT 3,
        requiere_aula_esp   BOOLEAN NOT NULL DEFAULT FALSE,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(teacher_id, grupo_nombre, uac_name)
      );
    `;
    console.log('✅ Tabla horario_cargas creada/verificada');
  } catch (e) {
    console.error('❌ Error creando horario_cargas:', e.message);
  }

  try {
    await sql`
      CREATE OR REPLACE FUNCTION update_horario_config_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
      $$ LANGUAGE plpgsql;
    `;
    console.log('✅ Función update_horario_config_updated_at creada/verificada');
  } catch (e) {
    console.error('❌ Error creando función trigger:', e.message);
  }

  try {
    await sql`
      DROP TRIGGER IF EXISTS horario_config_updated_at ON horario_config;
    `;
    await sql`
      CREATE TRIGGER horario_config_updated_at
        BEFORE UPDATE ON horario_config
        FOR EACH ROW EXECUTE FUNCTION update_horario_config_updated_at();
    `;
    console.log('✅ Trigger horario_config_updated_at creado/verificado');
  } catch (e) {
    console.error('❌ Error creando trigger:', e.message);
  }

  try {
    await sql`
      CREATE INDEX IF NOT EXISTS idx_horario_grupos_teacher ON horario_grupos(teacher_id);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_horario_cargas_teacher ON horario_cargas(teacher_id);
    `;
    console.log('✅ Índices creados/verificados');
  } catch (e) {
    console.error('❌ Error creando índices:', e.message);
  }

  console.log('\n🎉 ¡Migración de base de datos completada exitosamente!');
}

main();
