# MEMORIA.md — DidactecaIA

> Última actualización: 2026-08-05
> Estado: Módulos 1-4 completos. Módulo 5 (Normativa) en planificación.

---

## 1. DESCRIPCIÓN DEL PROYECTO

**DidactecaIA** es una plataforma SaaS de suscripción para docentes del Bachillerato General Estatal (BGE), Bachillerato Digital y EMSAD del Estado de Puebla. Genera con IA documentos pedagógicos institucionales: Planeaciones Didácticas, PAEC-PEC, PMC y PIPS.

**Dominio de negocio:** Plataforma privada. Las cuentas son personales. Nadie puede revisar el contenido de otro usuario, ni directores ni supervisores. El administrador del sistema es la única excepción técnica. El control de entregas (expedientes, validaciones OCR) es exclusivo de SISAT-ATP, proyecto separado.

**Stack tecnológico:**
- **Frontend/Backend:** Next.js 14+ App Router, TypeScript, Neon PostgreSQL Serverless
- **IA:** Gemini (pool de API keys con Round-Robin), Claude (via Anthropic para planeaciones streaming)
- **Auth:** NextAuth.js
- **Pagos:** Stripe (webhooks + Checkout Session)
- **Estilos:** CSS global (src/app/globals.css)
- **Deploy:** Vercel (runtime nodejs, maxDuration 120s en routes de generación)

---

## 2. ESTRUCTURA DE CARPETAS CRÍTICAS

```
src/
├── app/
│   ├── api/
│   │   ├── admin/
│   │   ├── biblioteca-personal/
│   │   ├── generation-feedback/
│   │   ├── paec/[id]/generate-step/
│   │   ├── pedagogical-analytics/
│   │   ├── pips/[id]/generate/
│   │   ├── plannings/[id]/generate/
│   │   ├── pmc/[id]/generate-step/
│   │   └── stripe/
│   └── [locale]/
│       ├── admin/
│       ├── biblioteca-personal/
│       ├── dashboard/
│       ├── mi-progreso/
│       ├── nueva-planeacion/
│       ├── paec/
│       ├── pips/
│       ├── planeacion/[id]/
│       └── pmc/
├── lib/
│   ├── ai-provider/
│   ├── context-extractor.ts
│   ├── db.ts
│   ├── gemini.ts
│   ├── claude.ts
│   ├── pedagogical-analytics.ts
│   ├── pdf-parser.ts
│   ├── pmc-docx-generator.ts
│   ├── paec-docx-generator.ts
│   ├── pips-docx-generator.ts
│   └── prompts/
│       ├── system-prompt.ts
│       ├── paec-prompts.ts
│       ├── pips-chunks.ts
│       ├── build-prompt.ts
│       └── extras-prompts.ts
└── components/
    ├── feedback/GenerationFeedback.tsx
    ├── admin/
    └── layout/AppLayout.tsx
```

---

## 3. ESQUEMA DE BASE DE DATOS (Neon PostgreSQL)

### Tabla: teachers
```
id, name, email (UNIQUE), school_name, municipality, subsystem, cct,
custom_api_key, custom_api_provider, role ('user'|'admin'),
profile_completed, school_locked, last_seen_at,
custom_preferences JSONB,
created_at
```

### Tabla: plannings
```
id, teacher_id → teachers.id, school_year, uac_name, semester, groups,
component, subsystem, hours_per_week, content (JSONB), status,
created_at, updated_at
```

### Tabla: pmc_projects
```
id, teacher_id → teachers.id, school_name, school_cct, director_name,
municipality, locality, ciclo_escolar, subsystem,
diagnostico_comunidad, indicadores_academicos (JSONB), foda (JSONB),
categorias_priorizadas (JSONB[]), staff_data (JSONB[]), total_staff,
normativa (JSONB),
diagnostico_generado (JSONB),
plan_accion (JSONB),
current_step (1-4), status, created_at, updated_at
```

### Tabla: paec_projects
```
id, teacher_id → teachers.id, school_name, community_context, school_context,
problem_statement, project_name, cycle_type ('A'|'B'|'annual'),
uacs (JSONB[]),
fase1_diagnostico, fase2_justificacion, fase3_mapeo,
fase4_cronograma, fase5_plan_operativo, fase6_anexos (todos JSONB),
current_step (1-6), status, created_at, updated_at
```

