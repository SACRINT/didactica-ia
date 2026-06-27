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

// Remove hyphens used for syllable splitting at line ends or within words
function removeHyphens(text) {
  if (!text) return '';
  return text
    // Replace soft hyphens
    .replace(/\u00ad/g, '')
    // Replace standard hyphen followed by newline and optional spaces
    .replace(/([a-zA-ZáéíóúñÁÉÍÓÚÑ]+)-\s*[\r\n]\s*([a-zA-ZáéíóúñÁÉÍÓÚÑ]+)/g, '$1$2')
    // Replace standard hyphen followed by spaces
    .replace(/([a-zA-ZáéíóúñÁÉÍÓÚÑ]+)-\s+([a-zA-ZáéíóúñÁÉÍÓÚÑ]+)/g, '$1$2');
}

// Extract only the purpose statement (which typically ends with a period before contents list)
function extractPurposeOnly(text) {
  if (!text) return '';
  // Find a period followed by space and an uppercase letter, or end of string
  // Ensure we don't split on decimal numbers like "1.5" or common abbreviations
  const match = text.match(/^([\s\S]+?\.)(?=\s+[A-ZÁÉÍÓÚÑ]|$)/);
  if (match) {
    return match[1].trim();
  }
  return text;
}

// Convert accented characters to unaccented counterparts while preserving indices
function cleanAccentsPreserveLength(str) {
  if (!str) return '';
  const map = {
    'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
    'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
    'ñ': 'n', 'Ñ': 'N', 'ü': 'u', 'Ü': 'U'
  };
  return str.split('').map(c => map[c] || c).join('');
}

// Clean UAC Name
function cleanUacName(uacName, curriculumName) {
  if (!uacName) return '';
  let clean = uacName
    .replace(/^UAC\s+/i, '')
    .replace(/Información general del programa (de\s+)?/i, '')
    .replace(/Información general del Área (de\s+)?/i, '');
  
  if (curriculumName) {
    const cleanNorm = cleanAccentsPreserveLength(clean.toLowerCase());
    const currNorm = cleanAccentsPreserveLength(curriculumName.toLowerCase());
    if (cleanNorm.startsWith(currNorm)) {
      clean = clean.slice(currNorm.length).trim();
    }
    
    // Also clean repeated suffix of curriculum name (e.g. "la Salud" or "Sostenible de Traspatio")
    const currWords = curriculumName.split(/\s+/);
    for (let i = 0; i < currWords.length; i++) {
      const suffix = currWords.slice(i).join(' ');
      const suffixNorm = cleanAccentsPreserveLength(suffix.toLowerCase());
      const currentCleanNorm = cleanAccentsPreserveLength(clean.toLowerCase());
      if (suffixNorm.length > 3 && currentCleanNorm.startsWith(suffixNorm)) {
        clean = clean.slice(suffix.length).trim();
        break;
      }
    }
  }
  
  clean = clean.replace(/^(?:de|y|e)\s+/i, '').trim();
  clean = removeHyphens(clean);
  clean = clean.replace(/\s+/g, ' ').trim();
  return clean;
}

// Clean greedy UAC subject name by matching up to the first Roman numeral
function cleanUacSubjectName(name) {
  const match = name.match(/^([a-zA-ZáéíóúñüÁÉÍÓÚÑÜ\s,]+?\b(?:I|II|III|IV|V|VI))\b/);
  if (match) {
    return match[1].replace(/\s+/g, ' ').trim();
  }
  return name.replace(/\s+/g, ' ').trim();
}

// Extract total hours from UAC block text
function extractTotalHours(text) {
  const patterns = [
    /(?:Carga Horaria|Horas totales|Total de horas|Carga horaria total)[:\s]*(\d+)\s*(?:horas?)?/i,
    /(\d+)\s*horas?\s*(?:totales?|en total|por semestre)/i,
    /Horas\/semana:\s*(\d+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const val = parseInt(match[1], 10);
      if (pattern.source.includes('semana')) {
        return val * 18; // 18 weeks per semester
      }
      if (val >= 10 && val <= 200) return val;
    }
  }
  return 54; // Default fallback
}

