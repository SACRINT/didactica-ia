export const PAEC_SYSTEM_PROMPT = `Actúa consistentemente como un consorcio experto en Educación Media Superior de la Nueva Escuela Mexicana (NEM) integrado por: un Formador Pedagógico NEM, un Arquitecto de Estructuras Educativas y un Estratega Curricular Transversal de Proyectos Escolares Comunitarios (PAEC-PEC 2026-2027). Tu objetivo es diseñar un Proyecto Escolar Comunitario (PEC) de nivel EXCELENCIA alineado al 100% con la Rúbrica PAEC 2026-2027.

Reglas Críticas de Operación:
1. Fidelidad Estructural: Conserva de forma estricta los títulos, estructuras y claves del JSON solicitado.
2. Autonomía Operativa de las UACs: No agrupes asignaturas ni semestres. Cada Unidad de Aprendizaje Curricular (UAC) debe poseer su propia representación clara en la transversalidad.
3. Nomenclatura Curricular Estricta (Normativa Ciclos 2026-2027 y 2027-2028):
   • Ciclo Escolar 2026-2027: Para 1.º, 2.º, 3.º y 4.º semestre DEBES usar exclusivamente "PROPÓSITOS FORMATIVOS" y "CONTENIDOS". (Está ESTRICTAMENTE PROHIBIDO usar la palabra "Progresiones" para estos semestres). Únicamente 5.º y 6.º semestre usan "PROGRESIONES DE APRENDIZAJE".
   • Ciclo Escolar 2027-2028 y posteriores: TODOS los semestres (1.º a 6.º) usarán exclusivamente "PROPÓSITOS FORMATIVOS" y "CONTENIDOS", quedando completamente eliminado el uso de progresiones.
4. Transversalidad Real (Cadena de Valor Pedagógica):
   • Evita la multidisciplinariedad superficial (materias haciendo tareas aisladas en paralelo).
   • Diseña una cadena de valor donde el producto de una asignatura sea el insumo indispensable para la siguiente (Ej. Matemáticas calcula la estadística que Lenguaje usa en su debate argumentativo, y Química analiza las muestras que Ciencias Sociales recolectó).
5. Cero Simulación y Protagonismo Estudiantil:
   • Evita actividades decorativas o eventos aislados sin fondo (ej. "hacer un cartel" o "barrer" sin análisis reflexivo). Cada actividad debe desarrollar un aprendizaje cognitivo complejo y tener un producto/evidencia evaluable con instrumentos técnicos.
   • El estudiante es el agente activo de transformación social y el docente actúa como facilitador.

Debes responder ÚNICAMENTE con un objeto JSON válido que contenga la información del paso actual. No incluyas explicaciones de texto fuera del JSON. No agregues bloques de código markdown (\`\`\`json).`;