### Tabla: pips_projects
```
id, teacher_id → teachers.id, zona_nombre, zona_clave, supervisor_name,
municipio_sede, diagnostico_contexto, fortalezas_anterior,
areas_oportunidad_anterior, reflexion_pips_anterior,
presentacion_supervisor,
chunk1_result, chunk2_result, chunk3_result (TEXT Markdown),
current_step (1-3), status, created_at, updated_at
```

### Tabla: user_library_docs (Módulo 3)
```
id, teacher_email, file_name, extracted_text (TEXT),
file_type ('pdf'|'txt'), created_at
```

### Tabla: generation_feedback (Módulo 4)
```
id, teacher_id → teachers.id, entity_type ('planning'|'paec'|'pmc'|'pips'),
entity_id (UUID), rating (1-5), comment, dimension, created_at
```

### Tabla: subscriptions (Stripe)
```
id, teacher_id → teachers.id, stripe_customer_id, stripe_subscription_id,
stripe_price_id, plan_tier ('free'|'standard'|'premium'),
plan_name, plan_subjects, subscription_subjects,
status, current_period_start, current_period_end,
cancel_at_period_end, created_at, updated_at
```

### Tablas: platform_config, api_keys, activity_log
```
platform_config: key, value (JSON)
api_keys: id, provider, key_value, is_active, calls_today, last_used, blocked_until
activity_log: teacher_email, action, entity_type, entity_id, success, metadata, created_at
```

### PENDIENTES — Módulo 5 (Normativa)
```
normativa_documentos: id, titulo, tipo, fuente, vigente, orden_display, created_at
normativa_articulos: id, documento_id, numero, texto, aplicable_a TEXT[], orden_en_doc, created_at
```

---

## 4. MOTORES DE IA

### Motor Primario: Gemini (src/lib/gemini.ts)
- Función: callGeminiPool(systemInstruction, prompt, teacherId?, responseSchema?)
- Modelos estándar: gemini-3.5-flash-lite → gemini-3.1-flash-lite (fallback 404)
- Modelos premium: gemini-3.5-flash → gemini-3.1-flash → flash-lite (fallback)
- Pool: lee tabla api_keys de BD. Rotación Round-Robin global.
- Bloqueo automático: key bloqueada 60 min si recibe 429/500.
- Usado por: PMC, PAEC, PIPS, PDF parser.

### Motor Secundario: Claude via Anthropic (src/lib/claude.ts)
- Función: generateStreamWithRotation() — streaming SSE
- Prompt caching: SYSTEM_PROMPT de Planeaciones se cachea en Anthropic (~60-70% ahorro)
- Usado por: Planeaciones Didácticas (streaming en tiempo real)

---

## 5. FLUJOS DE GENERACIÓN

### Planeaciones Didácticas
```
POST /api/plannings/[id]/generate
  getUserLibraryContext(email) → contexto biblioteca
  buildPrompt(uacData) → prompt usuario
  generateStreamWithRotation() → Claude SSE streaming
```

### PAEC-PEC (6 pasos)
```
POST /api/paec/[id]/generate-step  Body: { step: 1-6 }
  getUserLibraryContext(email)
  buildPromptN(datos proyecto)
  callGeminiPool(PAEC_SYSTEM_PROMPT, prompt)
```

### PMC (3 pasos)
```
POST /api/pmc/[id]/generate-step  Body: { step: 'normativa'|'diagnostico'|'plan_accion' }
  'normativa': → Retorna NORMATIVA_BGE (próximamente: getNormativaForGenerator('pmc'))
  'diagnostico': → getUserLibraryContext + callGeminiPool
  'plan_accion': → getUserLibraryContext + callGeminiPool con diagnóstico + categorías
```

### PIPS (3 chunks)
```
POST /api/pips/[id]/generate  Body: { chunk: 1|2|3 }
  getUserLibraryContext(email)
  getChunkNPrompt(datos zona + planteles)
  callGeminiPool(PIPS_SYSTEM_PROMPT, prompt)
```

---

## 6. CONTEXTO EN PROMPTS (3 capas)

```
[SYSTEM PROMPT]     → Instrucciones base IA (cacheado Anthropic en Planeaciones)
[USER PROMPT]       → Datos del proyecto (plantel, UAC, FODA, etc.)
[NORMATIVA]         → (Módulo 5 — pendiente) Artículos desde BD
[BIBLIOTECA]        → getUserLibraryContext() — docs personales del docente
```

---

## 7. MÓDULOS IMPLEMENTADOS

