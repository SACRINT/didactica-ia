import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL no está definida en el entorno.');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log('🚀 Iniciando migración de programs_catalog para soporte multisubsistema y motor dual...');

  try {
    // 1. Agregar columnas subsystem y model_type si no existen
    console.log('1. Verificando y añadiendo columnas subsystem y model_type...');
    await sql`
      ALTER TABLE programs_catalog 
      ADD COLUMN IF NOT EXISTS subsystem TEXT NOT NULL DEFAULT 'bge';
    `;

    await sql`
      ALTER TABLE programs_catalog 
      ADD COLUMN IF NOT EXISTS model_type TEXT NOT NULL DEFAULT 'propositos_contenidos';
    `;

    // 2. Actualizar registros existentes según semestre
    console.log('2. Actualizando model_type en programas existentes...');
    await sql`
      UPDATE programs_catalog 
      SET model_type = CASE 
        WHEN semester >= 5 THEN 'progresiones' 
        ELSE 'propositos_contenidos' 
      END
      WHERE model_type IS NULL OR model_type = 'propositos_contenidos';
    `;

    // Asegurar que los existentes tengan subsystem = 'bge' si está vacío
    await sql`
      UPDATE programs_catalog 
      SET subsystem = 'bge' 
      WHERE subsystem IS NULL OR subsystem = '';
    `;

    // 3. Ajustar restricción de unicidad para permitir la misma UAC en diferentes subsistemas
    console.log('3. Ajustando restricciones de unicidad...');
    try {
      // Remover la restricción unique de uac_name si existe
      await sql`
        ALTER TABLE programs_catalog DROP CONSTRAINT IF EXISTS programs_catalog_uac_name_key;
      `;
    } catch (e) {
      console.log('Nota sobre constraint uac_name:', e.message);
    }

    // Crear índice único compuesto por (uac_name, semester, component, subsystem)
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_programs_catalog_unique_uac 
      ON programs_catalog (uac_name, semester, component, subsystem);
    `;

    // Crear índices de consulta rápida
    await sql`
      CREATE INDEX IF NOT EXISTS idx_programs_catalog_lookup 
      ON programs_catalog (subsystem, semester, component);
    `;

    console.log('✅ Migración de programs_catalog completada exitosamente.');
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  }
}

main();
