# PROJECT CONTEXT — SIGPDA-EMS (Sistema Integral de Gestión Pedagógica y Docente para Educación Media Superior)

> **Documento de Memoria Central y Arquitectura de Referencia**  
> *Última actualización: Agosto 2026*

---

## ⚖️ DEFINICIÓN DE PLATAFORMAS — REGLAS INQUEBRANTABLES

### SIGPDA-EMS — Suite de Generación Pedagógica y Docente
- **Misión**: Cada docente y directivo **crea, afina, personaliza y descarga** sus propios instrumentos pedagógicos de forma autónoma.
- **Usuarios**: Docentes y Directores.
- **Filosofía**: "Sin fiscalización cruzada" — el docente es dueño de sus planes.
- **Instrumentos**: Planeaciones DBEPA, Secuencias, Horarios CSP, PMC, PAEC, PIPS/Cartografía, Rúbricas, Bundles Didácticos.
- **NO hace**: Fiscalización entre usuarios, seguimiento de alumnos, calificaciones, deserción, ni supervisión institucional.

### SISAT-ATP — Suite de Supervisión, Acompañamiento y Control de Zona Escolar
- **Misión**: Automatizar el trabajo administrativo y técnico-pedagógico de la **Supervisión de Zona** (~17 planteles).
- **Usuarios**: Supervisores, Asesores Técnicos-Pedagógicos (ATPs) y Directores (como remitentes).
- **Filosofía**: "De la alerta a la acción" — trazabilidad, pre-evaluación IA y generación de oficios.
- **Instrumentos**: Pre-evaluación IA de PMC/PAEC/CAPEMS, Cédulas de campo, Matriz de control de entregas, Oficios, Dictámenes, Reportes al Nivel (CEDAVIM, 25N, Minutas).
- **NO hace**: Calificaciones ni deserción de alumnos individuales (eso lo cubren **SICEP** y **SiATECCE**).
- **NO es**: Plataforma de generación pedagógica (eso es SIGPDA-EMS).

---

## 1. Arquitectura Técnica del Sistema

- **Frontend & Framework**: Next.js 16 (App Router con Turbopack), React 19, TypeScript, Vanilla CSS estructurado con diseño Glassmorphism/Dark UI de alta gama.
- **Base de Datos**: PostgreSQL Serverless en **Neon DB** con pooling y cliente `@neondatabase/serverless`.
- **Motor de Inteligencia Artificial**:
  - Módulo unificado en `src/lib/ai-provider` con soporte para rotación inteligente de claves (`API_KEYS_POOL`), reintentos con backoff exponencial, fallback multi-proveedor y modelos optimizados (Gemini 2.5 Flash / Pro).
  - Nunca se deben usar SDKs externos directamente en componentes o rutas sin pasar por `src/lib/ai-provider`.
- **Despliegue & CI/CD**: Vercel con integración a GitHub (`origin/main`), internacionalización (`next-intl`) y autenticación basada en sesiones seguras (`next-auth`).

---

## 2. Los 7 Subsistemas de Educación Media Superior y sus Particularidades

El sistema gestiona la estructura curricular de 7 subsistemas educativos:

1. **BGE (Bachillerato General Estatal)**:
   - Subsistema insignia de Puebla / EMS general.
   - Cuenta con Formación Fundamental, Formación Socioemocional (Ampliado), Formaciones Laborales (15 Capacitaciones para el Trabajo) y Formación Fundamental Extendida (FFEO y FFE Optativas).
2. **Bachillerato Tecnológico**:
   - Comparte el tronco común MCCEMS (Fundamental y Ampliado) con módulos de especialidad técnica.
3. **CBTIS (Centro de Bachillerato Tecnológico Industrial y de Servicios)**:
   - Énfasis en carreras técnicas industriales, de servicios y mantenimiento.
4. **CBTA (Centro de Bachillerato Tecnológico Agropecuario)**:
   - Énfasis en competencias agropecuarias, biotecnología y desarrollo rural sustentable.