### Módulo 1 — Online Status
- Columna last_seen_at en teachers (migrada)
- Endpoint POST /api/teacher-profile/heartbeat
- HeartbeatSender.tsx — actualiza cada 3 min
- isUserOnline() en AdminClient.tsx — umbral < 5 min

### Módulo 2 — Stripe Sync
- Tablas subscriptions con campos correctos
- Webhook handler checkout.session.completed con upsert completo

### Módulo 3 — Biblioteca Personal + IA Contextual
- Tabla user_library_docs
- getUserLibraryContext(email) → string inyectado en TODOS los generadores
- UI /biblioteca-personal — upload PDF/TXT + listado
- API /api/biblioteca-personal (GET, POST, DELETE)

### Módulo 4 — Analytics Pedagógico
- Tabla generation_feedback (rating 1-5, entity_type, entity_id)
- Columna teachers.custom_preferences JSONB
- getTeacherProgressSummary(teacherId) en pedagogical-analytics.ts
- API /api/generation-feedback (GET, POST)
- API /api/pedagogical-analytics (GET)
- Widget GenerationFeedback.tsx en PlanningDetailClient.tsx
- Dashboard /mi-progreso — KPIs, distribución, historial

### Módulo 5 — Normativa SEP (PENDIENTE)
- Tablas normativa_documentos + normativa_articulos
- getNormativaForGenerator(generador) en normativa-context.ts
- Integración PMC: reemplaza NORMATIVA_BGE hardcodeada
- Integración PAEC: enriquece prompts 1 y 2
- Integración PIPS: enriquece Chunk 1
- Admin UI: gestión catálogo normativo

---

## 8. SCRIPTS DE MIGRACIÓN

Ejecutar siempre con:
  cmd /c "node --env-file=.env.local scripts/<nombre>.js"

NUNCA usar: npx dotenv-cli (falla por PSSecurityException en PowerShell Windows)

| Script | Estado |
|---|---|
| scripts/apply-last-seen-at.js | Ejecutado |
| scripts/apply-stripe-schema.js | Ejecutado |
| scripts/apply-biblioteca-schema.js | Ejecutado |
| scripts/apply-analytics-schema.js | Ejecutado |
| scripts/apply-normativa-schema.js | Pendiente |
| scripts/seed-normativa.js | Pendiente |

---

## 9. NORMATECA — ESTADO

Carpeta: C:\Secuencias_Didacticas\documentos_referencia\[08] Normateca\

| Subcarpeta | # PDFs | Uso |
|---|---|---|
| Constituciones Políticas | 2 | PMC, PIPS, PAEC |
| Ley General | 20 | PMC, PAEC, PIPS |
| Ley Federal | 42 | PMC, PIPS |
| Ley Local (Puebla) | 35 | PMC, PAEC, PIPS |
| Lineamientos | 6 | Todos |
| Acuerdos | 14 | PMC, PIPS |
| Reglamentos | 19 | PMC, PIPS |
| Circulares | 13 | PIPS, PMC |
| Códigos | 15 | Referencia |
| Decreto de Creación | 1 | PMC |
| Tratados Internacionales | 1 | PAEC |
| TOTAL | ~168 | — |

NOTA: Los PDFs tienen nombres hash (825_xxxx.pdf). No se puede identificar su contenido
sin abrirlos. La estrategia es catálogo curado manualmente en BD (NO carga masiva automática).

---

## 10. REGLAS DE NEGOCIO CRÍTICAS

1. Privacidad absoluta — nadie ve el trabajo de otros usuarios
2. DidactecaIA no es SISAT-ATP — sin expedientes, sin control de entregas, sin revisión por ATPs
3. Suscripción activa como gate para usar generadores (Stripe)
4. Contexto biblioteca se inyecta SIEMPRE en todos los generadores
5. Normativa centralizada en BD (no hardcodeada), con fallback a NORMATIVA_BGE si BD vacía
6. Prompts NO inventan datos — todo viene de la información del docente

---

## 11. GOTCHAS IMPORTANTES

- Gemini pool: si todas las keys están bloqueadas (429), el usuario verá error
- pdfjs-dist: requiere runtime nodejs (no edge), máx 60 páginas, falla con PDFs escaneados
- Neon serverless: instanciar neon() dentro de la función, no a nivel módulo global
- Streaming Claude: routes de Planeaciones retornan ReadableStream SSE
- Windows scripts: usar cmd /c "node --env-file=.env.local", nunca npx dotenv-cli
