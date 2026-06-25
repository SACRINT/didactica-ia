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

  const evidencesText = extractedData.evidences.length > 0
    ? extractedData.evidences.map(e => `  - ${e}`).join('\n')
    : '  (No especificadas — infiere evidencias apropiadas para esta UAC)';

  const subsystemLabels: Record<string, string> = {
    bge: 'Bachillerato General Estatal (BGE)',
    digital: 'Bachillerato Digital',
    emsad: 'EMSAD',
  };

  const componentLabels: Record<string, string> = {
    laboral: 'Formación Laboral',
    fundamental: 'Currículum Fundamental',
    ampliado: 'Currículum Ampliado',
  };

  return `Genera una Planeación Didáctica completa para:

═══════════ DATOS DE LA UAC ═══════════
UAC: ${extractedData.uacName}
Semestre: ${semester}° Semestre
Componente: ${componentLabels[component] || component}
Carga horaria total: ${extractedData.totalHours} horas
Resultado de aprendizaje: ${extractedData.learningOutcome || '(Inferir del nombre de la UAC)'}

Actividades Clave:
${activitiesText}

Evidencias sugeridas por el programa:
${evidencesText}

═══════════ CONTEXTO DEL DOCENTE ═══════════
Docente: ${context.teacherName}
Plantel: ${context.schoolName}
Municipio: ${context.municipality}, Puebla
Región: ${context.region}
Subsistema: ${subsystemLabels[context.subsystem] || context.subsystem}
Grupos: ${context.groupInfo}

═══════════ CONTEXTO PAEC Y COMUNIDAD ═══════════
Problemática comunitaria detectada en el PAEC:
${context.paecProblem}

Caracterización de los estudiantes:
${context.studentContext}

═══════════ INSTRUCCIONES ESPECÍFICAS ═══════════
- Contextualiza TODAS las actividades a la realidad de ${context.municipality}, Puebla
- El proyecto integrador debe relacionarse directamente con la problemática: "${context.paecProblem.substring(0, 100)}"
- Las actividades de apertura deben usar situaciones/objetos/experiencias cotidianas de los estudiantes
- Considera los recursos disponibles descritos en la caracterización de estudiantes
- Genera exactamente ${extractedData.activities.length} Actividades Clave en la Sección IV
- Las ponderaciones en la Sección V deben sumar exactamente 100%
- Los grupos son: ${context.groupInfo}

Responde SOLO con el JSON, sin markdown ni texto adicional.`;
}
