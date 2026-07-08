import type { PdfParseResult } from '@/types/pdf-extraction';
import type { KeyActivity } from '@/types/planning';
import path from 'path';

// Polyfills for browser-only globals required by pdfjs-dist v6 under Node/Vercel environments
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrix {} as any;
}
if (typeof globalThis.Path2D === 'undefined') {
  globalThis.Path2D = class Path2D {} as any;
}

/**
 * Two-step PDF extraction:
 * 1. pdfjs-dist  → extract raw text from PDF (handles owner-restricted SEP PDFs)
 * 2. Claude text → structure the raw text into UAC fields
 *
 * This is more reliable than using the Claude PDF document API because:
 * - Works with any Anthropic API key (free or paid)
 * - pdfjs can extract text even from "copy-restricted" PDFs
 * - Sending text to Claude is cheaper than sending the entire PDF as base64
 */
export async function parsePdfBuffer(buffer: Buffer): Promise<PdfParseResult> {
  const errors: string[] = [];

  // ── STEP 1: Extract raw text with pdfjs ──────────────────────────────────
  let rawText = '';
  try {
    rawText = await extractTextWithPdfjs(buffer);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error';
    console.error('[pdf-parser] pdfjs extraction failed:', msg);
    errors.push('No se pudo leer el PDF. El archivo puede estar dañado o con contraseña de apertura.');
  }

  if (!rawText || rawText.trim().length < 100) {
    return {
      success: false,
      confidence: 'failed',
      data: buildEmptyData(),
      rawText: '',
      errors: errors.length ? errors : [
        'El PDF no contiene texto extraíble (puede ser una imagen escaneada o estar protegido con contraseña de apertura). Por favor captura los datos manualmente.',
      ],
    };
  }

  // ── STEP 2: Use Gemini text API to structure the extracted text ───────────
  if (!process.env.GEMINI_API_KEY) {
    return {
      success: false,
      confidence: 'failed',
      data: buildEmptyData(),
      rawText,
      errors: ['Error de configuración del servidor (falta GEMINI_API_KEY). Contacta al administrador.'],
    };
  }

  try {
    const structured = await structureWithGemini(rawText);
    return structured;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[pdf-parser] Gemini structuring failed:', msg);

    // Return partial data — let user complete manually
    return {
      success: false,
      confidence: 'failed',
      data: buildEmptyData(),
      rawText,
      errors: [
        `No se pudieron estructurar los datos automáticamente: ${msg}. Por favor completa los campos manualmente.`,
      ],
    };
  }
}