5. **CECyTE (Colegio de Estudios Científicos y Tecnológicos del Estado)**:
   - Bachillerato bivalente científico y tecnológico.
6. **Bachillerato Digital**:
   - Modelo a distancia y mediado por tecnologías de aprendizaje con dosificación flexible.
7. **EMSAD (Educación Media Superior a Distancia)**:
   - Centros comunitarios de atención remota y semipresencial con tronco común MCCEMS.

---

## 3. Estructura de Componentes Curriculares

En la base de datos (`programs_catalog`), los programas se clasifican en 5 componentes canónicos:

| Componente (`component`) | Badge en UI | Descripción Oficial | Distribución en Catálogo |
| :--- | :--- | :--- | :---: |
| `fundamental` | 📘 `Fundamental` (Azul `#3b82f6`) | Tronco común sociocognitivo (Lengua, Matemáticas, Ciencias, Humanidades, etc.) | **189** |
| `laboral` | 💼 `3 Actividades Clave` (Ámbar `#f59e0b`) | Capacitaciones para el trabajo (15 especialidades para BGE en semestres 3.° a 6.°) | **120** |
| `ampliado` | 🌱 `Ampliado` (Esmeralda `#10b981`) | Recursos socioemocionales, Artísticas, Deportivas, PAEC y los 3 Ámbitos Semestres 3 a 6 | **91** |
| `ext_optativo` | 🎯 `Optativa` (Púrpura `#8b5cf6`) | Formación Fundamental Extendida Optativa (20 asignaturas en 5.° y 20 en 6.°) | **40** |
| `ext_obligatorio` | ⭐ `FFEO` (Rosa `#ec4899`) | Formación Fundamental Extendida Obligatoria (Laboratorio Inv., Taller Ciencias, etc.) | **9** |
| **TOTAL CATÁLOGO** | | **Catálogo Maestro Oficial** | **449** |

---

## 4. Reglas Pedagógicas y Normativas Clave

### A. Transición de Modelos Curriculares
- **Semestres 1.°, 2.°, 3.° y 4.° (Modelo 2025-2028 y posterior)**:
  - Operan bajo **Propósitos Formativos** y **Contenidos Formativos** (temas y subtemas de estudio).
  - Las progresiones ya fueron retiradas para estos semestres conforme a la actualización oficial de la SEP.
- **Semestres 5.° y 6.° (Ciclo Escolar 2026-2027 / Generación 2023-2026)**:
  - Operan con **Progresiones MCCEMS** de manera transitoria únicamente para este ciclo escolar (a partir de 2027-2028 transitarán a propósitos formativos).

### B. Formación Fundamental Extendida Optativa (FFE) y Continuidad
- **Regla de Elección**: Cada plantel/escuela elige exactamente **4 asignaturas optativas** de las 20 disponibles para 5.° semestre.
- **Regla de Continuidad Semestre 5 → 6**: En 6.° semestre los alumnos continúan obligatoriamente con la asignatura subsecuente según la tabla oficial `ffe_continuity`:
  - *Arte y Cultura I* ➔ *Arte y Cultura II*
  - *Análisis de Fenómenos y Procesos Biológicos* ➔ *Temas Selectos de Biología*
  - *Lógica y Pensamiento Crítico* ➔ *Experiencia Estética*
  - *Comunicación y Sociedad I* ➔ *Comunicación y Sociedad II*
  - *Derecho y Sociedad I* ➔ *Derecho y Sociedad II*
  - *Dibujo Técnico I* ➔ *Dibujo Técnico II*
  - *Economía I* ➔ *Economía II*
  - *Fundamentos de Administración I* ➔ *Fundamentos de Administración II*
  - *Inglés V* ➔ *Inglés VI*
  - *Organización del Flujo de Materia y Energía en los Organismos I* ➔ *Organización del Flujo de Materia en los Organismos II*
  - *Pensamiento Filosófico I* ➔ *Pensamiento Filosófico II*
  - *Pensamiento Matemático Aplicado a las Finanzas I* ➔ *Pensamiento Matemático Aplicado a las Finanzas II*
  - *Procesos Contables I* ➔ *Procesos Contables II*
  - *Psicología I* ➔ *Psicología II*
  - *Raíces Etimológicas del Español I* ➔ *Raíces Etimológicas del Español II*
  - *Salud Integral I* ➔ *Salud Integral II*
  - *Taller de Pensamiento Variacional I* ➔ *Taller de Pensamiento Variacional II*
  - *Taller de Probabilidad y Estadística I* ➔ *Taller de Probabilidad y Estadística II*
  - *Temas Selectos de Ciencias Sociales I* ➔ *Temas Selectos de Ciencias Sociales II*

