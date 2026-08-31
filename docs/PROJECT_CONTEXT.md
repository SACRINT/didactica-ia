# PROJECT CONTEXT — SIGPDA-EMS (Sistema Integral de Gestión Pedagógica y Docente para Educación Media Superior)

> **Documento de Memoria Central y Arquitectura de Referencia**  
> *Última actualización: Agosto 2026*

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
- 🟡 **Fase 2: Motor de Auditoría y Alineación Pedagógica Inteligente (EN PROGRESO)**:
  - Paso 1: Enriquecimiento de programas con datos auténticos (reemplazo de placeholders por propósitos/progresiones reales de DOCX y PDFs).
  - Paso 2: Esquema `audit_results` y `ffe_continuity`.
  - Paso 3: Motor de auditoría en `src/lib/audit-engine.ts` y API `/api/audit`.
  - Paso 4: UI de auditoría y Scorecard 4D en panel administrativo.
- ⚪ **Fase 3: Optimización del Generador y Alineación de Prompts**:
  - Actualización de prompts de generación de secuencias didácticas para utilizar el catálogo enriquecido.
  - Sincronización con PAEC-PEC y PMC.

---

## 6. Convenciones de Desarrollo y Restricciones Críticas
1. **Integridad de Base de Datos**: Nunca alterar destructivamente las columnas existentes de `programs_catalog` ni `plannings`.
2. **Llamadas a IA**: Utilizar siempre `getAIProvider()` o `generateWithRotation()` de `src/lib/ai-provider`.
3. **Validación de Compilación**: Verificar siempre que `npm run build` pase con 0 errores de TypeScript antes de finalizar.
