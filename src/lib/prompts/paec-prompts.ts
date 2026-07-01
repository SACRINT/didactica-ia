export const PAEC_SYSTEM_PROMPT = `Actúa consistentemente como un consorcio experto en Educación Media Superior de la Nueva Escuela Mexicana (NEM) integrado por: un Formador Pedagógico NEM, un Arquitecto de Estructuras Educativas y un Estratega Curricular Transversal. Tu objetivo es diseñar un Proyecto Escolar Comunitario (PEC) robusto, profesional y contextualizado.

Reglas Críticas de Operación:
1. Fidelidad Estructural: Conserva de forma estricta los títulos y encabezados de las tablas solicitadas. Jamás modifiques las columnas a menos que se te pida explícitamente.
2. Autonomía Operativa de las UACs: No agrupes asignaturas ni semestres. Cada Unidad de Aprendizaje Curricular (UAC) debe poseer su propia fila independiente con su docente responsable para evitar confusiones de asignación en el plantel.
3. Respeto a la Estructura de Bloques Semestrales (Modelo de Relevos): En los bachilleratos, las asignaturas se cursan de forma alternada. En el Semestre A (Septiembre-Enero) participan los estudiantes de 3° y 5° semestre. En el Semestre B (Febrero-Junio) participan los estudiantes de 4° y 6° semestre. Las actividades curriculares de las tablas y el Plan Operativo deben segmentarse rigurosamente respetando esta división temporal del ciclo escolar.

Debes responder ÚNICAMENTE con un objeto JSON válido que contenga la información del paso actual. No incluyas explicaciones de texto fuera del JSON. No agregues bloques de código markdown (\`\`\`json).`;

export function buildPrompt1Diagnostico(
  communityContext: string,
  schoolContext: string,
  problem: string
): string {
  return `Genera la Fase I: Diagnóstico Colectivo del PAEC en base a la información proporcionada.
  
Problemática seleccionada por el plantel:
"${problem}"

Información de la Comunidad proporcionada:
${communityContext}

Información del Plantel proporcionada:
${schoolContext}

Debes retornar un objeto JSON con la siguiente estructura exacta:
{
  "tabla1": [
    { "col1": "Ubicación geográfica", "col2": "..." },
    { "col1": "Situación demográfica", "col2": "..." },
    { "col1": "Situación socioeconómica", "col2": "..." },
    { "col1": "Situación sociocultural", "col2": "..." },
    { "col1": "Seguridad", "col2": "..." },
    { "col1": "Situación medioambiental", "col2": "..." }
  ],
  "tabla2": [
    { "col1": "Cobertura de la educación", "col2": "..." },
    { "col1": "Contexto familiar", "col2": "..." },
    { "col1": "Características del estudiantado", "col2": "..." },
    { "col1": "Características del plantel", "col2": "..." },
    { "col1": "Indicadores educativos del plantel", "col2": "..." },
    { "col1": "Programas o proyectos previos", "col2": "..." },
    { "col1": "Instalaciones y equipamiento", "col2": "..." }
  ],
  "tabla3": [
    { "aspect": "Fortalezas (F)", "analysis": "Cruza las fortalezas internas del plantel con las oportunidades externas para el proyecto..." },
    { "aspect": "Oportunidades (O)", "analysis": "Analiza las oportunidades del entorno para fortalecer la educación..." },
    { "aspect": "Debilidades (D)", "analysis": "Cruza las debilidades del plantel para mitigar riesgos..." },
    { "aspect": "Amenazas (A)", "analysis": "Identifica las amenazas externas y plantea la Estrategia Maestra del proyecto..." }
  ],
  "tabla4": [
    { "col1": "Recuperación de información", "col2": "Describir el proceso técnico y recopilación de datos comunitarios y escolares..." },
    { "col1": "Sistematización y análisis", "col2": "Describir cómo se procesó la información para identificar carencias y fortalezas..." },
    { "col1": "Selección del problema para el PEC", "col2": "Justificar la selección específica de la problemática planteada para este PEC..." }
  ]
}`;
}

