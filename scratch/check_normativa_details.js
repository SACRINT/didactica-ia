const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function main() {
  const docs = await sql`
    SELECT id, titulo, tipo, fuente, vigente, orden_display,
           (SELECT COUNT(*) FROM normativa_articulos WHERE documento_id = d.id) as num_arts
    FROM normativa_documentos d
    ORDER BY d.orden_display, d.id
  `;

  console.log(`=== TOTAL DOCUMENTOS: ${docs.length} ===`);
  const vigentes = docs.filter(d => d.vigente);
  const noVigentes = docs.filter(d => !d.vigente);
  console.log(`Vigentes: ${vigentes.length}, No vigentes: ${noVigentes.length}`);
  
  console.log('\n--- DOCUMENTOS CON ARTÍCULOS ---');
  docs.filter(d => d.num_arts > 0).forEach(d => {
    console.log(`[${d.id}] ${d.titulo} | Tipo: ${d.tipo} | Vigente: ${d.vigente} | Arts: ${d.num_arts}`);
  });
}

main().catch(console.error);
