const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Polyfills for pdfjs-dist
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrix {};
}
if (typeof globalThis.Path2D === 'undefined') {
  globalThis.Path2D = class Path2D {};
}

const sql = neon(process.env.DATABASE_URL);

const crypto = require('crypto');

function getEncKey() {
  const key = process.env.ADMIN_ENCRYPTION_KEY;
  if (!key || key.length !== 32) throw new Error('ADMIN_ENCRYPTION_KEY must be 32 characters');
  return Buffer.from(key);
}

function decryptKey(encrypted) {
  const [ivHex, data] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', getEncKey(), iv);
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Simple fallback to Gemini for extraction
async function getApiKey() {
  let apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith('AQ.')) { // likely invalid format in env
    try {
      const rows = await sql`SELECT key_encrypted FROM api_keys WHERE provider = 'gemini' AND is_active = true LIMIT 1`;
      if (rows.length > 0) {
        return decryptKey(rows[0].key_encrypted);
      }
    } catch(e) {
      console.warn("No se pudo obtener api_key de la BD:", e.message);
    }
  }
  return apiKey;
}

async function generateWithRotation(prompt, retries = 3) {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error("Falta GEMINI_API_KEY y no hay keys en BD.");
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });
  
  for (let i = 0; i < retries; i++) {
    try {
      // Unconditional sleep to avoid hitting the 5 RPM free tier limit
      console.log("    ⏳ Esperando 15s para respetar límite de cuota (5 RPM)...");
      await new Promise(res => setTimeout(res, 15000));
      
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (e) {
      if (e.status === 429 || e.message.includes('Quota exceeded') || e.message.includes('429')) {
        console.warn(`    ⚠️ Rate limit hit. Retrying in 60 seconds... (Intento ${i+1}/${retries})`);
        await new Promise(res => setTimeout(res, 60000));
      } else {
        throw e;
      }
    }
  }
  throw new Error("Maximum retries reached for generateContent");
}

const ALLOWED_FOLDERS = [
  'Lineamientos',
  'Ley Local - Ley Federal  - Ley General',
  'Ley Reglamentaria'
];

async function extractInfoFromText(text, filename) {
  const prompt = `
Eres un asistente experto en análisis legal y normativo para el sistema de educación pública en México.
Tengo el siguiente texto extraído de un documento PDF titulado "${filename}".

Tu tarea es extraer:
1. El título oficial del documento.
2. El tipo de documento (debe ser uno de: constitucion, ley_general, ley_local, reglamento, acuerdo, lineamiento, otro).
3. La fuente o fecha de publicación si está disponible.
4. Una lista de artículos o apartados relevantes, con su número y texto.

El formato de respuesta DEBE ser estrictamente JSON, sin markdown, con esta estructura:
{
  "titulo": "string",
  "tipo": "string",
  "fuente": "string",
  "articulos": [
    {
      "numero": "string",
      "texto": "string (resumen o texto completo)"
    }
  ]
}

Asegúrate de que los artículos extraídos sean los más relevantes para educación (ej. educación media superior, planeación, evaluación). 
Si el documento es muy corto, extrae los lineamientos principales.

Texto del documento (truncado a 30000 caracteres por límites):
${text.substring(0, 30000)}
  `;

  try {
    const jsonStr = await generateWithRotation(prompt);
    const cleanJson = jsonStr.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error(`Error al extraer información con Gemini para ${filename}:`, error.message);
    return null;
  }
}

async function processPdf(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  
  const workerPath = path.resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
  const normalizedPath = workerPath.replace(/\\/g, '/');
  const workerUrl = 'file://' + (normalizedPath.startsWith('/') ? normalizedPath : '/' + normalizedPath);
  
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const uint8Array = new Uint8Array(dataBuffer);

  const doc = await pdfjsLib.getDocument({
    data: uint8Array,
    password: '',
    useSystemFonts: false,
    disableFontFace: true,
    verbosity: 0,
  }).promise;

  let fullText = '';
  const maxPages = Math.min(doc.numPages, 100); 
  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map(item => ('str' in item ? item.str : ''))
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText.trim();
}

