// scratch/migrate-db.js
const fs = require('fs');
const path = require('path');

// Leer variables de .env.local
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
  console.error('Error: DATABASE_URL no encontrada.');
  process.exit(1);
}

const { neon } = require('@neondatabase/serverless');
const sql = neon(dbUrl);

async function run() {
  try {
    console.log('Actualizando tabla teachers en Neon...');
    await sql.query('ALTER TABLE teachers ADD COLUMN IF NOT EXISTS custom_api_key TEXT');
    await sql.query('ALTER TABLE teachers ADD COLUMN IF NOT EXISTS custom_api_provider TEXT');
    console.log('✅ Base de datos actualizada con las nuevas columnas.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error ejecutando migración:', err);
    process.exit(1);
  }
}

run();