async function extractTextWithPdfjs(buffer: Buffer): Promise<string> {
  // Dynamically import to avoid Next.js build issues with pdfjs worker
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  // Configure worker using a file:// URL scheme to satisfy Node.js ESM loader requirements
  const workerPath = path.resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
  const normalizedPath = workerPath.replace(/\\/g, '/');
  const workerUrl = 'file://' + (normalizedPath.startsWith('/') ? normalizedPath : '/' + normalizedPath);
  
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const uint8Array = new Uint8Array(buffer);

  const doc = await pdfjsLib.getDocument({
    data: uint8Array,
    // Empty password — bypasses owner restrictions without needing user password
    password: '',
    useSystemFonts: false,
    disableFontFace: true,
    // Suppress console spam from pdfjs
    verbosity: 0,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any).promise;

  let fullText = '';
  const maxPages = Math.min(doc.numPages, 60); // Cap at 60 pages
  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText.trim();
}

// ─── Gemini text structuring ─────────────────────────────────────────────────

async function structureWithGemini(rawText: string): Promise<PdfParseResult> {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

  // Truncate text to ~6000 chars (first pages have the important info)
  const excerpt = rawText.slice(0, 6000);

  const prompt = `Eres un experto en programas de estudio del bachillerato de la Nueva Escuela Mexicana en Puebla (MCCEMS/DBEPA).

Analiza el siguiente texto extraído de un programa de estudios oficial y extrae los datos en formato JSON exacto:

{
  "uacName": "Nombre completo de la UAC (Unidad de Aprendizaje Curricular) tal como aparece literalmente en el documento",
  "learningOutcome": "Resultado de aprendizaje completo tal como aparece en el documento",
  "totalHours": número entero de horas totales de la carga horaria de la UAC,
  "activities": [
    { "name": "Nombre literal de la Actividad Clave o del Propósito Formativo X", "hours": número de horas dosificadas, "order": 1 }
  ],
  "evidences": ["evidencia o producto esperado literal del programa"]
}

REGLAS ABSOLUTAS DE EXTRACCIÓN Y CALIDAD:
1. COPIA VERBATIM (LITERAL): Copia el nombre de la UAC, el Resultado de aprendizaje, los Propósitos Formativos / Actividades Clave y las Evidencias EXACTAMENTE palabra por palabra, tal como aparecen escritos en el documento original.
2. PROHIBIDO PARAFRASEAR: Queda estrictamente prohibido resumir, acortar, simplificar, reescribir, traducir o inventar palabras. El texto extraído debe ser idéntico al del PDF original.
3. DETECCIÓN DE ACTIVIDADES / PROPÓSITOS:
   - Si es una UAC de Formación Laboral, extrae las "Actividades Clave" verbatim.
   - Si es una UAC de Currículum Fundamental o Ampliado (como Pensamiento Matemático, Ciencias, Lengua, etc.), extrae cada uno de los "Propósitos formativos" literales (ej: "Aplica conceptos básicos de lógica matemática...", "Comprende el concepto de conteo...", etc.) que se listan en las tablas o secciones principales.
4. Si hay múltiples UACs o programas en el texto, extrae únicamente la información de la primera.
5. Responde exclusivamente con el JSON, sin agregar explicaciones ni markdown.

TEXTO DEL PROGRAMA:
${excerpt}`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const response = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  const text = response.response.text();
  if (!text) {
    throw new Error('Empty response from Gemini API');
  }

  const cleanJson = text
    .replace(/^```(?:json)?\n?/m, '')
    .replace(/\n?```$/m, '')
    .trim();

  const parsed = JSON.parse(cleanJson);

  const activities: KeyActivity[] = Array.isArray(parsed.activities)
    ? parsed.activities
        .filter((a: { name?: string }) => a?.name)
        .map((a: { name: string; hours?: number; order?: number }, i: number) => ({
          name: removeHyphens(String(a.name).trim()),
          hours: Number(a.hours) || Math.round((parsed.totalHours || 54) / 3),
          order: Number(a.order) || i + 1,
        }))
    : [];

  const finalActivities =
    activities.length > 0
      ? activities
      : [
          { name: '', hours: 18, order: 1 },
          { name: '', hours: 18, order: 2 },
          { name: '', hours: 18, order: 3 },
        ];

  const evidences = Array.isArray(parsed.evidences)
    ? parsed.evidences.filter((e: string) => e?.length > 3).slice(0, 8)
    : [];

  const data = {
    uacName: parsed.uacName ? removeHyphens(String(parsed.uacName).trim()) : '',
    learningOutcome: parsed.learningOutcome ? removeHyphens(String(parsed.learningOutcome).trim()) : '',
    totalHours: Number(parsed.totalHours) || 54,
    activities: finalActivities,
    evidences: evidences.map((e: string) => removeHyphens(e)),
    parseConfidence: 'high' as const,
  };

  const hasData = !!(data.uacName && data.totalHours > 0);

  return {
    success: hasData,
    confidence: hasData ? 'high' : 'low',
    data,
    rawText,
    errors: hasData
      ? []
      : ['Algunos datos no se pudieron extraer. Por favor revisa y completa los campos.'],
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildEmptyData() {
  return {
    uacName: '',
    learningOutcome: '',
    totalHours: 54,
    activities: [
      { name: '', hours: 18, order: 1 },
      { name: '', hours: 18, order: 2 },
      { name: '', hours: 18, order: 3 },
    ],
    evidences: [] as string[],
    parseConfidence: 'failed' as const,
  };
}

function removeHyphens(text: string): string {
  if (!text) return '';
  return text
    // Replace soft hyphens
    .replace(/\u00ad/g, '')
    // Replace standard hyphen followed by newline and optional spaces
    .replace(/([a-zA-ZáéíóúñÁÉÍÓÚÑ]+)-\s*[\r\n]\s*([a-zA-ZáéíóúñÁÉÍÓÚÑ]+)/g, '$1$2')
    // Replace standard hyphen followed by spaces
    .replace(/([a-zA-ZáéíóúñÁÉÍÓÚÑ]+)-\s+([a-zA-ZáéíóúñÁÉÍÓÚÑ]+)/g, '$1$2');
}
