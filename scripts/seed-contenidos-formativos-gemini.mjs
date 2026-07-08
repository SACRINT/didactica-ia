import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
const envLocalPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
  const envText = fs.readFileSync(envLocalPath, 'utf-8');
  envText.split('\n').forEach(line => {
    const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      process.env[key] = val;
    }
  });
}

const DB_URL = process.env.DATABASE_URL;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!DB_URL) {
  console.error('❌ DATABASE_URL is not defined in env.local');
  process.exit(1);
}
if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is not defined in env.local');
  process.exit(1);
}

const sql = neon(DB_URL);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const BASE_DIRS = [
  { path: 'c:/Secuencias_Didacticas/Curriculum Fundamental', component: 'fundamental' },
  { path: 'c:/Secuencias_Didacticas/Curriculum Ampliado', component: 'ampliado' }
];

async function extractPagesText(pdfPath, startPage, endPage) {
  try {
    const buffer = fs.readFileSync(pdfPath);
    const uint8Array = new Uint8Array(buffer);
    const doc = await pdfjsLib.getDocument({
      data: uint8Array,
      password: '',
      useSystemFonts: false,
      disableFontFace: true,
      verbosity: 0,
    }).promise;

    let text = '';
    const actualEndPage = Math.min(doc.numPages, endPage);
    const actualStartPage = Math.max(1, Math.min(startPage, actualEndPage));
    
    for (let i = actualStartPage; i <= actualEndPage; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => ('str' in item ? item.str : '')).join(' ');
      text += `=== PAGE ${i} ===\n${pageText}\n\n`;
    }
    return { text, numPages: doc.numPages };
  } catch (err) {
    console.error(`Error reading pages ${startPage}-${endPage} from ${pdfPath}:`, err.message);
    return null;
  }
}

// Función auxiliar para reintentar la llamada en caso de error de cuota (429 / 503)
async function generateWithRetry(model, prompt, maxRetries = 5) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const response = await model.generateContent(prompt);
      return response.response.text();
    } catch (err) {
      attempt++;
      const isRateLimit = err.message.includes('429') || err.message.includes('Quota exceeded') || err.message.includes('503') || err.message.includes('high demand');
      if (isRateLimit && attempt < maxRetries) {
        console.warn(`  ⚠️ Rate limit detectado (Intento ${attempt}/${maxRetries}). Durmiendo 30 segundos antes de reintentar...`);
        await new Promise(r => setTimeout(r, 30000));
      } else {
        throw err;
      }
    }
  }
  throw new Error('Número máximo de reintentos alcanzado.');
}

