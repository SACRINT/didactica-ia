import type { ExtractedPdfData, TeacherContext } from '@/types/planning';

export function buildUserPrompt(
  extractedData: ExtractedPdfData,
  context: TeacherContext,
  semester: number,
  component: string
): string {
  // ── Hour distribution math ─────────────────────────────────────────────────
  // The semester has 3 evaluation periods (cortes), each with 6 weeks.
  // Total semester weeks ≈ 18.
  // Weekly load = totalHours / 18  (rounded to nearest integer)
  // Hours per corte = weeklyLoad × 6
  // Expected values:
  //   3 h/week → 18 h/corte (54 h total)
  //   4 h/week → 24 h/corte (72 h total)
  const totalHours = extractedData.totalHours;
  const weeklyLoad = Math.round(totalHours / 18);           // e.g. 3 or 4
  const hoursPerCorte = weeklyLoad * 6;                     // e.g. 18 or 24
  const hoursPerCorteVerified = Math.round(totalHours / 3); // fallback if totalHours/18 doesn't give round number

  // Use the most consistent value
  const hpc = Number.isInteger(totalHours / 3) ? hoursPerCorteVerified : hoursPerCorte;

  const activitiesText = extractedData.activities
    .map((a, i) => {
      let text = `  ${i + 1}. ${a.name} (${a.hours} horas)`;
      
      // If catalog has loaded topics / contenidos formativos for this propósito, pass them to Gemini
      if (extractedData.contenidosFormativos && Array.isArray(extractedData.contenidosFormativos)) {
        // Find matching purpose object
        const match = extractedData.contenidosFormativos.find((cf: any) => 
          cf.proposito === a.name || 
          (cf.proposito && cf.proposito.substring(0, 50) === a.name.substring(0, 50))
        );
        if (match && Array.isArray(match.contenidos) && match.contenidos.length > 0) {
          text += `\n     [Contenidos Formativos / Temas Oficiales para esta unidad]:\n` + 
                  match.contenidos.map((t: string) => `       - ${t}`).join('\n');
        }
      }
      return text;
    })
    .join('\n\n');

  const evidencesText =
    extractedData.evidences.length > 0
      ? extractedData.evidences.map(e => `  - ${e}`).join('\n')
      : '  (No especificadas — infiere evidencias apropiadas para esta UAC)';

  const subsystemLabels: Record<string, string> = {
    bge: 'Bachillerato General Estatal (BGE)',
    digital: 'Bachillerato Digital',
    emsad: 'EMSAD',
    cecyte: 'CECyTE',
    cbtis: 'CBTIS',
    cbta: 'CBTA',
    conalep: 'CONALEP',
    dgb: 'Preparatoria Federal / DGB',
    telebachillerato: 'Telebachillerato',
  };

  const componentLabels: Record<string, string> = {
    laboral: 'Formación Laboral',
    fundamental: 'Currículum Fundamental',
    ampliado: 'Currículum Ampliado',
  };

  const location = [context.municipality, context.state].filter(Boolean).join(', ');
  const subsystemLabel = subsystemLabels[context.subsystem] || context.subsystem;

  return `Genera una Planeación Didáctica completa en formato DBEPA 2026-2027 para:

═══════════ DATOS DE LA UAC ═══════════
UAC: ${extractedData.uacName}
Semestre: ${semester}° Semestre
Componente: ${componentLabels[component] || component}
Carga horaria TOTAL del semestre: ${totalHours} horas
Carga horaria SEMANAL: ${weeklyLoad} horas por semana
Resultado de aprendizaje: ${extractedData.learningOutcome || '(Inferir del nombre de la UAC y el contexto)'}

${component === 'laboral' ? 'Actividades Clave' : 'Propósitos y Contenidos formativos'} del programa:
${activitiesText}

Evidencias sugeridas por el programa:
${evidencesText}

═══════════ DISTRIBUCIÓN HORARIA OBLIGATORIA POR CORTE ═══════════
REGLA MATEMÁTICA ESTRICTA — NO MODIFICAR:
  • El semestre se divide en 3 Cortes de evaluación (Corte 1, Corte 2, Corte 3)
  • Cada Corte tiene exactamente 6 semanas de clases
  • Carga semanal de esta UAC: ${weeklyLoad} horas/semana
  • HORAS POR CORTE: ${weeklyLoad} h/semana × 6 semanas = ${hpc} horas exactas por Corte
  • Total: ${hpc} h × 3 Cortes = ${hpc * 3} horas (debe coincidir con la carga total de ${totalHours} h)

DISTRIBUCIÓN DE ACTIVIDADES POR CORTE:
  - La suma de horas de las actividades asignadas al Corte 1 debe ser EXACTAMENTE ${hpc} horas.
  - La suma de horas de las actividades asignadas al Corte 2 debe ser EXACTAMENTE ${hpc} horas.
  - La suma de horas de las actividades asignadas al Corte 3 debe ser EXACTAMENTE ${hpc} horas.
  - Si una actividad no cabe completa en un Corte, divídela entre dos Cortes para cuadrar exactamente.
  - Las horas de cada actividad en la Sección IV deben sumar ${hpc} por Corte.

═══════════ DATOS DEL DOCENTE Y PLANTEL ═══════════
Docente: ${context.teacherName}
Plantel: ${context.schoolName}
Municipio / Estado: ${location}
${context.region ? `Región: ${context.region}` : ''}
Subsistema: ${subsystemLabel}
Grupos: ${context.groupInfo || '(No especificado)'}
Período de aplicación: ${context.applicationPeriod || 'Ciclo escolar 2026-2027'}
Recursos disponibles: ${context.schoolResources || '(No especificado — usa recursos básicos)'}

═══════════ PROYECTO PAEC/PEC ═══════════
Nombre del proyecto: ${context.paecProjectName || '(No especificado)'}
Objetivo del proyecto: ${context.paecObjective || '(No especificado)'}

Problemática comunitaria detectada en el PAEC:
${context.paecProblem}

Caracterización de los estudiantes:
${context.studentContext || '(No especificada — adapta al contexto general del municipio)'}

═══════════ INSTRUCCIONES DE CONTEXTUALIZACIÓN ═══════════
1. VINCULACIÓN PAEC: TODAS las actividades de apertura, ejecución y conclusión deben relacionarse con "${context.paecProjectName || context.paecProblem.substring(0, 80)}"
2. LOCALIZACIÓN: Usa ejemplos, situaciones y productos locales de ${location}
3. ESTUDIANTES: Adapta la metodología y materiales a: ${context.studentContext || 'el contexto comunitario local'}
4. RECURSOS: Solo propón actividades realizables con: ${context.schoolResources || 'recursos básicos de aula'}
5. SUBSISTEMA: La planeación debe cumplir los lineamientos del ${subsystemLabel}
6. Genera exactamente ${extractedData.activities.length} secuencias didácticas correspondientes a cada ${component === 'laboral' ? 'Actividad Clave' : 'Propósito/Contenido formativo'} en la Sección IV
7. Las ponderaciones en la Sección V deben sumar exactamente 100%
8. El período de aplicación en Sección I debe ser: ${context.applicationPeriod || 'Agosto – Diciembre 2026'}
9. HORAS POR CORTE: Verifica antes de responder que la suma de horas por Corte sea exactamente ${hpc} en cada uno de los 3 Cortes.

Responde SOLO con el JSON, sin markdown ni texto adicional.`;
}

