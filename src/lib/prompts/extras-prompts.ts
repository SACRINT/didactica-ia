// ═══════════════════════════════════════════════════════════════════
//  DidácticaIA — Prompts for Planning Extras
//  DBEPA Puebla 2026-2027 · USICAMM & ANEXO 12 Compliant
// ═══════════════════════════════════════════════════════════════════

export const SYSTEM_PROMPT_EXTRAS = `
Eres un asesor pedagógico de la Dirección de Bachilleratos Estatales y Preparatoria Abierta (DBEPA) de la SEP Puebla, experto en la Nueva Escuela Mexicana (NEM) y el Marco Curricular Común de la Educación Media Superior (MCCEMS).
Tu tarea es generar materiales complementarios de alta calidad para docentes de Bachillerato Estatal (BGE, Bachillerato Digital, EMSAD).

REGLAS GENERALES:
- Todo el contenido debe redactarse en español formal e institucional.
- Genera el recurso solicitado en formato Markdown limpio, sin bloques de código con triple comilla (fenced code blocks) y directo al grano.
- Asegúrate de incluir referencias al contexto comunitario y de Puebla en los ejemplos o ejercicios propuestos.
- La terminología técnica debe coincidir plenamente con la planeación de origen.
`;

/**
 * Prompt templates for generating Rubrics and Checklists (Instrumentos)
 */
export const RUBRIC_PROMPT_TEMPLATE = (
  uacName: string,
  activityName: string,
  evidence: string,
  instrumentType: string
) => `
Genera un instrumento de evaluación de tipo: "${instrumentType}" para la siguiente evidencia de logro:
UAC/Asignatura: ${uacName}
Actividad/Contenido: ${activityName}
Evidencia a Evaluar: ${evidence}

REQUISITOS DEL INSTRUMENTO:
1. Si el tipo es "Rúbrica analítica", debe presentarse en formato de tabla Markdown con columnas: "Criterio de Evaluación", "Excelente (4)", "Satisfactorio (3)", "Suficiente (2)" e "Insuficiente (1)". Incluye una ponderación para cada criterio (ej: 25% c/u) y una sección de registro de puntaje y firma del docente.
2. Si el tipo es "Lista de cotejo", debe presentarse en formato de tabla Markdown con columnas: "Criterio de Desempeño", "Cumple (Sí)", "No cumple (No)" y "Observaciones". Organiza los criterios en dimensiones (ej: Contenido Técnico, Presentación, Actitud).
3. Adapta los criterios de calidad al área técnica de la asignatura (ej: si es electricidad, exige precisión en calibres, aislamiento, herramientas, normatividad NOM-001-SEDE-2012, etc.).
4. Añade una sección de retroalimentación cualitativa al final para que el docente escriba recomendaciones de mejora continua al estudiante.
`;

/**
 * Prompt templates for generating Classroom Materials
 */
export const MATERIAL_PROMPT_TEMPLATE = (
  uacName: string,
  materialName: string,
  paecProblem: string,
  uacContext: string
) => `
Genera el contenido detallado y completo del siguiente material didáctico impreso para clase:
Nombre del Material: ${materialName}
UAC/Asignatura: ${uacName}
Problemática PAEC asociada: ${paecProblem}
Contexto General de la Planeación:
${uacContext}

REQUISITOS DEL MATERIAL:
1. NO uses marcadores de posición (placeholders) como "[escribir aquí]", "etc.". Escribe el texto real completo, listo para imprimir y fotocopiar.
2. Si es una "Ficha Técnica" o "Tabla", incluye datos técnicos reales, calibres, normas oficiales mexicanas aplicables (ej: NOM-001-SEDE-2012) y descripciones detalladas de uso.
3. Si es un "Cuestionario Diagnóstico", redacta las preguntas reales (mínimo 5), con opciones y una clave de respuestas comentada con notas pedagógicas para el docente al final.
4. Si son "Tarjetas de Casos Prácticos", redacta al menos 3 casos ficticios realistas situados en comunidades rurales o urbanas del Estado de Puebla, planteando un problema cotidiano de la comunidad y la solución técnica esperada.
5. Estructura el documento usando títulos (# y ##), tablas y listas en Markdown para que sea fácil de leer y exportar.
`;

/**
 * Prompt templates for generating Lesson Plans (Planes de Clase)
 * Aligned 100% with the 11 points of "03 Lista de cotejo Plan de Clase 1-2_SEM.pdf"
 */
export const LESSON_PLAN_PROMPT_TEMPLATE = (
  uacName: string,
  activityName: string,
  sessionNum: number,
  totalSessions: number,
  paecProblem: string,
  studentContext: string,
  learningOutcome: string
) => `
Genera un "Plan de Clase" (Lesson Plan) detallado para una sesión de clase de 50 minutos:
UAC/Asignatura: ${uacName}
Actividad Clave / Contenido de origen: ${activityName}
Número de Sesión: Sesión ${sessionNum} de ${totalSessions}
Resultado de Aprendizaje (Programa): ${learningOutcome}
Problemática PAEC: ${paecProblem}
Caracterización de los estudiantes: ${studentContext}

REQUISITOS DEL PLAN DE CLASE (100% Alineado a la Lista de Cotejo oficial del supervisor):
El documento debe incluir de forma explícita las siguientes secciones etiquetadas en Markdown:

1. **Datos de Identificación del Plan de Clase**:
   - Nombre de la UAC, Semestre, Grupo, Número de Sesión y Horas.
   - Meta Educativa / Meta de Aprendizaje.
   - Contenidos Conceptuales, Procedimentales y Actitudinales involucrados.
   - Transversalidad: Conexión coherente con otras disciplinas del mismo semestre.

2. **Metodología Socio-Crítica / Estrategias Activas**:
   - Declarar la estrategia activa principal (ej: Aprendizaje Basado en Proyectos, Práctica Guiada de Taller, etc.) y cómo se aplica en esta sesión.

3. **Secuencia de Aprendizaje de la Sesión (50 minutos desglosados)**:
   Presentar en una tabla Markdown con columnas: "Fase/Momento", "Tiempo", "Actividad del Docente", "Actividad del Estudiante" y "Proceso de Pensamiento / Habilidad":
   - **Apertura (10 min) - Exploración de conocimientos**: Actividad concreta para indagar ideas y saberes previos en torno al contenido de la sesión.
   - **Desarrollo (30 min) - Aprendizaje Pertinente (Nivel 2 de Complejidad)**: Actividades eslabonadas donde el estudiante aplique, diseñe, procese o construya conocimientos. Debe fomentar la reflexión, el diálogo y la discusión activa del estudiantado. Contextualizado a la problemática del PAEC de Puebla.
   - **Cierre (10 min) - Consolidación**: Actividades que promuevan la metacognición (que el alumno reflexione qué aprendió y para qué le sirve) y la autoevaluación o coevaluación de la sesión.

4. **Evaluación Formativa de la Sesión**:
   - Especificar el producto esperado o evidencia del día.
   - Indicar el momento y tipo de evaluación (autoevaluación, coevaluación o heteroevaluación).
   - Definir el Instrumento de evaluación sugerido para valorar el logro de la meta del día.

5. **Recursos y Fuentes de Información**:
   - Materiales requeridos por el estudiante y el docente para esta clase específica.
   - Bibliografía y recursos digitales de consulta (NOMs, manuales o ligas).
`;
