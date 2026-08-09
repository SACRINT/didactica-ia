const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function main() {
  const docs = await sql`SELECT * FROM normativa_documentos ORDER BY id`;
  const arts = await sql`SELECT count(*) FROM normativa_articulos`;
  console.log('Total documentos:', docs.length);
  console.log('Total articulos:', arts[0].count);
  console.log('Documentos:');
  docs.forEach(d => console.log(`- [${d.id}] (${d.tipo}) ${d.titulo} (vigente: ${d.vigente})`));
}

main().catch(console.error);
