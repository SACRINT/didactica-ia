import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env.local manually
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
if (!DB_URL) {
  console.error('❌ DATABASE_URL is not defined');
  process.exit(1);
}

const sql = neon(DB_URL);

const SEMESTER_MAP = {
  'primer': 1, 'segundo': 2, 'tercer': 3, 'cuarto': 4, 'quinto': 5, 'sexto': 6,
  '1er': 1, '2do': 2, '3er': 3, '4to': 4, '5to': 5, '6to': 6,
  'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5, 'vi': 6,
  '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6
};

// Base directories
const BASE_DIRS = [
  { path: 'c:/Secuencias_Didacticas/Curriculum Laboral BGE 2023', component: 'laboral' },
  { path: 'c:/Secuencias_Didacticas/Curriculum Fundamental', component: 'fundamental' },
  { path: 'c:/Secuencias_Didacticas/Curriculum Ampliado', component: 'ampliado' }
];

async function extractFullText(pdfPath) {
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
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str || '').join(' ');
      text += `=== PAGE ${i} ===\n${pageText}\n\n`;
    }
    return text;
  } catch (err) {
    console.error(`Error reading ${pdfPath}:`, err.message);
    return null;
  }
}

// Clean UAC Name
function cleanUacName(uacName, curriculumName) {
  if (!uacName) return '';
  let clean = uacName
    .replace(/^de la Salud\s+/i, '')
    .replace(/^Información general del Área de la Salud\s+/i, '')
    .replace(/^Información general del programa de\s+/i, '')
    .replace(/^UAC\s+/i, '')
    .replace(/UAC\s*$/i, '')
    .replace(/^[-\s]+/, '')
    .trim();
  
  if (curriculumName) {
    const escaped = curriculumName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`^${escaped}\\s+`, 'i');
    clean = clean.replace(regex, '').trim();
  }
  return clean;
}

