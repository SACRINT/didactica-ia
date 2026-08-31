import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env.local');
let dbUrl = '';
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*)$/);
    if (m) {
      let val = m[1].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      dbUrl = val;
    }
  });
}

const sql = neon(dbUrl);

async function main() {
  console.log('🚀 Creando tabla audit_results en Neon PostgreSQL...');

  await sql`
    CREATE TABLE IF NOT EXISTS audit_results (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      planning_id UUID NOT NULL REFERENCES plannings(id) ON DELETE CASCADE,
      teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
      uac_name TEXT NOT NULL,
      semester INT NOT NULL,
      component TEXT NOT NULL,
      subsystem TEXT DEFAULT 'bge',
      overall_score NUMERIC(5, 2) NOT NULL, -- 0 a 100
      compliance_level TEXT NOT NULL, -- 'excelente' | 'satisfactorio' | 'requiere_mejora' | 'no_alineado'
      
      -- Las 4 dimensiones de auditoría pedagógica
      dimension_scores JSONB NOT NULL,
      /*
      {
        "propositos_alineacion": { "score": 95, "max": 100, "weight": 0.30, "status": "cumple", "feedback": "..." },
        "cobertura_contenidos": { "score": 88, "max": 100, "weight": 0.25, "status": "cumple", "feedback": "..." },
        "secuenciacion_logica": { "score": 90, "max": 100, "weight": 0.25, "status": "cumple", "feedback": "..." },
        "adecuacion_evidencias": { "score": 85, "max": 100, "weight": 0.20, "status": "parcial", "feedback": "..." }
      }
      */
      
      findings JSONB NOT NULL,
      /*
      {
        "fortalezas": ["..."],
        "desalineaciones": ["..."],
        "omisiones_detectadas": ["..."],
        "propositos_cubiertos": ["..."],
        "propositos_omitidos": ["..."]
      }
      */
      
      recommendations JSONB NOT NULL,
      /*
      [
        { "dimension": "cobertura_contenidos", "severidad": "alta", "mensaje": "..." }
      ]
      */
      
      official_program_ref JSONB, -- Instantánea del programa oficial usado como patrón
      audited_by TEXT DEFAULT 'ia_pedagogica',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_audit_results_planning_id ON audit_results(planning_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_results_teacher_id ON audit_results(teacher_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_results_compliance ON audit_results(compliance_level);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_results_created ON audit_results(created_at DESC);`;

  console.log('✅ Tabla audit_results e índices creados exitosamente en Neon PostgreSQL.');
}

main().catch(console.error);