### C. Formación Laboral (Capacitaciones para el Trabajo)
- En todas las capacitaciones de Formación Laboral **NO se usan progresiones**, sino **exactamente 3 Actividades Clave**.
- Cada Actividad Clave comprende un bloque formativo de **18 horas lectivas** (total 54 horas por semestre / 3 h/sem).
- Incluye criterios de desempeño técnico, saberes teórico-prácticos y normas de seguridad.

---

## 5. Estado de las Fases del Proyecto

- ✅ **Fase 1: Motor de Currícula y Gestión de Catálogo**:
  - Estructuración de 449 programas en Neon DB.
  - Soporte para 7 subsistemas con badges y filtros en tiempo real.
  - CRUD completo de programas y módulo de reemplazo con IA vía PDF oficial en `AdminClient.tsx`.
  - Corrección de badges y filtros FFE / FFEO / Laboral / Ampliado / Fundamental.
- ✅ **Fase 2: Motor de Auditoría y Alineación Pedagógica Inteligente (COMPLETADA)**:
  - Paso 1: Enriquecimiento de programas con datos auténticos (100% de los 449 programas con datos reales de DOCX y PDFs oficiales).
  - Paso 2: Esquema `audit_results` y tabla de continuidad `ffe_continuity` con los 20 pares oficiales.
  - Paso 3: Motor de auditoría en `src/lib/audit-engine.ts` y APIs REST `/api/audit` y `/api/audit/[id]`.
  - Paso 4: UI de auditoría y Scorecard 4D interactivo en el panel de administración.
- ✅ **Fase 3: Optimización del Generador y Alineación de Prompts (COMPLETADA)**:
  - Paso 1: Revisión y diagnóstico de `build-prompt.ts` y del flujo de generación en streaming.
  - Paso 2: Actualización de `build-prompt.ts` con inyección de catálogo auténtico (`officialProgram`), propósitos y contenidos temáticos oficiales, 3 Actividades Clave para Formación Laboral (18h c/u), y continuidad FFE (5° a 6° semestre).
  - Paso 3: Integración de retroalimentación de auditoría pedagógica previa (`auditFeedback` desde `audit_results`) en regeneraciones de planeaciones para subsanar observaciones de calidad.
  - Paso 4: Sincronización verificada con PAEC-PEC (`/api/paec`), PMC (`/api/pmc`), y contexto normativo (`src/lib/normativa-context.ts`).
  - Paso 5: Verificación de compilación limpia con `npm run build` (0 errores) y pruebas E2E exitosas.
- ✅ **Fase 4: Módulo de Horarios Inteligente, UX y Rendimiento (COMPLETADA)**:
  - Paso 1: Módulo de Horarios Inteligente (tabla `schedules`, endpoints `/api/schedules`, `/api/schedules/[id]` y `/api/schedules/[id]/optimize` conectado al solver Min-Conflicts CSP y diagnóstico IA de balance de jornada docente).
  - Paso 2: Ajustes de UX en Malla y Auditoría (vistas Tabla, Calendario por Cortes evaluativos de 6 semanas y Matriz Comparativa antes/después de auditoría con exportación 1-click a DOCX institucional).
  - Paso 3: Sistema de Notificaciones y Alertas (tabla `notifications`, API `/api/notifications`, componente interactivo `NotificationBell` integrado en la barra de navegación).
  - Paso 4: Optimización de Rendimiento (`src/lib/catalog-cache.ts` con caché en memoria TTL 10 min para los 449 programas y 9 índices optimizados en Neon DB).
  - Paso 5: Verificación completa de compilación (`npm run build` exitoso con código 0) y pruebas de base de datos (`verify-phase4.mjs`).
