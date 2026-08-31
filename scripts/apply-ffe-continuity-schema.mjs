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

const FFE_PAIRS = [
  // Lengua y Comunicación
  {
    sem5: 'Comunicación y Sociedad I',
    sem6: 'Comunicación y Sociedad II',
    area: 'Recurso sociocognitivo Lengua y Comunicación'
  },
  {
    sem5: 'Raíces Etimológicas del Español I',
    sem6: 'Raíces Etimológicas del Español II',
    area: 'Recurso sociocognitivo Lengua y Comunicación'
  },
  {
    sem5: 'Inglés V',
    sem6: 'Inglés VI',
    area: 'Recurso sociocognitivo Lengua y Comunicación'
  },

  // Pensamiento Matemático
  {
    sem5: 'Taller de Pensamiento Variacional I',
    sem6: 'Taller de Pensamiento Variacional II',
    area: 'Recurso sociocognitivo Pensamiento Matemático'
  },
  {
    sem5: 'Dibujo Técnico I',
    sem6: 'Dibujo Técnico II',
    area: 'Recurso sociocognitivo Pensamiento Matemático'
  },
  {
    sem5: 'Pensamiento Matemático Aplicado a las Finanzas I',
    sem6: 'Pensamiento Matemático Aplicado a las Finanzas II',
    area: 'Recurso sociocognitivo Pensamiento Matemático'
  },
  {
    sem5: 'Taller de Probabilidad y Estadística I',
    sem6: 'Taller de Probabilidad y Estadística II',
    area: 'Recurso sociocognitivo Pensamiento Matemático'
  },

  // Ciencias Naturales, Experimentales y Tecnología
  {
    sem5: 'Salud Integral I',
    sem6: 'Salud Integral II',
    area: 'Área de conocimiento Ciencias Naturales, Experimentales y Tecnología'
  },
  {
    sem5: 'Análisis de Fenómenos y Procesos Biológicos',
    sem6: 'Temas Selectos de Biología',
    area: 'Área de conocimiento Ciencias Naturales, Experimentales y Tecnología'
  },
  {
    sem5: 'Análisis de Fenómenos Físicos I',
    sem6: 'Análisis de Fenómenos Físicos II',
    area: 'Área de conocimiento Ciencias Naturales, Experimentales y Tecnología'
  },
  {
    sem5: 'Organización del Flujo de Materia y Energía en los Organismos I',
    sem6: 'Organización del Flujo de Materia en los Organismos II',
    area: 'Área de conocimiento Ciencias Naturales, Experimentales y Tecnología'
  },

  // Ciencias Sociales
  {
    sem5: 'Fundamentos de Administración I',
    sem6: 'Fundamentos de Administración II',
    area: 'Área de conocimiento Ciencias Sociales'
  },
  {
    sem5: 'Procesos Contables I',
    sem6: 'Procesos Contables II',
    area: 'Área de conocimiento Ciencias Sociales'
  },
  {
    sem5: 'Derecho y Sociedad I',
    sem6: 'Derecho y Sociedad II',
    area: 'Área de conocimiento Ciencias Sociales'
  },
  {
    sem5: 'Economía I. La Función de los Agentes Económicos en la Sociedad',
    sem6: 'Economía II. Política Económica y Política Pública Mexicana',
    area: 'Área de conocimiento Ciencias Sociales'
  },
  {
    sem5: 'Economía I',
    sem6: 'Economía II',
    area: 'Área de conocimiento Ciencias Sociales'
  },
  {
    sem5: 'Temas Selectos de Ciencias Sociales I',
    sem6: 'Temas Selectos de Ciencias Sociales II',
    area: 'Área de conocimiento Ciencias Sociales'
  },
  {
    sem5: 'Psicología I',
    sem6: 'Psicología II',
    area: 'Área de conocimiento Ciencias Sociales'
  },

  // Humanidades
  {
    sem5: 'Arte y Cultura I',
    sem6: 'Arte y Cultura II',
    area: 'Área de conocimiento Humanidades'
  },
  {
    sem5: 'Lógica y Pensamiento Crítico',
    sem6: 'Experiencia Estética',
    area: 'Área de conocimiento Humanidades'
  },
  {
    sem5: 'Pensamiento Filosófico I',
    sem6: 'Pensamiento Filosófico II',
    area: 'Área de conocimiento Humanidades'
  }
];

async function main() {
  console.log('🚀 Creando tabla ffe_continuity en Neon PostgreSQL...');

  await sql`
    CREATE TABLE IF NOT EXISTS ffe_continuity (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      semester_5_uac TEXT NOT NULL,
      semester_6_uac TEXT NOT NULL,
      area TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(semester_5_uac, semester_6_uac)
    );
  `;
  console.log('✅ Tabla ffe_continuity creada o verificada.');

  console.log('📥 Poblando tabla ffe_continuity con los pares oficiales...');
  let inserted = 0;
  for (const pair of FFE_PAIRS) {
    await sql`
      INSERT INTO ffe_continuity (semester_5_uac, semester_6_uac, area)
      VALUES (${pair.sem5}, ${pair.sem6}, ${pair.area})
      ON CONFLICT (semester_5_uac, semester_6_uac)
      DO UPDATE SET area = EXCLUDED.area;
    `;
    inserted++;
  }

  console.log(`✅ ${inserted} registros de continuidad FFE insertados/actualizados.`);

  const rows = await sql`SELECT semester_5_uac, semester_6_uac, area FROM ffe_continuity ORDER BY area, semester_5_uac`;
  console.log('\n📊 Contenido de ffe_continuity:');
  console.table(rows);
}

main().catch(console.error);
