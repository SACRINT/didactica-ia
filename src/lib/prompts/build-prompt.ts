import type { ExtractedPdfData, TeacherContext } from '@/types/planning';

export function buildUserPrompt(
  extractedData: ExtractedPdfData,
  context: TeacherContext,
  semester: number,
  component: string
): string {
  const activitiesText = extractedData.activities
    .map((a, i) => `  ${i + 1}. ${a.name} (${a.hours} horas)`)
    .join('\n');

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
Carga horaria total: ${extractedData.totalHours} horas
Resultado de aprendizaje: ${extractedData.learningOutcome || '(Inferir del nombre de la UAC y el contexto)'}

${component === 'laboral' ? 'Actividades Clave' : 'Propósitos y Contenidos formativos (Progresiones)'} del programa:
${activitiesText}

Evidencias sugeridas por el programa:
${evidencesText}

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

Responde SOLO con el JSON, sin markdown ni texto adicional.`;
}
