import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const sql = neon(process.env.DATABASE_URL);

async function main() {
  try {
    console.log('Agregando columna contenidos_formativos a la tabla programs_catalog...');
    await sql`
      ALTER TABLE programs_catalog 
      ADD COLUMN IF NOT EXISTS contenidos_formativos JSONB;
    `;
    console.log('✅ Columna agregada correctamente.');
  } catch (err) {
    console.error('❌ Error al agregar la columna:', err.message);
  }
}
main();