// Heuristic parsing function
function parseUacsFromText(text, component, curriculumName) {
  const uacs = [];
  
  if (component === 'laboral') {
    // Laboral has UAC 1, UAC 2 headers
    const uacHeaderRegex = /Unidad de Aprendizaje Curricular\s+(\d+)\s+([a-zA-Záéíóúñ]+)\s+Semestre/gi;
    const matches = [];
    let match;
    while ((match = uacHeaderRegex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        uacNumber: parseInt(match[1], 10),
        semesterWord: match[2].toLowerCase(),
      });
    }

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const nextIndex = matches[i + 1] ? matches[i + 1].index : text.length;
      const uacBlock = text.substring(current.index, nextIndex);
      
      const semester = SEMESTER_MAP[current.semesterWord] || 3;
      
      const escapedCurriculum = curriculumName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const infoRegex = new RegExp(`(?:Información general del programa de|UAC\\s+Información general del programa de)\\s+${escapedCurriculum}\\s+(.*?)\\s+Actividad Clave 1`, 'i');
      
      let uacName = '';
      const infoMatch = uacBlock.match(infoRegex);
      if (infoMatch) {
        uacName = infoMatch[1].trim();
      } else {
        const simpleFallback = uacBlock.match(/Información general del programa de\s+.*?\s+(.*?)\s+Actividad Clave 1/i);
        if (simpleFallback) {
          uacName = simpleFallback[1].trim();
        } else {
          const finalMatch = uacBlock.match(/Unidad de Aprendizaje Curricular\s+\d+\s+[a-zA-Záéíóúñ]+\s+Semestre\s+UAC\s+(.*?)\s+Actividad Clave 1/i);
          if (finalMatch) {
            uacName = finalMatch[1].trim();
          }
        }
      }
      
      uacName = cleanUacName(uacName, curriculumName);
      
      // Parse activities
      const activities = [];
      const actRegex = /Actividad Clave\s+(\d+)[:\s]+(.*?)(?=\s*(?:Horas:|Actividad Clave\s+\d+|$))/gi;
      const actMatches = [...uacBlock.matchAll(actRegex)];
      actMatches.forEach((m, idx) => {
        const order = parseInt(m[1], 10);
        const name = m[2].replace(/Horas de Estudio:.*$/i, '').trim();
        
        let hours = 18;
        const followingText = uacBlock.substring(m.index + m[0].length, m.index + m[0].length + 100);
        const hoursMatch = followingText.match(/Horas[:\s]*(\d+)/i);
        if (hoursMatch) {
          hours = parseInt(hoursMatch[1], 10);
        }
        
        activities.push({ name, hours, order });
      });

      // Parse outcome
      let learningOutcome = '';
      const outcomeMatch = uacBlock.match(/Resultado de aprendizaje\s+Al finalizar la UAC el estudiante será capaz de:\s+(.*?)(?=\s*(?:\d+\.\s+|Actividad clave|Estrategia|$))/i);
      if (outcomeMatch) {
        learningOutcome = outcomeMatch[1].trim();
      }

      // Parse evidences
      const evidences = [];
      const evRegex = /(?:Evidencia[s]?|Producto[s]? esperado[s]?)[:\s]+(.*?)(?=\s*(?:Instrumento|Ponderación|Criterios|Fuentes|=== PAGE|$))/gi;
      const evMatch = uacBlock.match(evRegex);
      if (evMatch) {
        const evText = evMatch[0].replace(/^(?:Evidencia[s]?|Producto[s]? esperado[s]?)[:\s]+/i, '');
        const items = evText.split(/[,;]|\\b(?:y|e)\\b/).map(s => s.trim()).filter(s => s.length > 5);
        evidences.push(...items);
      }
      
      if (uacName && activities.length > 0) {
        uacs.push({
          uacName,
          semester,
          curriculumName,
          learningOutcome: learningOutcome || `Desarrollar competencias correspondientes a ${uacName}`,
          activities,
          evidences: evidences.length > 0 ? evidences.slice(0, 4) : ['Portafolio de evidencias', 'Proyecto integrador'],
          totalHours: activities.reduce((acc, a) => acc + a.hours, 0)
        });
      }
    }
  } else {
    // Fundamental/Ampliado
    // Typical headings: "2.1. Pensamiento Matemático I", "2.2. Pensamiento Matemático II", etc.
    const uacHeaderRegex = /2\.(\d+)\.\s+([a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+(?:I|II|III|IV|V|VI))\b/g;
    const matches = [];
    let match;
    while ((match = uacHeaderRegex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        num: parseInt(match[1], 10),
        subjectAndRoman: match[2].trim(),
      });
    }

    // Fallback if no 2.x header found
    if (matches.length === 0) {
      const fallbackRegex = /([a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+)\s+(I|II|III|IV|V|VI)\b/g;
      let matchFallback;
      while ((matchFallback = fallbackRegex.exec(text)) !== null) {
        const subject = matchFallback[1].trim();
        const roman = matchFallback[2].trim();
        if (['PENSAMIENTO', 'LENGUA', 'CULTURA', 'CIENCIAS', 'HUMANIDADES', 'INGLES', 'CONCIENCIA', 'HISTORICA', 'SOCIEMOCIONAL'].some(k => subject.toUpperCase().includes(k))) {
          matches.push({
            index: matchFallback.index,
            num: matches.length + 1,
            subjectAndRoman: `${subject} ${roman}`,
          });
        }
      }
    }

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const nextIndex = matches[i + 1] ? matches[i + 1].index : text.length;
      const uacBlock = text.substring(current.index, nextIndex);
      
      // Determine semester from Roman numeral
      const romanMatch = current.subjectAndRoman.match(/\b(I|II|III|IV|V|VI)\b/i);
      const roman = romanMatch ? romanMatch[1].toLowerCase() : 'i';
      const semester = SEMESTER_MAP[roman] || 1;
      
      const uacName = current.subjectAndRoman;
      
      // Activities (Bloques o Progresiones en currículum fundamental)
      // Usually listed as "Propósito formativo 1", "Propósito formativo 2" or "Metas..."
      const activities = [];
      const actRegex = /(?:Propósito formativo|Progresión|Metas?|Bloque)\s+(\d+)[:\s]+(.*?)(?=\s*(?:Horas:|Propósito|Progresión|Bloque|$))/gi;
      const actMatches = [...uacBlock.matchAll(actRegex)];
      actMatches.forEach((m, idx) => {
        const order = parseInt(m[1], 10);
        const name = m[2].replace(/Horas de Estudio:.*$/i, '').trim();
        activities.push({ name: name.substring(0, 120), hours: 18, order });
      });

      // Default activities if none found (e.g. Progresiones 1, 2, 3)
      if (activities.length === 0) {
        activities.push(
          { name: `Progresiones de aprendizaje bloque 1`, hours: 18, order: 1 },
          { name: `Progresiones de aprendizaje bloque 2`, hours: 18, order: 2 },
          { name: `Progresiones de aprendizaje bloque 3`, hours: 18, order: 3 }
        );
      }

      // Outcome
      let learningOutcome = '';
      const outcomeMatch = uacBlock.match(/(?:Propósito formativo|Resultado de aprendizaje|Propósito de la asignatura)[:\s]+(.*?)(?=\s*(?:\d+\.\s+|=== PAGE|$))/i);
      if (outcomeMatch) {
        learningOutcome = outcomeMatch[1].trim();
      }

      uacs.push({
        uacName,
        semester,
        curriculumName,
        learningOutcome: learningOutcome || `Desarrollar progresiones y metas de aprendizaje para ${uacName}`,
        activities,
        evidences: ['Portafolio de evidencias', 'Evaluación formativa', 'Proyecto integrador'],
        totalHours: activities.reduce((acc, a) => acc + a.hours, 0)
      });
    }
  }
  return uacs;
}

