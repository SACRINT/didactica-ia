/**
 * Phase 6B: Ingesta de Embeddings Curriculares
 * Generates and stores embeddings for the 449 SEP programs.
 * Run: node --env-file=.env.local scripts/ingest-curriculum-embeddings.mjs
 *
 * Usage:
 *   node --env-file=.env.local scripts/ingest-curriculum-embeddings.mjs
 *   node --env-file=.env.local scripts/ingest-curriculum-embeddings.mjs --batch=50
 *   node --env-file=.env.local scripts/ingest-curriculum-embeddings.mjs --dry-run
 */
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

const BATCH_SIZE = parseInt(process.argv.find(a => a.startsWith('--batch'))?.split('=')[1] || '20', 10);
const DRY_RUN = process.argv.includes('--dry-run');

const EMBEDDING_MODEL = 'text-embedding-004';

async function generateEmbedding(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_DOCUMENT',
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Embedding API error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return data.embedding.values;
}

function buildChunkText(program) {
  const parts = [];

  parts.push(`UAC: ${program.uac_name}`);
  parts.push(`Semestre: ${program.semester}°`);
  parts.push(`Componente: ${program.component}`);
  parts.push(`Subsistema: ${program.subsystem}`);
  parts.push(`Horas totales: ${program.total_hours}`);

  if (program.learning_outcome) {
    parts.push(`Resultado de aprendizaje: ${program.learning_outcome}`);
  }

  if (program.purpose) {
    parts.push(`Propósito formativo: ${program.purpose}`);
  }

  if (program.activities && Array.isArray(program.activities)) {
    parts.push('Actividades:');
    program.activities.forEach((a, i) => {
      const name = typeof a === 'string' ? a : a.name || a.actividad_clave || `Actividad ${i + 1}`;
      const hours = typeof a === 'object' ? (a.hours || a.horas || '') : '';
      parts.push(`  ${i + 1}. ${name}${hours ? ` (${hours}h)` : ''}`);
    });
  }

  if (program.evidences && Array.isArray(program.evidences)) {
    parts.push('Evidencias: ' + program.evidences.join('; '));
  }

  if (program.contenidos_formativos && Array.isArray(program.contenidos_formativos)) {
    parts.push('Contenidos formativos:');
    program.contenidos_formativos.forEach(cf => {
      const tema = cf.tema || cf.proposito || '';
      const items = cf.contenidos || cf.subtemas || [];
      if (tema) parts.push(`  - ${tema}: ${Array.isArray(items) ? items.join(', ') : items}`);
    });
  }

  return parts.join('\n');
}

async function main() {
  console.log('🎓 Phase 6B: Curriculum Embeddings Ingestion\n');
  console.log(`   Batch size: ${BATCH_SIZE}`);
  console.log(`   Dry run: ${DRY_RUN}\n`);

  // Fetch all programs
  const programs = await sql`SELECT * FROM programs_catalog ORDER BY semester, component, uac_name`;
  console.log(`📚 Found ${programs.length} programs in catalog\n`);

  if (programs.length === 0) {
    console.log('❌ No programs found. Run build-authentic-database.mjs first.');
    return;
  }

  if (DRY_RUN) {
    console.log('🔍 Dry run - showing first 5 programs that would be processed:\n');
    programs.slice(0, 5).forEach((p, i) => {
      const chunk = buildChunkText(p);
      console.log(`  ${i + 1}. ${p.uac_name} (Sem ${p.semester}, ${p.component})`);
      console.log(`     Chunk length: ${chunk.length} chars\n`);
    });
    console.log(`  ... and ${programs.length - 5} more programs`);
    return;
  }

  // Process in batches
  let processed = 0;
  let errors = 0;

  for (let i = 0; i < programs.length; i += BATCH_SIZE) {
    const batch = programs.slice(i, i + BATCH_SIZE);
    console.log(`\n📦 Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(programs.length / BATCH_SIZE)} (${batch.length} programs)`);

    for (const program of batch) {
      try {
        const chunkText = buildChunkText(program);

        // Skip very short chunks
        if (chunkText.length < 50) {
          console.log(`  ⏭️  Skipping ${program.uac_name} (chunk too short: ${chunkText.length} chars)`);
          continue;
        }

        // Generate embedding
        const embedding = await generateEmbedding(chunkText);

        // Store in DB
        await sql`
          INSERT INTO curriculum_embeddings (program_id, uac_name, semester, component, subsystem, chunk_type, chunk_text, embedding, metadata)
          VALUES (
            ${program.id || program.uac_name},
            ${program.uac_name},
            ${program.semester},
            ${program.component},
            ${program.subsystem || 'bge'},
            'full_program',
            ${chunkText},
            ${JSON.stringify(embedding)}::vector,
            ${JSON.stringify({
              total_hours: program.total_hours,
              learning_outcome: program.learning_outcome,
              source: 'programs_catalog'
            })}::jsonb
          )
          ON CONFLICT (program_id) DO UPDATE SET
            chunk_text = EXCLUDED.chunk_text,
            embedding = EXCLUDED.embedding,
            metadata = EXCLUDED.metadata
        `;

        processed++;
        if (processed % 10 === 0) {
          process.stdout.write(`  ✅ ${processed}/${programs.length} processed\r`);
        }
      } catch (err) {
        errors++;
        console.error(`  ❌ Error processing ${program.uac_name}: ${err.message}`);
      }
    }
  }

  console.log(`\n\n🎉 Ingestion complete!`);
  console.log(`   ✅ Processed: ${processed}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📊 Total chunks stored: ${processed}`);

  // Verify
  try {
    const count = await sql`SELECT COUNT(*) as count FROM curriculum_embeddings`;
    console.log(`   🗄️  Total in DB: ${count[0].count}`);
  } catch (err) {
    console.log(`   ⚠️  Could not verify count: ${err.message}`);
  }
}

main().catch(console.error);