async function main() {
  console.log('🚀 Iniciando extracción de Propósitos y Contenidos Formativos con reintentos y lógica de bloques numerados...');

  // 1. Obtener los programas no-laborales de la BD
  const uacs = await sql`
    SELECT id, uac_name, component, semester
    FROM programs_catalog
    WHERE component <> 'laboral'
    ORDER BY semester, uac_name;
  `;
  console.log(`Encontradas ${uacs.length} UACs no-laborales en la base de datos.`);

  // 2. Encontrar todos los PDFs disponibles
  const pdfs = [];
  for (const dir of BASE_DIRS) {
    if (!fs.existsSync(dir.path)) continue;
    const files = fs.readdirSync(dir.path);
    for (const f of files) {
      if (f.toLowerCase().endsWith('.pdf') && !f.toUpperCase().includes('INFOGRAFIA')) {
        pdfs.push({
          fullPath: path.join(dir.path, f),
          filename: f,
          component: dir.component
        });
      }
    }
  }
  console.log(`Encontrados ${pdfs.length} PDFs de planes de estudio en disco.`);

  for (const uac of uacs) {
    console.log(`\n────────────────────────────────────────────────────────────────`);
    console.log(`UAC: "${uac.uac_name}" (Semestre: ${uac.semester}, ${uac.component})`);

    // Intentar emparejar la UAC con un PDF
    const normUacName = uac.uac_name.toLowerCase()
      .replace(/ i+$/g, '') // Quitar números romanos del final
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const matchedPdf = pdfs.find(p => {
      const normFilename = p.filename.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const cleanUac = normUacName.replace(/( i| ii| iii| iv| v| vi)$/gi, '').trim();
      return normFilename.includes(cleanUac) || cleanUac.split(' ').every(word => normFilename.includes(word));
    });

    if (!matchedPdf) {
      console.warn(`⚠️ No se encontró PDF coincidente para la UAC: ${uac.uac_name}`);
      continue;
    }

    console.log(`✓ Coincidencia de PDF: ${matchedPdf.filename}`);

    // Extraer páginas (páginas 1 a 28 para asegurar abarcar las tablas didácticas)
    const extract = await extractPagesText(matchedPdf.fullPath, 1, 28);
    if (!extract) {
      console.error(`❌ Error al extraer texto de ${matchedPdf.filename}`);
      continue;
    }

    // Pedirle a Gemini estructurar los propósitos y temas
    const prompt = `Analiza el siguiente fragmento del programa de estudios oficial para la UAC "${uac.uac_name}" (Semestre ${uac.semester}).

Identifica y extrae:
1. El nombre exacto de CADA uno de los Propósitos Formativos de la asignatura (los bloques o propósitos principales).
2. Para cada Propósito Formativo, extrae verbatim la lista de todos sus Contenidos Formativos (temas detallados, conceptos clave o contenidos específicos asociados a dicho propósito).
3. Estima el número de horas sugerido para cada propósito si viene indicado, o repártelo proporcionalmente si el total es de 54 o 72 horas.

Responde ÚNICAMENTE con un JSON en el siguiente formato, sin markdown ni explicaciones:
[
  {
    "proposito": "Nombre literal verbatim y completo del Propósito Formativo X",
    "hours": 11,
    "order": 1,
    "contenidos": [
      "Contenido formativo tema 1",
      "Contenido formativo tema 2"
    ]
  }
]

REGLAS ABSOLUTAS DE EXTRACCIÓN:
- IDENTIFICACIÓN DE PROPÓSITOS: Los propósitos formativos verdaderos siempre empiezan con un número indicativo de orden (ej: "1 Aplica conceptos...", "2 Comprende el...", "3 Analiza...") en las tablas del programa. NO extraigas títulos generales de secciones o temas de la tabla como "Pensamiento aritmético", "Nombre de la asignatura" o "Meta educativa".
- COPIA EXACTA VERBATIM: Tanto el "proposito" como los "contenidos" individuales deben ser copiados EXACTAMENTE, letra por letra, tal como aparecen en el documento original. PROHIBIDO parafrasear, acortar, resumir o editar.
- Si no encuentras los contenidos formativos (temas específicos) para un propósito formativo en este fragmento, deja el arreglo de "contenidos" vacío para ese elemento.

TEXTO DEL PROGRAMA:
${extract.text.slice(0, 15000)}`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    try {
      console.log('  🧠 Analizando con Gemini (con reintentos si hay cuota)...');
      const responseText = await generateWithRetry(model, prompt);
      const cleanJson = responseText
        .replace(/^```(?:json)?\n?/m, '')
        .replace(/\n?```$/m, '')
        .trim();

      const parsedData = JSON.parse(cleanJson);
      
      // Filtrar objetos vacíos o erróneos si Gemini extrajo algo que no correspondía a un propósito
      const validData = parsedData.filter(item => 
        item.proposito && 
        !item.proposito.toLowerCase().includes('tabla') &&
        !item.proposito.toLowerCase().includes('meta educativa') &&
        item.proposito.trim().length > 15
      );

      console.log(`  ✓ Extraídos ${validData.length} propósitos válidos con sus temas.`);

      if (validData.length === 0) {
        console.warn(`  ⚠️ Advertencia: No se encontraron propósitos válidos para "${uac.uac_name}". Saltando guardado.`);
        continue;
      }

      // Mapear al formato 'activities' esperado en el catálogo
      const activities = validData.map((item, idx) => ({
        name: item.proposito,
        hours: item.hours || Math.round(72 / validData.length),
        order: item.order || (idx + 1)
      }));

      // Guardar en la base de datos
      await sql`
        UPDATE programs_catalog
        SET 
          activities = ${JSON.stringify(activities)},
          contenidos_formativos = ${JSON.stringify(validData)}
        WHERE id = ${uac.id}::uuid
      `;
      console.log(`  💾 Base de datos actualizada con éxito para: "${uac.uac_name}"`);

    } catch (err) {
      console.error(`  ❌ Error al procesar detalles con Gemini en "${uac.uac_name}":`, err.message);
    }

    // Espera normal entre llamadas de 6 segundos para evitar el rate limit de 15 RPM
    await new Promise(r => setTimeout(r, 6000));
  }

  console.log('\n🎉 Proceso de migración y siembra finalizado.');
}

main().catch(err => {
  console.error('Global script crash:', err);
});
