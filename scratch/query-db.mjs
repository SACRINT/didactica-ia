import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const sql = neon(process.env.DATABASE_URL);

async function main() {
  try {
    const rows = await sql`
      SELECT id, uac_name, component, activities, contenidos_formativos
      FROM programs_catalog
      WHERE uac_name = 'Ciencias Sociales I';
    `;
    console.log(JSON.stringify(rows[0], null, 2));
  } catch (err) {
    console.error(err);
  }
}
main();