- ✅ **Fase 4.5**: Motor de Horarios Escolar de Alto Rendimiento (Solver Multiobjetivo CSP, Asistente Neuro-Simbólico, Cuádruple Vista, Exportación Excel)
  - Paso 1: **Solver Multiobjetivo Calibrado** (`src/lib/horarios/solver.ts`): Implementación de la función objetivo Soft Score (0 a 100 puntos), métricas pedagógicas detalladas (huecos intermedios docentes/grupos, días aislados de 1 hora, dispersión de asignaturas de alta carga, bonificación por bloques dobles). Rendimiento benchmark comprobado de **4 ms** para 6 grupos, 18 docentes y 180 horas lectivas (< 300 ms) con 0 empalmes garantizados.
  - Paso 2: **Asistente Neuro-Simbólico y Validador Previo** (`src/lib/ai-schedule-assistant.ts`): Validación matemática previa en O(1) que detecta sobrecargas y solicitudes imposibles antes de invocar al LLM; router formal de acciones JSON deterministas; integración robusta con `ai-provider` institucional y rotación de claves.
  - Paso 3: **Cuádruple Vista Institucional** (`EditorHorarios.tsx`): 📊 Horario Maestro Sumario, 👥 Por Grupo con codificación de colores por campo formativo, 👨‍🏫 Por Docente con desglose de días libres y horas semanales, 🏢 Ocupación de Aulas y Laboratorios con mapa de calor de infraestructura.
  - Paso 4: **Exportación Integral Multi-Hoja** (`src/lib/horarios/exportador.ts`): Generador de libro Excel `.xlsx` multi-pestaña completo (Maestro, Hojas individuales por Grupo, Hojas individuales por Docente, Mapa de Aulas) con membretes oficiales SEP Estado de Puebla y Supervisión de Zona Escolar.
  - Paso 5: **Verificación y Benchmark**: `npm run build` exitoso con 0 errores de TypeScript y benchmark complejo validado con 100% de éxito.

- ✅ **Fase 5: Ecosistema Integral de Producción, Autenticación, Cartografía, Monetización y Visor Dual (COMPLETADA)**:
  - Paso 1: **Autenticación Híbrida y Gestión de Cuentas** (`src/lib/auth.ts`, `src/lib/db.ts`, `src/components/auth/AuthCard.tsx`): Integración de `CredentialsProvider` con hashing `bcrypt` (10 rounds) junto a Google OAuth; endpoints `/api/auth/register`, `/api/auth/forgot-password`, `/api/auth/reset-password`; migración de columnas `password_hash`, `reset_token`, `reset_token_expires` en tabla `teachers`; pantalla de login con pestañas (Iniciar Sesión, Registrarse, Recuperar Contraseña) y selección de CCT/escuela/subsistema.
  - Paso 2: **Consolidación de Cartografía de Zona Escolar (antes PIPS)** (`src/app/[locale]/pips`, `PipsWizard.tsx`, `src/lib/pips-docx-generator.ts`): Renombramiento oficial en UI, navegación, badges y generadores; estructuración del asistente en 4 fases territoriales de supervisión con soporte para hasta 30 planteles; generación de documentos oficiales con membrete SEP Puebla / DBEPA.
  - Paso 3: **Monetización y Planes por Rol con Stripe** (`src/lib/stripe.ts`, `SuscripcionClient.tsx`, `/api/stripe/checkout`, `/api/stripe/webhook`, `/api/stripe/portal`): Planes segmentados por perfil (Docente 1/3/5/10 materias, Directivo Horarios+PMC, Supervisión Cartografía, Institucional Escuela Completa); enforzamiento de límites y portal de autoservicio para administración y cancelación de suscripciones.
  - Paso 4: **Visor Editorial A4 y Exportación Dual (DOCX + PDF)** (`src/components/common/DocumentA4Viewer.tsx`, `src/lib/pdf-generator.ts`, `PlanningDetailClient.tsx`): Visor interactivo en proporción A4 con membrete oficial SEP, zoom responsivo (50%-150%), soporte de impresión directa, y botones de descarga dual 1-click para Word (.docx) y PDF con autoTable.
  - Paso 5: **Verificación y Pruebas E2E**: `scripts/test-phase5-e2e.mjs` y `scripts/test-auth-cycle.mjs` aprobados al 100%; `npm run build` ejecutado exitosamente con **Exit Code 0** (98/98 páginas y APIs compiladas limpiamente).

