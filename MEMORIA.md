# Manual Técnico y Memoria de Arquitectura - DidactecaIA

Documento de referencia técnica para **DidactecaIA (Plataforma Inteligente para Secuencias y Planeaciones Didácticas · DBEPA Puebla)**.

---

## 1. Arquitectura General y Stack Tecnológico

- **Framework Principal**: **Next.js 15+** (App Router).
- **Base de Datos**: PostgreSQL alojada en [Neon](https://neon.tech/) Serverless.
- **Conector DB**: `@neondatabase/serverless` (consultas SQL directas y parametrizadas).
- **Autenticación**: **Auth.js / NextAuth.js** usando credenciales y tokens JWT.
- **Modelos IA Autorizados**: `gemini-3.5-flash-lite` (predeterminado) y `gemini-3.1-flash-lite` (reserva).

---

## 2. Módulo: Generador Inteligente de Horarios Escolar

### 2.1 Visión General
Módulo diseñado para Directores de Plantel que permite generar la plantilla de horarios sin empalmes docentes ni de aulas, alineado al **Mapa Curricular Oficial MCCEMS (DBEPA Puebla 2026-2027)**.

### 2.2 Componentes de UI
- `src/app/[locale]/horarios/page.tsx`: Server Component con verificación de autenticación y permisos de Director/Admin.
- `src/app/[locale]/horarios/HorariosDashboardClient.tsx`: Client Shell que orquesta el Wizard y el Editor. Maneja la apertura automática del modal de Mapa Curricular si `mapaCurricularCompletado === false`.
- `src/components/horarios/WizardConfiguracion.tsx`: Wizard interactivo de 3 pasos:
  1. **Paso 1 — Estructura & Currículum**: Concurrencia de grupos por semestre (1° a 6°), selección de Período Semestral (Semestre A: 1°,3°,5° | Semestre B: 2°,4°,6°), modo Semiautomático vs Manual Tecnológico (CBTIS), Formaciones Laborales y Optativas FFE.
  2. **Paso 2 — Plantilla Docente**: Carga automática desde los expedientes de personal (`/api/expedientes/personal`), horas de nombramiento oficial (20 hrs por defecto), adición de docentes manuales.
  3. **Paso 3 — Matriz por Semestre**: Asignación de docente por UAC/materia y grupo.
- `src/components/horarios/EditorHorarios.tsx`: Visualizador e impresor del horario generado (PDF por grupo, PDF por docente, exportación Excel).
- `src/components/ModalConfiguracionMapaCurricular.tsx`: Modal para definir el mapa curricular de la escuela.

### 2.3 Endpoints API (Backend)
- `GET/POST/DELETE /api/horarios/configuracion`: Lee, guarda o borra la configuración de horario, grupos y cargas en Neon.
- `POST /api/horarios/generar`: Invoca el motor de resolución de restricciones para construir el horario sin empalmes.
- `GET/POST /api/horarios/catalogos`: Gestiona el catálogo de docentes de la plataforma o docentes manuales.
- `GET /api/expedientes/personal`: Consulta los docentes de la tabla `teachers` con formateo de cargo e id seguro.

### 2.4 Tablas en Neon PostgreSQL
- **`horario_config`**: Almacena configuración del plantel (días lectivos, horas por día, hora inicio, período A/B, g1, g2, g3, mapa_curricular_completado). Llave única `teacher_id`.
- **`horario_grupos`**: Guarda los grupos configurados por el plantel. Llave única `(teacher_id, nombre)`.
- **`horario_cargas`**: Registra la asignación docente-materia-grupo. Llave única `(teacher_id, grupo_nombre, uac_name)`.
- **Índices**: `idx_horario_grupos_teacher`, `idx_horario_cargas_teacher`.
- **Triggers**: `horario_config_updated_at` para actualización automática de `updated_at`.

---

## 3. Registro de Correcciones Críticas en Módulo de Horarios

1. **Visibilidad de Inputs de Grupos (`WizardConfiguracion.tsx`)**: Se corrigió el contraste de los inputs de número de grupos (`g1`, `g2`, `g3`) en Paso 1, aplicando `background: "#ffffff"` y `color: "#1e293b"`.
2. **Inicialización de Grupos en BD Vacía (`WizardConfiguracion.tsx`)**: Se ajustó el `useEffect` de inicialización usando `!inicializadoDesdeBD` para asegurar que el formulario siempre presente la estructura por defecto si la base de datos no tiene grupos previos.
3. **Persistencia SQL Integrada (`apply-schema-horarios.js`)**: Migración ejecutada exitosamente en Neon PostgreSQL para garantizar la persistencia de datos en producción.