export function buildPrompt1Diagnostico(
  communityContext: string,
  schoolContext: string,
  problem: string
): string {
  return `Genera la FASE I: Diagnóstico Colectivo y Metodología de Análisis del PAEC-PEC (Ciclo Escolar 2026-2027).

Problemática seleccionada por el plantel:
"${problem}"

Información de la Comunidad:
${communityContext}

Información del Plantel:
${schoolContext}

Debes retornar un objeto JSON con la siguiente estructura exacta:
{
  "tabla1": [
    { "col1": "Ubicación geográfica", "col2": "Coordenadas, entorno y características del terreno..." },
    { "col1": "Situación demográfica", "col2": "Población total, distribución por edad y género..." },
    { "col1": "Situación socioeconómica", "col2": "Principales actividades económicas, nivel de ingresos y empleo..." },
    { "col1": "Situación sociocultural", "col2": "Tradiciones, lengua, costumbres y capital cultural..." },
    { "col1": "Seguridad y convivencia", "col2": "Nivel de seguridad, factores de riesgo y cohesión social..." },
    { "col1": "Participación comunitaria", "col2": "Organizaciones locales, comités y redes de apoyo..." },
    { "col1": "Recursos y servicios", "col2": "Acceso a agua, luz, drenaje, internet y servicios de salud..." },
    { "col1": "Situación medioambiental", "col2": "Problemáticas ecológicas, manejo de residuos y recursos naturales..." }
  ],
  "tabla2": [
    { "col1": "Cobertura educativa", "col2": "Matrícula total y nivel de cobertura en la localidad..." },
    { "col1": "Contexto familiar", "col2": "Estructura familiar, nivel educativo de los padres y apoyo..." },
    { "col1": "Características del estudiantado", "col2": "Intereses, estilos de aprendizaje y necesidades..." },
    { "col1": "Características del plantel", "col2": "Infraestructura, aulas, equipamiento y personal docente..." },
    { "col1": "Indicadores educativos", "col2": "Tasas de aprobación, reprobación, abandono y eficiencia terminal..." },
    { "col1": "Programas vigentes", "col2": "Programas institucionales o proyectos comunitarios previos..." }
  ],
  "tabla3": [
    { "aspect": "Fortalezas (F)", "analysis": "Cruza las fortalezas internas del plantel con las oportunidades externas para el proyecto..." },
    { "aspect": "Oportunidades (O)", "analysis": "Analiza las oportunidades del entorno comunitario para potenciar los aprendizajes..." },
    { "aspect": "Debilidades (D)", "analysis": "Identifica áreas de oportunidad internas y cómo el proyecto las mitiga..." },
    { "aspect": "Amenazas (A)", "analysis": "Identifica riesgos externos y plantea la estrategia preventiva del proyecto..." }
  ],
  "tabla4": [
    { "col1": "Recuperación de información", "col2": "Describir el proceso técnico y metodológico de levantamiento de datos comunitarios y escolares..." },
    { "col1": "Sistematización y análisis", "col2": "Explicar cómo se procesó la información para identificar la problemática central..." },
    { "col1": "Selección del problema para el PEC", "col2": "Justificar la pertinencia de la problemática elegida como objeto de transformación situacional..." }
  ]
}`;
}

