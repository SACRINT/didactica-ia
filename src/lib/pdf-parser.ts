import type { PdfParseResult } from '@/types/pdf-extraction';
import type { KeyActivity } from '@/types/planning';

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

  // ── STEP 2: Use Claude text API to structure the extracted text ───────────
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      success: false,
      confidence: 'failed',
      data: buildEmptyData(),
      rawText,
      errors: ['Error de configuración del servidor. Contacta al administrador.'],
    };
  }

  try {
    const structured = await structureWithClaude(rawText);
    return structured;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[pdf-parser] Claude structuring failed:', msg);

    // Return partial data — let user complete manually
    return {
      success: false,
      confidence: 'failed',
      data: buildEmptyData(),
      rawText,
      errors: ['No se pudieron estructurar los datos automáticamente. Por favor completa los campos manualmente.'],
    };
  }
}

async function extractTextWithPdfjs(buffer: Buffer): Promise<string> {
  // Dynamically import to avoid Next.js build issues with pdfjs worker
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  // Disable worker — required for Node.js / Vercel environment
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pdfjsLib as any).GlobalWorkerOptions = (pdfjsLib as any).GlobalWorkerOptions || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = '';

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

// ─── Claude text structuring ─────────────────────────────────────────────────

async function structureWithClaude(rawText: string): Promise<PdfParseResult> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Truncate text to ~6000 chars (first pages have the important info)
  const excerpt = rawText.slice(0, 6000);

  const prompt = `Eres un experto en programas de estudio del bachillerato mexicano (MCCEMS/DBEPA 2025-2026).

Analiza el siguiente texto extraído de un programa de estudios y extrae en JSON:

{
  "uacName": "Nombre completo de la UAC (Unidad de Aprendizaje Curricular) tal como aparece en el documento",
  "learningOutcome": "Resultado de aprendizaje completo (qué logrará el estudiante al finalizar la UAC)",
  "totalHours": número entero de horas totales de la UAC,
  "activities": [
    { "name": "Nombre de la Actividad Clave 1", "hours": número, "order": 1 },
    { "name": "Nombre de la Actividad Clave 2", "hours": número, "order": 2 }
  ],
  "evidences": ["evidencia o producto esperado 1", "evidencia 2"]
}

REGLAS:
- Copia el nombre de la UAC EXACTAMENTE como aparece (puede ser muy largo)
- Si hay múltiples UACs, extrae SOLO la primera que aparezca
- Si no encuentras un campo, usa null
- Las actividades clave son las grandes secciones del programa (usualmente 2-5)
- Responde SOLO con el JSON, sin markdown ni texto adicional

TEXTO DEL PROGRAMA:
${excerpt}`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');

  const cleanJson = content.text
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