---

## 6. Fase 6: Suite de Co-Creación Pedagógica de Alta Precisión (EN PROGRESO)

### ✅ Fase 6A: Editor Pedagógico Estructurado por Bloques (COMPLETADA)
- **Dependencias instaladas**: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm`, `@tiptap/extension-placeholder`, `@tiptap/extension-underline`, `@tiptap/extension-text-align`, `@tiptap/extension-highlight`, `@tiptap/extension-table`, `@tiptap/extension-table-row`, `@tiptap/extension-table-cell`, `@tiptap/extension-table-header`, `@tiptap/extension-bullet-list`, `@tiptap/extension-ordered-list`, `qrcode`.
- **Nodos semánticos personalizados** (`src/components/planeacion/editor-extensions.ts`): `BloqueApertura`, `BloqueDesarrollo`, `BloqueCierre`, `BloqueRubrica`, `BloqueProposito`, `BloqueActividad`, `BloqueSeccion`.
- **Barra de herramientas con comandos IA** (`src/components/planeacion/editor-toolbar.tsx`): `/rubrica`, `/adaptar-abp`, `/simplificar-bap`, `/ejercicios`, `/contenido`, `/evaluacion`, `/reflexion`.
- **Componente principal** (`src/components/planeacion/PlanningEditor.tsx`): Conversión `GeneratedPlanningContent` ↔ HTML, guardado JSON via `PUT /api/plannings/[id]`, exportación DOCX.
- **API de guardado**: `PUT /api/plannings/[id]` con `updatePlanningContent()`.
- **Página de detalle**: `/[locale]/dashboard/planning/[id]/page.tsx` con `PlanningEditorWrapper`.
- **Dashboard**: Enlace "✏️ Editar" agregado en cada tarjeta de planeación.
- **Build verificado**: `npm run build` Exit Code 0.

### ✅ Fase 6B: Motor de RAG Curricular con pgvector (COMPLETADA)
- **pgvector habilitado** en Neon DB con extensión `vector`.
- **Tabla `curriculum_embeddings`**: id, program_id, uac_name, semester, component, subsystem, chunk_type, chunk_text, embedding (VECTOR 768), metadata (JSONB).
- **Índice HNSW** para búsqueda por similitud de coseno.
- **Función SQL `search_curriculum`**: Búsqueda vectorial con filtros por semestre, componente, subsistema.
- **Módulo `src/lib/rag-curricular.ts`**: `generateEmbedding()` vía Gemini, `searchCurriculum()` con fallback text-based, `buildRagContextBlock()` para inyección en prompts.
- **Script de ingesta** (`scripts/ingest-curriculum-embeddings.mjs`): Procesa los 449 programas, genera embeddings con Gemini `text-embedding-004`, almacena en pgvector.
- **Integración en `build-prompt.ts`**: Parámetro `ragContext` para inyectar contexto curricular recuperado semánticamente.
- **Build verificado**: Exit Code 0.

### ✅ Fase 6C: Generador de Bundles Didácticos de Aula en 1-Click (COMPLETADA)
- **Módulo `src/lib/bundle-generator.ts`**: Genera 4 materiales complementarios con IA:
  - Guía de Trabajo del Alumno (imprimible A4)
  - Instrumento de Coevaluación/Autoevaluación (fotocopiable)
  - Guion de Diapositivas de la Lección (estructura visual)
  - Quiz/Evaluación Diagnóstica (5-10 reactivos)
- **API `/api/bundles/generate`**: Generación individual o completa de bundles.
- **Componente UI** (`src/components/planeacion/BundleGenerator.tsx`): Botones de generación 1-Click con descarga en Markdown.
- **Integración** en `/[locale]/dashboard/planning/[id]/` debajo del editor.
- **Build verificado**: Exit Code 0.

### ✅ Fase 6D: Firma Digital Criptográfica y Verificador Público con Código QR (COMPLETADA)
- **Módulo `src/lib/digital-signature.ts`**: Firma SHA-256, generación QR, verificación, páginas de verificación HTML.
- **Tabla `document_signatures`**: hash (UNIQUE), timestamp, signer_name, signer_role, cct, document_type, document_id.
- **API `/api/signatures`**: Endpoint POST para firmar documentos.
- **Ruta pública `/validar/[hash]`**: Página de verificación desde celular sin login.
- **Build verificado**: Exit Code 0.

### ⏳ Fase 7: Inteligencia de Supervisión, Control de Zona y Generación de Oficios (SISAT-ATP) (PENDIENTE)

**NOTA CRÍTICA**: SISAT-ATP NO maneja calificaciones ni deserción de alumnos individuales. Eso lo cubren SICEP y SiATECCE. Esta fase se enfoca exclusivamente en automatizar el trabajo de Supervisión de Zona (~17 planteles).

- **7A. Motor de Pre-evaluación y Auditoría IA de Documentos** (PMC, PAEC, CAPEMS):
  - Análisis IA de documentos subidos por directores (PMC, PAEC, CAPEMS).
  - Verificación automática de cumplimiento normativo (formato DBEPA, firmas, anexos).
  - Score de calidad y observaciones automáticas antes de que el Supervisor revise.
  - Comparación contra plantilla oficial SEP Puebla.

- **7B. Cédulas Móviles de Supervisión con Dictado de Voz**:
  - Formularios dinámicos para visitas de campo (Observación de Clase, Infraestructura, Diagnóstico de Plantel).
  - Dictado por voz → transcripción automática → clasificación en cédula oficial.
  - Modo offline para planteles rurales sin conectividad.
  - Plantillas precargadas: Lista de cotejo de infraestructura, Registro de incidencias.

- **7C. Matriz de Control de Entregas y Semáforos de Cumplimiento**:
  - Vista tipo spreadsheet de todos los ~17 planteles de la zona.
  - Semáforo por documento: PMC ✓/✗, PAEC ✓/✗, CAPEMS ✓/✗, Entrega de evidencias ✓/✗.
  - Filtros por estatus: "Pendientes", "En revisión", "Aprobados", "Con observaciones".
  - Recordatorios automáticos a directores con documentos faltantes.
  - Exportación del estatus a Excel/PDF para reporte al Nivel.

- **7D. Generador Inteligente de Oficios, Dictámenes y Reportes al Nivel**:
  - Plantilla de oficios institucionales (CEDAVIM, 25N, Minutas).
  - Generación automática de borradores con datos de la zona (director, CCT, fechas, asunto).
  - Generador de Dictamen Técnico de Supervisión con acuerdos y compromisos.
  - Generador de Reporte General de Supervisión Trimestral al Nivel.
  - Exportación a DOCX con membrete oficial SEP Puebla.

---

## 7. Convenciones de Desarrollo y Restricciones Críticas
1. **Integridad de Base de Datos**: Nunca alterar destructivamente las columnas existentes de `programs_catalog`, `pips_projects` ni `plannings`.
2. **Llamadas a IA**: Utilizar siempre `getAIProvider()` o `generateWithRotation()` de `src/lib/ai-provider`.
3. **Validación de Compilación**: Verificar siempre que `npm run build` pase con 0 errores de TypeScript antes de finalizar.