export function buildPrompt2Justificacion(
  diagnosticoSummary: string,
  projectName: string,
  problem: string
): string {
  return `Redacta la FASE II: Definición, Justificación y Diseño General del PEC conforme al Criterio 7 de la Rúbrica PAEC (Ciclo 2026-2027).

Nombre del proyecto: "${projectName}"
Problemática asociada: "${problem}"

Diagnóstico de la Fase I:
${diagnosticoSummary}

Genera un objeto JSON con la siguiente estructura exacta:
{
  "projectName": "${projectName}",
  "introduction": "Redacta la Justificación Técnica obligatoria con los 4 sub-apartados del Criterio 7: 1. MAGNITUD (dimensión del problema y población afectada), 2. INTERÉS (por qué apasiona a alumnos y comunidad), 3. FACTIBILIDAD (viabilidad con recursos actuales), 4. OPORTUNIDAD (por qué es el momento adecuado).",
  "pilares": [
    "Conexión Directa con Necesidades del Plantel: Viabilidad e infraestructura escolar",
    "Desarrollo de Competencias Transversales: Habilidades sociocognitivas y socioemocionales de la NEM",
    "Oportunidad de Innovación y Emprendimiento Social: Solución tangible y sostenible",
    "Sinergia Comunitaria: Vinculación activa de familias y actores locales",
    "Alineación Curricular Estratégica: Integración de los recursos del MCCEMS"
  ],
  "proposito": {
    "educativo": "Propósito educativo: Qué aprendizajes y competencias desarrollarán los estudiantes.",
    "social": "Propósito social/comunitario: Qué impacto positivo real se generará en el entorno.",
    "funcional": "Propósito funcional: Cuál es el producto material, prototipo o servicio concreto resultado del PEC."
  },
  "alcance": {
    "metas": [
      "Meta 1 (Gestión/Alcance): Porcentaje cuantitativo de cobertura o beneficiarios.",
      "Meta 2 (Producción/Solución): Meta física medible del producto o servicio generado.",
      "Meta 3 (Participación Comunitaria): Meta cuantitativa de involucramiento de familias o aliados.",
      "Meta 4 (Desarrollo Curricular): Nivel de logro en los propósitos formativos o progresiones."
    ],
    "participantes": [
      "Estudiantes: Rol activo, reflexivo y de liderazgo colaborativo",
      "Docentes: Rol de facilitación y articulación curricular transversal",
      "Familias: Rol de apoyo, acompañamiento y co-evaluación",
      "Autoridades y Comunidad: Rol de gestión, asesoría y vinculación externa"
    ],
    "recursos": [
      "Recursos Materiales e Infraestructura escolar...",
      "Recursos Tecnológicos y de Información...",
      "Recursos Financieros o insumos comunitarios acordados..."
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

  return `Realiza la Matriz de Mapeo Curricular y Transversalidad del PEC para las siguientes asignaturas activas en el Ciclo Escolar 2026-2027.

Información del Proyecto:
${justificacionText}

Asignaturas a mapear (Genera una fila exclusiva para cada una):
${listText}

REGLA DE NOMENCLATURA NORMATIVA (Ciclo Escolar 2026-2027):
- Para Semestres 1, 2, 3 y 4: Utiliza EXCLUSIVAMENTE el término "PROPÓSITO FORMATIVO" y "CONTENIDOS" (Está PROHIBIDO usar "Progresiones" para 1°, 2°, 3° y 4° semestre).
- Para Semestres 5 y 6: Utiliza el término "PROGRESIÓN DE APRENDIZAJE".

Debes retornar un arreglo JSON de objetos con la siguiente estructura exacta:
[
  {
    "semester": 1,
    "uacName": "Nombre de la Asignatura",
    "topic": "Tema o contenido específico y situado que abordará el estudiante",
    "linking": "Vinculación curricular detallada: Cita el Propósito Formativo (1°-4°) o la Progresión (5°-6°) correspondiente y explica cómo aporta a la cadena de valor del proyecto."
  }
]`;
}

export function buildPrompt4Cronograma(
  mapeoSummary: string,
  cycleType: string
): string {
  let relevosText = '';
  if (cycleType === 'A') {
    relevosText = `Semestre A (Septiembre a Enero): asignado a semestres 1°, 3° y 5°. Fases 1 a 3 del proyecto.`;
  } else if (cycleType === 'B') {
    relevosText = `Semestre B (Febrero a Junio): asignado a semestres 2°, 4° y 6°. Fases 4 a 6 del proyecto.`;
  } else {
    relevosText = `Proyecto Anual (Fases 1 a 6 a lo largo de todo el ciclo escolar).`;
  }

  return `Diseña la tabla de "Diseño General: Fases de Implementación del PEC" en 6 Fases Bimestrales para el Ciclo Escolar 2026-2027.

Vinculación Curricular:
${mapeoSummary}

Directriz Temporal:
${relevosText}

Flujo lógico de Fases:
- Fase 1: Investigación e Indagación Metodológica de Campo.
- Fase 2: Ideación, Diseño Curricular y Propuesta de Soluciones.
- Fase 3: Preparación, Acopio de Materiales y Planificación Operativa.
- Fase 4: Ejecución, Ensamble o Trabajo Comunitario Situado.
- Fase 5: Implementación en Comunidad, Evaluación de Impacto y Pruebas.
- Fase 6: Reflexión Metacognitiva, Cierre y Socialización de Resultados.

Debes retornar un arreglo JSON de objetos con la siguiente estructura exacta:
[
  {
    "phase": "Fase 1: Indagación de Campo",
    "objective": "Objetivo bimestral de la fase",
    "macroActivities": "Actividades situadas clave con aprendizaje activo",
    "semesterInvolved": "Semestres y grupos responsables"
  }
]`;
}

export function buildPrompt5PlanOperativo(
  cronogramaSummary: string,
  cycleType: string
): string {
  let extraRule = '';
  if (cycleType === 'A' || cycleType === 'annual') {
    extraRule = `REGLA OBLIGATORIA (Paquete de Transferencia): En las semanas 12-14, incluye el diseño del manual de transferencia técnico para que el siguiente bloque semestral dé continuidad al proyecto.`;
  }

  return `Diseña la Matriz del PLAN OPERATIVO DETALLADO del PEC (Semanas 1 a 16) para el Ciclo Escolar 2026-2027 bajo el enfoque de Transversalidad Real (Cadena de Valor) y Cero Simulación.

Macro-cronograma:
${cronogramaSummary}

Filtro del Ciclo:
${cycleType === 'A' ? 'Semestre A' : cycleType === 'B' ? 'Semestre B' : 'Ambos Semestres'}
${extraRule}

REGLAS DE ORO PEDAGÓGICAS (NORMATIVA CICLO 2026-2027):
1. NOMENCLATURA CURRICULAR ESTRICTA:
   - Para 1.º, 2.º, 3.º y 4.º Semestre: Usa EXCLUSIVAMENTE 'Propósito Formativo: [texto del propósito y contenido]'. (Prohibido usar Progresiones en 1° a 4° semestre).
   - Para 5.º y 6.º Semestre: Usa 'Progresión [N]: [texto de la progresión]'.
2. CADENA DE VALOR: El producto de una UAC debe ser insumo obligatorio para la siguiente UAC.
3. CERO SIMULACIÓN: Cada actividad debe generar un aprendizaje cognitivo complejo y tener un producto/evidencia evaluable con instrumento técnico (rúbrica/lista de cotejo).

Debes retornar un objeto JSON con la siguiente estructura exacta:
{
  "semestreA": [
    {
      "phase": "Fase de implementación",
      "week": "Semana 1",
      "activity": "Actividad específica situada y práctica",
      "uac": "UAC (Asignatura)",
      "progression": "Cita el Propósito Formativo (1°-4°) o Progresión (5°-6°)",
      "strategy": "Estrategia didáctica (ABP, Aula Invertida, Aprendizaje-Servicio)",
      "product": "Producto/Evidencia evaluable (ej. Reporte estadístico con matriz de análisis)",
      "responsibles": "Estudiantes de X Semestre y Docente de UAC"
    }
  ],
  "semestreB": []
}`;
}

export function buildPrompt6Anexos(
  planOperativoSummary: string
): string {
  return `Genera el SISTEMA DE EVALUACIÓN, SEGUIMIENTO Y ANEXOS TÉCNICOS del PEC conforme a la Rúbrica PAEC 2026-2027 (Fase IV).

Resumen del Plan Operativo:
${planOperativoSummary}

Genera un objeto JSON con plantillas Markdown completas y listas para aplicar:
{
  "anexo1": "### ANEXO 1: Rúbrica Transversal Integradora del Estudiante (Evaluación del Desempeño Individual y Colaborativo con Niveles: Sobresaliente 5, Destacado 4, Satisfactorio 3, En desarrollo 2, Básico 1)",
  "anexo2": "### ANEXO 2: Herramienta de Medición de Impacto Comunitario (Cuestionario PRE y POST con escala de Likert para medir la transformación del entorno)",
  "anexo3": "### ANEXO 3: Tablero de Seguimiento Operativo (Semaforización Verde/Amarillo/Rojo para el Comité del Plantel)",
  "anexo4": "### ANEXO 4: Cuestionario de Autoevaluación y Coevaluación de Autonomía Estudiantil",
  "anexo5": "### ANEXO 5: Guía de Preguntas Metacognitivas para la Sesión de Cierre del Proyecto",
  "anexo6": "### ANEXO 6: Informe Final y Estrategia de Socialización de Resultados para la Supervisión Escolar (Formato oficial con directorio de firmas)"
}`;
}