function findPdfs(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findPdfs(filePath, fileList);
    } else if (filePath.toLowerCase().endsWith('.pdf')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;

  console.log(`🚀 Iniciando ingesta de Normateca...`);
  if (isDryRun) console.log(`⚠️  Modo DRY-RUN activado. No se realizarán cambios en la base de datos.`);
  if (limit !== Infinity) console.log(`🛑 Límite establecido a ${limit} documentos.`);

  const baseDir = path.resolve('C:\\Secuencias_Didacticas\\documentos_referencia\\[08] Normateca');
  
  if (!fs.existsSync(baseDir)) {
    console.error(`❌ Directorio base no encontrado: ${baseDir}`);
    process.exit(1);
  }

  const subdirs = fs.readdirSync(baseDir).filter(f => fs.statSync(path.join(baseDir, f)).isDirectory());
  
  let processedCount = 0;
  let skippedCount = 0;

  for (const subdir of subdirs) {
    // Only process allowed folders
    if (!ALLOWED_FOLDERS.includes(subdir)) {
      console.log(`⏭️  Saltando directorio no permitido: ${subdir}`);
      continue;
    }

    const folderPath = path.join(baseDir, subdir);
    console.log(`\n📂 Procesando directorio: ${subdir}`);
    
    const pdfs = findPdfs(folderPath);
    
    for (const pdfPath of pdfs) {
      if (processedCount >= limit) {
        console.log(`\n🛑 Límite de ${limit} alcanzado. Deteniendo.`);
        return;
      }

      const filename = path.basename(pdfPath);
      console.log(`\n📄 Archivo: ${filename}`);
      
      const text = await processPdf(pdfPath);
      if (text.length < 100) {
        console.log(`  ⏭️  Saltando por ser muy corto (<100 chars).`);
        skippedCount++;
        continue;
      }

      console.log(`  🧠 Extrayendo metadata y artículos con IA...`);
      const extracted = await extractInfoFromText(text, filename);
      
      if (!extracted) {
        console.log(`  ❌ Falló la extracción para ${filename}.`);
        continue;
      }

      console.log(`  ✅ Extraído: "${extracted.titulo}" (${extracted.articulos.length} artículos)`);

      if (isDryRun) {
        console.log(`  [DRY-RUN] Simulación de inserción para "${extracted.titulo}".`);
      } else {
        // Upsert logic
        const existingDoc = await sql`SELECT id FROM normativa_documentos WHERE titulo = ${extracted.titulo} LIMIT 1`;
        let docId;

        if (existingDoc.length > 0) {
          docId = existingDoc[0].id;
          console.log(`  ♻️  Documento ya existe (id=${docId}), actualizando/insertando artículos...`);
        } else {
          // get current max orden_display
          const maxOrdenRes = await sql`SELECT COALESCE(MAX(orden_display), 0) as max_orden FROM normativa_documentos`;
          const nextOrden = parseInt(maxOrdenRes[0].max_orden, 10) + 1;

          const inserted = await sql`
            INSERT INTO normativa_documentos (titulo, tipo, fuente, vigente, orden_display)
            VALUES (${extracted.titulo}, ${extracted.tipo || 'otro'}, ${extracted.fuente || ''}, TRUE, ${nextOrden})
            RETURNING id
          `;
          docId = inserted[0].id;
          console.log(`  ➕ Documento insertado (id=${docId}).`);
        }

        // Upsert articles
        for (let i = 0; i < extracted.articulos.length; i++) {
          const art = extracted.articulos[i];
          const artExists = await sql`
            SELECT id FROM normativa_articulos WHERE documento_id = ${docId} AND numero = ${art.numero} LIMIT 1
          `;
          
          // Apply to everything for now as default
          const aplicable_a = ['pmc', 'paec', 'pips', 'planeacion'];
          
          if (artExists.length > 0) {
            await sql`
              UPDATE normativa_articulos
              SET texto = ${art.texto},
                  aplicable_a = ${aplicable_a},
                  orden_en_doc = ${i + 1}
              WHERE documento_id = ${docId} AND numero = ${art.numero}
            `;
            console.log(`     ♻️  Artículo actualizado: ${art.numero}`);
          } else {
            await sql`
              INSERT INTO normativa_articulos (documento_id, numero, texto, aplicable_a, orden_en_doc)
              VALUES (${docId}, ${art.numero}, ${art.texto}, ${aplicable_a}, ${i + 1})
            `;
            console.log(`     ➕ Artículo insertado: ${art.numero}`);
          }
        }
      }

      processedCount++;
    }
  }

  console.log(`\n🎉 Ingesta completada.`);
  console.log(`📊 Procesados: ${processedCount}`);
  console.log(`⏭️  Omitidos (muy cortos): ${skippedCount}`);
}

main().catch(err => {
  console.error("❌ Error no controlado:", err);
  process.exit(1);
});
