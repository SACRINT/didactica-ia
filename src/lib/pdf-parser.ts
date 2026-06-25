import Anthropic from '@anthropic-ai/sdk';
import type { PdfParseResult } from '@/types/pdf-extraction';

/**
 * Extracts didactic planning data from a PDF using Claude's native PDF support.
 * Handles SEP-protected PDFs, scanned PDFs, and any PDF format.
 * Always returns a result — even on failure, returns empty fields with confidence='failed'.
 */
export async function parsePdfBuffer(buffer: Buffer): Promise<PdfParseResult> {
  const errors: string[] = [];

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      success: false,
      confidence: 'failed',
      data: {},
      rawText: '',
      errors: ['Error de configuración del servidor. Contacta al administrador.'],
    };
  }

  const base64Data = buffer.toString('base64');

  const extractionPrompt = `Eres un experto en programas de estudio del bachillerato mexicano bajo el Marco Curricular Común de la Educación Media Superior (MCCEMS/DBEPA 2025-2026).

Lee este programa de estudios y extrae los siguientes datos en formato JSON:

{
  "uacName": "Nombre completo de la Unidad de Aprendizaje Curricular tal como aparece en el documento",
  "learningOutcome": "Resultado de aprendizaje completo (qué logrará el estudiante al finalizar la UAC)",
  "totalHours": número entero de horas totales de la UAC,
  "activities": [
    { "name": "Nombre exacto de la Actividad Clave 1", "hours": número de horas, "order": 1 },
    { "name": "Nombre exacto de la Actividad Clave 2", "hours": número de horas, "order": 2 }
  ],
  "evidences": ["evidencia o producto esperado 1", "evidencia 2"]
}

REGLAS IMPORTANTES:
- Copia el nombre de la UAC EXACTAMENTE como aparece en el documento
- Si el resultado de aprendizaje no está explícito, redáctalo a partir del propósito de la UAC
- Las actividades clave son las grandes secciones del programa (usualmente 2-5)
- Si no encuentras actividades numeradas, crea 3 actividades distribuyendo las horas
- Las evidencias son los productos que el estudiante entrega al final de cada actividad
- Si un campo no existe en el documento, usa null
- Responde SOLO con el JSON, sin texto adicional ni markdown`;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (anthropic.messages.create as (params: any) => Promise<{ content: Array<{ type: string; text?: string }> }>)({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: extractionPrompt,
            },
          ],
        },
      ],
    });


    const contentBlock = response.content[0];
    if (contentBlock.type !== 'text' || !contentBlock.text) {
      throw new Error('Respuesta inesperada de la IA');
    }

    // Strip markdown code blocks if present
    const cleanJson = contentBlock.text
      .replace(/^```(?:json)?\n?/m, '')
      .replace(/\n?```$/m, '')
      .trim();

    const parsed = JSON.parse(cleanJson);

    // Build structured activities from parsed data
    const activities = Array.isArray(parsed.activities)
      ? parsed.activities
          .filter((a: { name?: string }) => a && a.name)
          .map((a: { name: string; hours?: number; order?: number }, i: number) => ({
            name: String(a.name).trim(),
            hours: Number(a.hours) || Math.round((parsed.totalHours || 54) / (parsed.activities?.length || 3)),
            order: Number(a.order) || i + 1,
          }))
      : [];

    // If Claude found no activities, create placeholders
    const finalActivities =
      activities.length > 0
        ? activities
        : [
            { name: '', hours: Math.round((parsed.totalHours || 54) / 3), order: 1 },
            { name: '', hours: Math.round((parsed.totalHours || 54) / 3), order: 2 },
            { name: '', hours: Math.round((parsed.totalHours || 54) / 3), order: 3 },
          ];

    const evidences = Array.isArray(parsed.evidences)
      ? parsed.evidences.filter((e: string) => e && e.length > 3).slice(0, 8)
      : [];

    const data = {
      uacName: parsed.uacName ? String(parsed.uacName).trim() : '',
      learningOutcome: parsed.learningOutcome ? String(parsed.learningOutcome).trim() : '',
      totalHours: Number(parsed.totalHours) || 54,
      activities: finalActivities,
      evidences,
      parseConfidence: 'high' as const,
    };

    const hasBasicData = !!(data.uacName && data.totalHours > 0);

    if (!hasBasicData) {
      errors.push('El documento no parece ser un programa de estudios MCCEMS. Verifica el archivo y completa los datos manualmente.');
    }

    return {
      success: hasBasicData,
      confidence: hasBasicData ? 'high' : 'low',
      data,
      rawText: '',
      errors,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    console.error('PDF extraction error:', msg);

    // Return failed state with empty data so the user can fill manually
    errors.push('No se pudo extraer automáticamente. Por favor captura los datos del programa manualmente.');
    return {
      success: false,
      confidence: 'failed',
      data: {
        uacName: '',
        learningOutcome: '',
        totalHours: 54,
        activities: [
          { name: '', hours: 18, order: 1 },
          { name: '', hours: 18, order: 2 },
          { name: '', hours: 18, order: 3 },
        ],
        evidences: [],
        parseConfidence: 'failed',
      },
      rawText: '',
      errors,
    };
  }
}