// Heuristic parsing function
function parseUacsFromText(text, component, curriculumName) {
  const uacs = [];
  
  // Educational verbs to filter out false positives
  const VERBS = [
    'Identifica', 'Conoce', 'Analiza', 'Utiliza', 'Reconoce', 'Valora', 'Distingue', 'Aplica', 
    'Comprende', 'Examina', 'Evalúa', 'Diseña', 'Establece', 'Caracteriza', 'Determina', 
    'Describe', 'Sistematiza', 'Explica', 'Compara', 'Reflexiona', 'Argumenta', 'Participa', 
    'Propone', 'Colabora', 'Asume', 'Desarrolla', 'Construye', 'Promueve', 'Estructura',
    'Interpreta', 'Deduce', 'Indaga', 'Cuestiona', 'Individua', 'Relaciona', 'Diferencia',
    'Expresa', 'Redacta', 'Lee', 'Comunica', 'Interactúa', 'Produce',
    'Problematiza', 'Plantea', 'Elabora', 'Procesa', 'Discute', 'Formula', 'Integra',
    'Fortalece', 'Representa', 'Revisa', 'Gráfica', 'Observa', 'Estudia', 'Entiende',
    'Investiga', 'Practica', 'Selecciona', 'Extrae', 'Sigue', 'Solicita', 'Hace',
    'Habla', 'Pregunta', 'Consolida', 'Comparte', 'Pide', 'Relata', 'Cuenta', 'Explora',
    'Narra', 'Escribe', 'Reescribe', 'Impulsa', 'Ejerce', 'Genera', 'Recrea', 'Experimenta'
  ];
  
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
      
      const normText = cleanAccentsPreserveLength(text);
      const normCurriculumName = cleanAccentsPreserveLength(curriculumName);
      const escapedCurriculum = normCurriculumName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const infoRegex = new RegExp(`(?:Información general del programa de|UAC\\s+Información general del programa de)\\s+${escapedCurriculum}\\s+(.*?)\\s+Actividad Clave 1`, 'i');
      
      const normUacBlock = normText.substring(current.index, nextIndex);
      
      let uacNameRaw = '';
      const infoMatch = normUacBlock.match(infoRegex);
      if (infoMatch) {
        const offset = infoMatch[0].indexOf(infoMatch[1]);
        const matchStart = infoMatch.index + offset;
        const matchEnd = matchStart + infoMatch[1].length;
        uacNameRaw = uacBlock.substring(matchStart, matchEnd).trim();
      } else {
        const simpleFallback = uacBlock.match(/Información general del programa de\s+.*?\s+(.*?)\s+Actividad Clave 1/i);
        if (simpleFallback) {
          uacNameRaw = simpleFallback[1].trim();
        } else {
          const finalMatch = uacBlock.match(/Unidad de Aprendizaje Curricular\s+\d+\s+[a-zA-Záéíóúñ]+\s+Semestre\s+UAC\s+(.*?)\s+Actividad Clave 1/i);
          if (finalMatch) {
            uacNameRaw = finalMatch[1].trim();
          }
        }
      }
      
      const uacName = cleanUacName(uacNameRaw, curriculumName);
      
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
        
        activities.push({ name: removeHyphens(name), hours, order });
      });

      // Parse outcome
      let learningOutcome = '';
      const outcomeMatch = uacBlock.match(/Resultado de aprendizaje\s+Al finalizar la UAC el estudiante será capaz de:\s+(.*?)(?=\s*(?:\d+\.\s+|Actividad clave|Estrategia|$))/i);
      if (outcomeMatch) {
        learningOutcome = removeHyphens(outcomeMatch[1].trim());
      }

      // Parse evidences
      const evidences = [];
      const evRegex = /(?:Evidencia[s]?|Producto[s]? esperado[s]?)[:\s]+(.*?)(?=\s*(?:Instrumento|Ponderación|Criterios|Fuentes|=== PAGE|$))/gi;
      const evMatch = uacBlock.match(evRegex);
      if (evMatch) {
        const evText = evMatch[0].replace(/^(?:Evidencia[s]?|Producto[s]? esperado[s]?)[:\s]+/i, '');
        const items = evText.split(/[,;]|\\b(?:y|e)\\b/).map(s => removeHyphens(s.trim())).filter(s => s.length > 5);
        evidences.push(...items);
      }
      
      if (uacName && activities.length > 0) {
        uacs.push({
          uacName: removeHyphens(uacName),
          semester,
          component: 'laboral',
          curriculumName,
          learningOutcome: learningOutcome || `Desarrollar competencias correspondientes a ${uacName}`,
          activities,
          evidences: evidences.length > 0 ? evidences.slice(0, 4) : ['Portafolio de evidencias', 'Proyecto integrador'],
          totalHours: activities.reduce((acc, a) => acc + a.hours, 0)
        });
      }
    }
  } else if (component === 'ampliado') {
    // Typical headings: "3.1. Ámbito: Práctica y Colaboración Ciudadana", etc.
    const uacHeaderRegex = /3\.(\d+)\.\s+Ámbito:\s*(.*?)(?=\s*(?:Meta educativa|Tabla \d+|=== PAGE|$))/gi;
    const matches = [];
    let match;
    while ((match = uacHeaderRegex.exec(text)) !== null) {
      const subjectAndRoman = match[2].trim();
      if (subjectAndRoman.length <= 60 && !/\d/.test(subjectAndRoman)) {
        matches.push({
          index: match.index,
          num: parseInt(match[1], 10),
          subjectAndRoman,
        });
      }
    }

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      let nextIndex = matches[i + 1] ? matches[i + 1].index : text.length;
      if (!matches[i + 1]) {
        // Truncate last block at section 4
        const lowerText = text.substring(current.index).toLowerCase();
        const idx = lowerText.indexOf('4.1.');
        if (idx !== -1) {
          nextIndex = current.index + idx;
        } else {
          nextIndex = Math.min(current.index + 8000, text.length);
        }
      }
      
      const uacBlock = text.substring(current.index, nextIndex);
      const uacName = `Ámbito de la Formación Socioemocional: ${current.subjectAndRoman}`;
      
      // Ampliado UACs can be chosen in any semester, we register it as 1 by default
      const semester = 1;

      const activities = [];
      const purposesRegex = /\b([1-8])\s+([A-ZÁÉÍÓÚÑ][\s\S]+?)(?=\s*(?:\b[1-8]\s+[A-ZÁÉÍÓÚÑ]|\bMeta\b|\bOrientaciones\b|=== PAGE|$))/g;
      const actMatches = [...uacBlock.matchAll(purposesRegex)];
      const seen = new Set();
      
      actMatches.forEach((m) => {
        const order = parseInt(m[1], 10);
        const name = m[2].trim().replace(/\s+/g, ' ');
        const firstWordMatch = name.match(/^([a-zA-ZáéíóúñÁÉÍÓÚÑ]+)/);
        if (!firstWordMatch) return;
        const firstWord = firstWordMatch[1];
        const isEducational = VERBS.some(v => firstWord.toLowerCase() === v.toLowerCase());
        const isFalsePositive = [
          'MARCO CURRICULAR', 'MODELO EDUCATIVO', 'SECRETARIO', 'COORDINADORA', 
          'DIRECCIÓN DE', 'SISTEMA NACIONAL', 'PRIMERA EDICIÓN', 'ÍNDICE', 
          'HORAS/SEMANA', 'HORAS SEMANA', 'CRITERIOS PARA', 'GLOSARIO', 'BIBLIOGRAFÍA',
          'DIRECTORIO', 'PROGRAMAS DE ESTUDIO', 'CURRÍCULUM', 'SUBSECRETARIA',
          'Bachillerato', 'Secretaría de'
        ].some(word => name.toUpperCase().includes(word.toUpperCase()));
        
        const cleanName = removeHyphens(extractPurposeOnly(name));
        if (isEducational && cleanName.length > 25 && !isFalsePositive && !seen.has(cleanName)) {
          seen.add(cleanName);
          activities.push({ name: cleanName.substring(0, 250), order });
        }
      });

      const totalHours = 36;
      const count = activities.length;
      if (count > 0) {
        const baseHours = Math.floor(totalHours / count);
        const remainder = totalHours % count;
        activities.forEach((act, idx) => {
          act.hours = baseHours + (idx < remainder ? 1 : 0);
        });
      }

      uacs.push({
        uacName: removeHyphens(uacName),
        semester,
        component,
        curriculumName,
        learningOutcome: `Desarrollar capacidades socioemocionales en el ámbito de ${current.subjectAndRoman}`,
        activities,
        evidences: ['Bitácora de registro', 'Autoevaluación formativa', 'Proyecto comunitario'],
        totalHours
      });
    }
  } else {
    // Fundamental
    // Typical headings: "2.1. Pensamiento Matemático I", "2.2. Pensamiento Matemático II", etc.
    const uacHeaderRegex = /2\.(\d+)\.\s+([a-zA-ZáéíóúñüÁÉÍÓÚÑÜ\s,]+(?:I|II|III|IV|V|VI))\b/g;
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
      let nextIndex = matches[i + 1] ? matches[i + 1].index : text.length;
      if (!matches[i + 1]) {
        const lowerText = text.substring(current.index).toLowerCase();
        const truncateKeywords = [
          '3. orientaciones',
          '3.1. planeacion',
          'ejemplo de planeacion',
          'para abordar los propositos',
          'sugerencias didacticas'
        ];
        let truncateOffset = -1;
        for (const kw of truncateKeywords) {
          const idx = lowerText.indexOf(kw);
          if (idx !== -1 && (truncateOffset === -1 || idx < truncateOffset)) {
            truncateOffset = idx;
          }
        }
        if (truncateOffset !== -1) {
          nextIndex = current.index + truncateOffset;
        } else {
          nextIndex = Math.min(current.index + 8000, text.length);
        }
      }
      const uacBlock = text.substring(current.index, nextIndex);
      
      // Extract semester from text
      let semester = 1;
      const textNorm = cleanAccentsPreserveLength(uacBlock.toLowerCase());
      if (textNorm.includes('primer semestre') || textNorm.includes('1er semestre')) semester = 1;
      else if (textNorm.includes('segundo semestre') || textNorm.includes('2do semestre')) semester = 2;
      else if (textNorm.includes('tercer semestre') || textNorm.includes('3er semestre')) semester = 3;
      else if (textNorm.includes('cuarto semestre') || textNorm.includes('4to semestre')) semester = 4;
      else if (textNorm.includes('quinto semestre') || textNorm.includes('5to semestre')) semester = 5;
      else if (textNorm.includes('sexto semestre') || textNorm.includes('6to semestre')) semester = 6;
      else {
        // Fallback to Roman numeral if not found in text
        const romanMatch = current.subjectAndRoman.match(/\b(I|II|III|IV|V|VI)\b/i);
        const roman = romanMatch ? romanMatch[1].toLowerCase() : 'i';
        semester = SEMESTER_MAP[roman] || 1;
      }
      
      const uacName = cleanUacSubjectName(current.subjectAndRoman);
      
      // Activities (Propósitos y contenidos formativos)
      const activities = [];
      
      const purposesRegex = /\b([1-8])\s+([A-ZÁÉÍÓÚÑ][\s\S]+?)(?=\s*(?:\b[1-8]\s+[A-ZÁÉÍÓÚÑ]|\bMeta\b|\bOrientaciones\b|=== PAGE|$))/g;
      const actMatches = [...uacBlock.matchAll(purposesRegex)];
      const seen = new Set();
      
      actMatches.forEach((m) => {
        const order = parseInt(m[1], 10);
        const name = m[2].trim().replace(/\s+/g, ' ');
        
        // Find the first word
        const firstWordMatch = name.match(/^([a-zA-ZáéíóúñÁÉÍÓÚÑ]+)/);
        if (!firstWordMatch) return;
        const firstWord = firstWordMatch[1];
        
        // Check if first word is an educational verb
        const isEducational = VERBS.some(v => firstWord.toLowerCase() === v.toLowerCase());
        
        const isFalsePositive = [
          'MARCO CURRICULAR', 'MODELO EDUCATIVO', 'SECRETARIO', 'COORDINADORA', 
          'DIRECCIÓN DE', 'SISTEMA NACIONAL', 'PRIMERA EDICIÓN', 'ÍNDICE', 
          'HORAS/SEMANA', 'HORAS SEMANA', 'CRITERIOS PARA', 'GLOSARIO', 'BIBLIOGRAFÍA',
          'DIRECTORIO', 'PROGRAMAS DE ESTUDIO', 'CURRÍCULUM', 'SUBSECRETARIA',
          'Bachillerato', 'Secretaría de'
        ].some(word => name.toUpperCase().includes(word.toUpperCase()));
        
        const cleanName = removeHyphens(extractPurposeOnly(name));
        if (isEducational && cleanName.length > 25 && !isFalsePositive && !seen.has(cleanName)) {
          seen.add(cleanName);
          activities.push({ name: cleanName.substring(0, 250), hours: 18, order });
        }
      });

      // Sort by order
      activities.sort((a, b) => a.order - b.order);

      // Fallback activities are not added here to allow correct deduplication.
      // They are added at the end before database insertion if still empty.

      // Distribute total UAC hours among purposes
      const totalHours = extractTotalHours(uacBlock);
      const count = activities.length;
      if (count > 0) {
        const baseHours = Math.floor(totalHours / count);
        const remainder = totalHours % count;
        activities.forEach((act, idx) => {
          act.hours = baseHours + (idx < remainder ? 1 : 0);
        });
      }

      // Outcome
      let learningOutcome = '';
      const outcomeMatch = uacBlock.match(/(?:Propósito formativo|Resultado de aprendizaje|Propósito de la asignatura)[:\s]+(.*?)(?=\s*(?:\d+\.\s+|=== PAGE|$))/i);
      if (outcomeMatch) {
        learningOutcome = removeHyphens(outcomeMatch[1].trim());
      }

      if (activities.length > 0) {
        uacs.push({
          uacName: removeHyphens(uacName),
          semester,
          component,
          curriculumName,
          learningOutcome: removeHyphens(learningOutcome) || `Desarrollar propósitos y contenidos formativos para ${uacName}`,
          activities,
          evidences: ['Portafolio de evidencias', 'Evaluación formativa', 'Proyecto integrador'],
          totalHours
        });
      }
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

  // Accumulate parsed UACs in a dictionary to prevent duplicates and keep best match
  const uacDict = {};
  
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
    console.log(`  ✓ Extracted ${uacs.length} UAC blocks.`);

    for (const uac of uacs) {
      const key = uac.uacName;
      const existing = uacDict[key];
      // Keep if not exists, or if new has more activities/purposes
      if (!existing || uac.activities.length > existing.activities.length) {
        uacDict[key] = { ...uac, year };
      }
    }
  }

  console.log(`🧹 Clearing old catalog entries from Neon Database...`);
  await sql`DELETE FROM programs_catalog`;

  let count = 0;
  for (const key of Object.keys(uacDict)) {
    const uac = uacDict[key];
    
    // Add fallback activities if none were parsed
    if (uac.activities.length === 0) {
      const actCount = 3;
      const baseHours = Math.floor(uac.totalHours / actCount);
      const remainder = uac.totalHours % actCount;
      const defaultName = uac.component === 'laboral' 
        ? 'Actividad Clave' 
        : 'Propósito y Contenido formativo';
      
      for (let idx = 0; idx < actCount; idx++) {
        uac.activities.push({
          name: `${defaultName} bloque ${idx + 1}`,
          hours: baseHours + (idx < remainder ? 1 : 0),
          order: idx + 1
        });
      }
    }

    try {
      await sql`
        INSERT INTO programs_catalog (
          uac_name, semester, component, curriculum_name, year,
          total_hours, learning_outcome, activities, evidences
        )
        VALUES (
          ${uac.uacName},
          ${uac.semester},
          ${uac.component},
          ${uac.curriculumName},
          ${uac.year},
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

  console.log(`\n🎉 Seeding completed successfully!`);
  console.log(`📊 Loaded ${count} program entries into Neon Database catalog.`);
}

seed().catch(console.error);
