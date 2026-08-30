const { neon } = require('@neondatabase/serverless');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Falta DATABASE_URL en el archivo .env.local");
    process.exit(1);
  }
  const sql = neon(process.env.DATABASE_URL);
  
  const result = await sql`SELECT * FROM horario_config LIMIT 1`;
  console.log(result.length > 0 ? Object.keys(result[0]) : "0 results");
}

main().catch(console.error);