export function buildPrompt2Justificacion(
  diagnosticoSummary: string,
  projectName: string,
  problem: string
): string {
  return `Redacta los apartados formales de la Fase II: Justificación y Alcance del PEC en base a la Fase I (Diagnóstico Colectivo) aprobada.

Nombre preliminar del proyecto: "${projectName}"
Problemática asociada: "${problem}"

Resumen del Diagnóstico de la Fase I:
${diagnosticoSummary}

Genera un objeto JSON con la siguiente estructura exacta:
{
  "projectName": "Nombre definitivo y formal del proyecto",
  "introduction": "Redacta una justificación completa explicando detalladamente cómo el diagnóstico comunitario llevó a la selección de este proyecto.",
  "pilares": [
    "Conexión Directa con Necesidades del Plantel: (Explicar viabilidad y alineación con la infraestructura escolar)",
    "Desarrollo de Competencias Profesionales Avanzadas: (Explicar las competencias transversales y laborales que adquieren)",
    "Oportunidad de Innovación y Emprendimiento: (Describir qué solución tangible o idea productiva aporta el proyecto)",
    "Sinergia Comunitaria: (Cómo vincula a familias, comercios o dependencias públicas locales)",
    "Alineación Curricular Estratégica: (Cómo se integran las disciplinas curriculares de la NEM)"
  ],
  "proposito": {
    "educativo": "Propósito educativo del PEC: Qué aprenderán los estudiantes.",
    "social": "Propósito social/ambiental del PEC: Qué beneficio traerá al entorno comunitario.",
    "funcional": "Propósito funcional: Cuál es el objetivo material, producto o servicio concreto que se generará."
  },
  "alcance": {
    "metas": [
      "Meta 1 (Gestión/Alcance): Porcentaje cuantitativo de cobertura escolar o comunitaria.",
      "Meta 2 (Producción/Mejora): Meta física medible del producto o servicio generado.",
      "Meta 3 (Participación Comunitaria): Meta cuantitativa de involucramiento de familias o aliados.",
      "Meta 4 (Desarrollo de Competencias): Nivel cuantitativo de logro en competencias o acreditación."
    ],
    "participantes": [
      "Estudiantes: (Rol de los grupos y semestres)",
      "Docentes: (Rol de coordinación)",
      "Familias: (Rol de apoyo y co-evaluación)",
      "Autoridades: (Rol de gestión y vinculación)"
    ],
    "recursos": [
      "Recursos Materiales e Instalaciones necesarias...",
      "Recursos Tecnológicos requeridos...",
      "Recursos Financieros o donativos comunitarios necesarios..."
    ]
  }
}`;
}

export function buildPrompt3Mapeo(
  justificacionText: string,
  uacs: { uac_name: string; semester: number }[]
): string {
  const listText = uacs
    .map((u) => `- Semestre ${u.semester}: ${u.uac_name}`)
    .join('\n');

  return `Basado en la Justificación del proyecto y problemática seleccionada, debes realizar el análisis transversal de la matriz "Vinculación Multidisciplinaria del PEC" para las siguientes materias activas.

Información del Proyecto:
${justificacionText}

Asignaturas a mapear (Debes generar una fila exclusiva para cada una de ellas, no las omitas ni las agrupes):
${listText}

Debes retornar un arreglo JSON de objetos con la siguiente estructura exacta:
[
  {
    "semester": 3,
    "uacName": "Nombre de la Asignatura",
    "topic": "Tema o actividad específica y práctica del estudiante relacionada con el proyecto",
    "linking": "Vinculación curricular detallada: Cómo la asignatura aporta al proyecto y qué aprendizajes del programa se movilizan"
  },
  ...
]`;
}

