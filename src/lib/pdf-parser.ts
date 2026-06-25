import type { PdfParseResult } from '@/types/pdf-extraction';
import type { KeyActivity } from '@/types/planning';

/**
 * Parses a PDF buffer and extracts didactic planning data.
 * Uses heuristic text patterns to find UAC name, learning outcome, activities, hours.
 * Always returns a result — even on failure, returns empty fields with confidence='failed'.
 */
export async function parsePdfBuffer(buffer: Buffer): Promise<PdfParseResult> {
  const errors: string[] = [];
  let rawText = '';

  try {
    // Dynamically import pdf-parse (server-side only, handles CJS/ESM)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string; numpages: number }>;
    const data = await pdfParse(buffer);
    rawText = data.text;
  } catch (err) {
    errors.push('No se pudo leer el PDF. El archivo puede estar dañado o protegido.');
    return {
      success: false,
      confidence: 'failed',
      data: {},
      rawText: '',
      errors,
    };
  }

  if (!rawText || rawText.trim().length < 100) {
    errors.push('El PDF parece estar escaneado como imagen. Por favor capture los datos manualmente.');
    return {
      success: false,
      confidence: 'failed',
      data: { rawText },
      rawText,
      errors,
    };
  }

  // ── Extraction heuristics ──────────────────────────────────────────────────
  const text = rawText;

  // Extract UAC name
  const uacName = extractUacName(text);

  // Extract learning outcome
  const learningOutcome = extractLearningOutcome(text);

  // Extract total hours
  const totalHours = extractTotalHours(text);

  // Extract key activities
  const activities = extractActivities(text);

  // Extract suggested evidences
  const evidences = extractEvidences(text);

  // Calculate confidence based on what we found
  const foundFields = [uacName, learningOutcome, totalHours, activities.length > 0].filter(Boolean).length;
  let confidence: PdfParseResult['confidence'];
  if (foundFields >= 4) confidence = 'high';
  else if (foundFields >= 2) confidence = 'medium';
  else if (foundFields >= 1) confidence = 'low';
  else confidence = 'failed';

  if (foundFields < 4) {
    errors.push('Algunos campos no se pudieron extraer automáticamente. Por favor revisa y completa los datos.');
  }

  return {
    success: confidence !== 'failed',
    confidence,
    data: {
      uacName: uacName || '',
      learningOutcome: learningOutcome || '',
      totalHours: totalHours || 54,
      activities,
      evidences,
      rawText,
      parseConfidence: confidence,
    },
    rawText,
    errors,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractUacName(text: string): string | null {
  // Look for patterns like "UAC" or "Unidad de Aprendizaje" followed by name
  const patterns = [
    /(?:Unidad de Aprendizaje Curricular|UAC)[:\s]+([^\n]{10,120})/i,
    /(?:Asignatura|Materia)[:\s]+([^\n]{10,120})/i,
    /(?:Nombre de la UAC)[:\s]+([^\n]{10,120})/i,
    // First bold-like heading at the start
    /^([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s,]+(?:de|y|en)\s+[a-záéíóúñ\s,]{5,})/m,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim().replace(/\s+/g, ' ');
  }
  return null;
}

function extractLearningOutcome(text: string): string | null {
  const patterns = [
    /(?:Resultado de Aprendizaje|Resultado de aprendizaje)[:\s]+([^\n]{20,300})/i,
    /(?:Al finalizar|El estudiante|La\(el\) estudiante)[^.]{0,20}(?:podrá|será capaz de|logrará)([^.]{20,300}\.)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim().replace(/\s+/g, ' ');
  }
  return null;
}

function extractTotalHours(text: string): number | null {
  const patterns = [
    /(?:Carga Horaria|Horas totales|Total de horas)[:\s]*(\d+)\s*(?:horas?)?/i,
    /(\d+)\s*horas?\s*(?:totales?|en total|por semestre)/i,
    /(?:Duración)[:\s]*(\d+)\s*(?:horas?)?/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const hours = parseInt(match[1], 10);
      if (hours >= 10 && hours <= 200) return hours;
    }
  }
  return null;
}

function extractActivities(text: string): KeyActivity[] {
  const activities: KeyActivity[] = [];

  // Pattern: numbered activities with hours
  const activityPatterns = [
    /(?:^|\n)\s*(\d+)[.\)\-]\s+([^\n]{10,150})(?:[\s\n]+(\d+)\s*horas?)?/gim,
    /(?:Actividad Clave|Actividad clave|AC)\s*(\d+)[:\s]+([^\n]{10,150})/gi,
  ];

  for (const pattern of activityPatterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length >= 2 && matches.length <= 10) {
      for (const match of matches) {
        const order = parseInt(match[1], 10);
        const name = match[2]?.trim().replace(/\s+/g, ' ');
        const hours = match[3] ? parseInt(match[3], 10) : 18;
        if (name && name.length > 5) {
          activities.push({ order, name, hours });
        }
      }
      if (activities.length >= 2) break;
    }
  }

  return activities.sort((a, b) => a.order - b.order);
}

function extractEvidences(text: string): string[] {
  const evidences: string[] = [];
  const pattern = /(?:Evidencia[s]?|Producto[s]? esperado[s]?)[:\s]+([^\n]{10,300})/gi;
  const matches = [...text.matchAll(pattern)];
  for (const match of matches) {
    if (match[1]) {
      // Split by common separators
      const items = match[1].split(/[,;]|\b(?:y|e)\b/).map(s => s.trim()).filter(s => s.length > 5);
      evidences.push(...items);
    }
  }
  return [...new Set(evidences)].slice(0, 6);
}
