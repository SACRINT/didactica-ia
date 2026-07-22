import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Parse .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const [k, ...v] = line.split('=');
  if (k && !k.startsWith('#')) process.env[k.trim()] = v.join('=').trim();
}

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  await sql`
    CREATE TABLE IF NOT EXISTS pips_projects (
      id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      teacher_id                UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
      zona_clave                TEXT,
      zona_nombre               TEXT NOT NULL DEFAULT 'Zona Escolar 004',
      supervisor_name           TEXT,
      municipio_sede            TEXT,
      municipios_atiende        TEXT,
      num_planteles             INTEGER DEFAULT 17,
      subsistema                TEXT DEFAULT 'BGE',
      modalidad                 TEXT DEFAULT 'Escolarizada',
      ciclo_escolar             TEXT DEFAULT '2026-2027',
      atps                      TEXT,
      presentacion_supervisor   TEXT,
      pips_anterior_realizado   BOOLEAN DEFAULT false,
      reflexion_pips_anterior   TEXT,
      fortalezas_anterior       TEXT,
      areas_oportunidad_anterior TEXT,
      planteles_json            JSONB,
      personal_json             JSONB,
      diagnostico_contexto      TEXT,
      problematicas_json        JSONB,
      objetivo_general          TEXT,
      objetivos_especificos_json JSONB,
      cronograma_json           JSONB,
      evaluacion_json           JSONB,
      generated_content         TEXT,
      current_step              INTEGER DEFAULT 1,
      status                    TEXT DEFAULT 'draft',
      created_at                TIMESTAMPTZ DEFAULT NOW(),
      updated_at                TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('✅ Tabla pips_projects creada/verificada.');
}

migrate().catch(e => { console.error('❌', e.message); process.exit(1); });
