// scratch/seed-pips-prompt.js
const fs = require('fs');
const path = require('path');

let dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf8').split('\n');
      for (const line of lines) {
        if (line.startsWith('DATABASE_URL=')) {
          dbUrl = line.split('=')[1].trim().replace(/^["']|["']$/g, '');
          break;
        }
      }
    }
  } catch (e) {
    console.error('No se pudo leer .env.local:', e);
  }
}

if (!dbUrl) {
  console.error('DATABASE_URL no definida');
  process.exit(1);
}

const { neon } = require('@neondatabase/serverless');
const sql = neon(dbUrl);

// Leer archivo TS directamente y parsear la constante
const pipsChunksFile = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'prompts', 'pips-chunks.ts'), 'utf8');
const promptMatch = pipsChunksFile.match(/export const PIPS_SYSTEM_PROMPT = `([\s\S]+?)`;/);
if (!promptMatch) {
  console.error('No se pudo encontrar PIPS_SYSTEM_PROMPT en el archivo');
  process.exit(1);
}
const PIPS_SYSTEM_PROMPT = promptMatch[1];

async function run() {
  try {
    // Inserción parametrizada limpia
    await sql`
      INSERT INTO ai_prompts (id, label, content, is_active)
      VALUES ('pips_system', 'Plan de Intervención Pedagógica de Supervisión (PIPS) — Prompt de Sistema', ${PIPS_SYSTEM_PROMPT}, true)
      ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, content = EXCLUDED.content
    `;
    console.log('✅ Prompt de PIPS insertado en la base de datos');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();