async function seed() {
  console.log('🚀 Starting Heuristics Seeding (Zero Credits Mode)...');
  
  // Find all PDF files
  const pdfFiles = [];
  for (const dirInfo of BASE_DIRS) {
    if (!fs.existsSync(dirInfo.path)) {
      console.warn(`Directory does not exist: ${dirInfo.path}`);
      continue;
    }
    const files = fs.readdirSync(dirInfo.path);
    for (const file of files) {
      if (file.toLowerCase().endsWith('.pdf') && !file.toUpperCase().includes('INFOGRAFIA')) {
        if (dirInfo.component === 'ampliado' && file.toUpperCase().includes('PAEC')) {
          continue;
        }
        pdfFiles.push({
          fullPath: path.join(dirInfo.path, file),
          filename: file,
          component: dirInfo.component
        });
      }
    }
  }

  console.log(`Found ${pdfFiles.length} PDFs. Starting text extraction...`);

  let count = 0;
  for (const pdf of pdfFiles) {
    const curriculumName = pdf.filename
      .replace(/_2024\.pdf$/i, '')
      .replace(/_BN\.pdf$/i, '')
      .replace(/vf_MCC_/i, '')
      .replace(/2025_MCC_/i, '')
      .replace(/2025_ /i, '')
      .replace(/_/g, ' ')
      .trim();

    let year = 2025;
    if (pdf.filename.includes('2023')) year = 2023;
    else if (pdf.filename.includes('2024')) year = 2024;
    else if (pdf.filename.includes('2025')) year = 2025;
    else if (pdf.filename.includes('2026')) year = 2026;

    console.log(`📄 Parsing: ${pdf.filename} (${curriculumName}, Year: ${year})...`);
    const text = await extractFullText(pdf.fullPath);
    if (!text) continue;

    const uacs = parseUacsFromText(text, pdf.component, curriculumName);
    console.log(`  ✓ Extracted ${uacs.length} UACs.`);

    for (const uac of uacs) {
      try {
        await sql`
          INSERT INTO programs_catalog (
            uac_name, semester, component, curriculum_name, year,
            total_hours, learning_outcome, activities, evidences
          )
          VALUES (
            ${uac.uacName},
            ${uac.semester},
            ${pdf.component},
            ${uac.curriculumName},
            ${year},
            ${uac.totalHours},
            ${uac.learningOutcome},
            ${JSON.stringify(uac.activities)},
            ${JSON.stringify(uac.evidences)}
          )
          ON CONFLICT (uac_name) DO UPDATE SET
            semester = EXCLUDED.semester,
            component = EXCLUDED.component,
            curriculum_name = EXCLUDED.curriculum_name,
            year = EXCLUDED.year,
            total_hours = EXCLUDED.total_hours,
            learning_outcome = EXCLUDED.learning_outcome,
            activities = EXCLUDED.activities,
            evidences = EXCLUDED.evidences
        `;
        count++;
      } catch (err) {
        console.error(`  ❌ Failed to save UAC ${uac.uacName}:`, err.message);
      }
    }
  }

  console.log(`\n🎉 Seeding completed successfully!`);
  console.log(`📊 Loaded ${count} program entries into Neon Database catalog.`);
}

seed().catch(console.error);