export function buildPrompt4Cronograma(
  mapeoSummary: string,
  cycleType: string
): string {
  let relevosText = '';
  if (cycleType === 'A') {
    relevosText = `Fases 1, 2 y 3 corresponden al Semestre A (Septiembre a Enero), por lo que debes asignar de manera exclusiva a los semestres '3° Semestre' y '5° Semestre' en los relevos.`;
  } else if (cycleType === 'B') {
    relevosText = `Fases 4, 5 y 6 corresponden al Semestre B (Febrero a Junio), por lo que debes asignar de manera exclusiva a los semestres '4° Semestre' y '6° Semestre' en los relevos.`;
  } else {
    relevosText = `Fases 1, 2 y 3 corresponden al Semestre A (estudiantes de 3° y 5° semestre). Fases 4, 5 y 6 corresponden al Semestre B (estudiantes de 4° y 6° semestre).`;
  }

  return `Diseña la tabla de "Diseño General: Fases de Implementación del PEC" dividiendo el ciclo escolar en 6 Fases Bimestrales.

Vinculación de Asignaturas:
${mapeoSummary}

Directriz de Relevo Semestral:
${relevosText}

Asegura el siguiente flujo lógico:
- Fase 1: Investigación y Diagnóstico de Campo.
- Fase 2: Ideación y Diseño de Soluciones.
- Fase 3: Planificación, Acopio de Materiales y Preparación.
- Fase 4: Lanzamiento, Ensamble o Producción Inicial.
- Fase 5: Implementación, Instalación o Ejecución en Comunidad.
- Fase 6: Evaluación, Medición de Impacto y Clausura del Proyecto.

Debes retornar un arreglo JSON de objetos con la siguiente estructura exacta:
[
  {
    "phase": "Fase 1: Investigación",
    "objective": "Objetivo de esta etapa bimestral",
    "macroActivities": "Actividades clave detalladas",
    "semesterInvolved": "Semestre y grupos involucrados responsables de esta fase"
  },
  ...
]`;
}

export function buildPrompt5PlanOperativo(
  cronogramaSummary: string,
  cycleType: string
): string {
  let extraRule = '';
  if (cycleType === 'A' || cycleType === 'annual') {
    extraRule = `REGLA OBLIGATORIA (Modelo de Relevos): Dado que participamos en el Semestre A, las actividades de las semanas 12 a 14 deben obligatoriamente detallar el diseño, acopio y documentación del "Paquete de Transferencia y Manuales de Procedimiento" técnico. Esto es indispensable para que los grupos que tomen el relevo en el Semestre B (4° y 6° semestre) sepan cómo continuar la producción e instalación sin contratiempos.`;
  }

  return `Diseña el "Plan Operativo del PEC" estructurado por semanas (Semanas 1 a 16).
  
Macro-cronograma:
${cronogramaSummary}

Filtro de Semestres y Bloque Actual:
${cycleType === 'A' ? 'Generar para Semestre A (3° y 5° semestre)' : cycleType === 'B' ? 'Generar para Semestre B (4° y 6° semestre)' : 'Generar planes detallados independientes para Semestre A y Semestre B'}
${extraRule}

Debes retornar un objeto JSON con la siguiente estructura exacta:
{
  "semestreA": [
    {
      "phase": "Fase de la implementación",
      "activity": "Actividad detallada de la semana",
      "uac": "UAC involucrada en la actividad",
      "progression": "Número de Progresión/Actividad Clave",
      "strategy": "Estrategia didáctica activa (ABP, Aprendizaje-Servicio, Design Thinking, etc.)",
      "week": "Semana X (ej: Semana 1)",
      "responsibles": "Estudiantes de X Semestre y Docente"
    }
  ],
  "semestreB": [
    // Rellenar de la misma forma si aplica para el semestre B, o dejar arreglo vacío si cycleType == 'A'
  ]
}`;
}

export function buildPrompt6Anexos(
  planOperativoSummary: string
): string {
  return `Genera las plantillas, formatos y cuestionarios técnicos requeridos para los Anexos de Gestión del proyecto en base al Plan Operativo actual.

Resumen del Plan Operativo:
${planOperativoSummary}

Genera un objeto JSON con las plantillas en formato de texto Markdown completas para las siguientes secciones:
{
  "anexo1": "### Anexo 1: Formato de Minuta de Reunión 2.0 (Plantilla copiable estructurada con cabecera y tabla markdown de acuerdos)",
  "anexo2": "### Anexo 2: Cuadro de Seguimiento Operativo de Actividades (Tabla específica para el control semanal del proyecto)",
  "anexo3": "### Anexo 3: Formato de Reporte de Avances Mensual (Esquema con secciones de Logros, Datos Cuantitativos y Plan de acción)",
  "anexo4": "### Anexo 4: Cuestionario de Hábitos y Percepciones de la Comunidad (10 preguntas para medir el cambio de conciencia)",
  "anexo5": "### Anexo 5: Cuestionario de Autoevaluación de Competencias para Estudiantes (Para evaluar habilidades blandas y técnicas)",
  "anexo6": "### Anexo 6: Plantilla del Informe Final y Estrategia de Socialización de Resultados para la Supervisión Escolar"
}`;
}
