// scratch/migrate-db-role.js
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
  console.error('Error: DATABASE_URL no encontrada.');
  process.exit(1);
}

const { neon } = require('@neondatabase/serverless');
const sql = neon(dbUrl);

async function run() {
  try {
    console.log('Actualizando tabla teachers en Neon para agregar la columna role...');
    // 1. Agregar la columna role con valor por defecto 'docente'
    await sql.query("ALTER TABLE teachers ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'docente'");
    
    // 2. Por seguridad, asegurarnos de que la columna existe en el catálogo y actualizar roles existentes
    // Si la cuenta es el administrador predeterminado del archivo .env o tiene email admin, podemos ponerlo como administrador
    console.log('✅ Columna role creada exitosamente.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error ejecutando migración:', err);
    process.exit(1);
  }
}

run();
