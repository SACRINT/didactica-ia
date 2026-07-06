import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTeacherByEmail } from '@/lib/db';
import { neon } from '@neondatabase/serverless';
import OpenAI from 'openai';


export const runtime = 'nodejs';
export const maxDuration = 120;

const sql = neon(process.env.DATABASE_URL!);

// Lazily instantiate OpenAI to avoid build-time errors when env var is missing
function getOpenAI() {
  const OpenAI = require('openai').default as typeof import('openai').default;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

type RouteContext = { params: Promise<{ id: string }> };
type StepType = 'normativa' | 'diagnostico' | 'plan_accion';

// ─── Fixed Normativa JSON ────────────────────────────────────────────────────
const NORMATIVA_BGE = {
  titulo: 'Marco Normativo',
  descripcion:
    'El presente Plan de Mejora Continua (PMC) se sustenta en el siguiente marco jurídico y normativo vigente para el Bachillerato General del Estado de Puebla (BGE), dependiente de la Dirección de Bachillerato y Educación Para Adultos (DBEPA).',
  documentos: [
    {
      orden: 1,
      titulo: 'Constitución Política de los Estados Unidos Mexicanos',
      articulos: ['Artículo 3° — establece el derecho a la educación y los principios que la rigen.'],
    },
    {
      orden: 2,
      titulo: 'Ley General de Educación (2019)',
      articulos: [
        'Artículo 14 — obligatoriedad de la educación media superior.',
        'Artículo 16 — criterios que orientan la educación pública.',
        'Artículo 18 — inclusión, equidad y excelencia educativa.',
      ],
    },
    {
      orden: 3,
      titulo: 'Ley General del Sistema para la Carrera de las Maestras y los Maestros (LGSCMM, 2019)',
      articulos: [
        'Artículo 4° — definición de la función docente y directiva.',
        'Artículo 69 — atribuciones de las autoridades educativas en EMS.',
      ],
    },
    {
      orden: 4,
      titulo: 'Plan Nacional de Desarrollo 2019-2024 / 2025-2030',
      articulos: [
        'Eje 2: Política Social — "La educación al servicio del pueblo".',
        'Prioridad de reducción del abandono escolar en EMS.',
      ],
    },
    {
      orden: 5,
      titulo: 'Nueva Escuela Mexicana (NEM)',
      articulos: [
        'Marco curricular basado en el aprendizaje situado, comunitario y crítico.',
        'MCCEMS — Marco Curricular Común de la Educación Media Superior.',
      ],
    },
    {
      orden: 6,
      titulo: 'Acuerdo Secretarial 14/08/22 — MCCEMS',
      articulos: [
        'Define los aprendizajes fundamentales para el egreso de EMS.',
        'Establece las 8 categorías de gestión educativa para la mejora continua.',
      ],
    },
    {
      orden: 7,
      titulo: 'Lineamientos para la Planeación de la Mejora Continua 2025-2026 — DBEPA',
      articulos: [
        'Establece la metodología PMC para planteles BGE del Estado de Puebla.',
        'Define estructura, proceso de elaboración, seguimiento y evaluación del PMC.',
        'Señala las 8 categorías priorizables: (1) Desarrollo académico y del aprendizaje, (2) Convivencia escolar y formación integral, (3) Gestión escolar y liderazgo directivo, (4) Planta docente y desarrollo profesional, (5) Vinculación con la comunidad, (6) Infraestructura y recursos educativos, (7) Atención y permanencia del alumnado, (8) Salud, bienestar y vida saludable.',
      ],
    },
    {
      orden: 8,
      titulo: 'Programa Sectorial de Educación 2020-2024 / 2025-2030 — SEP',
      articulos: [
        'Objetivo 1 — Garantizar el derecho a la educación inclusiva, equitativa y de calidad.',
        'Objetivo 3 — Fortalecer la gestión educativa y la participación social.',
      ],
    },
    {
      orden: 9,
      titulo: 'Reglamento de las Condiciones Generales de Trabajo — BGE Puebla',
      articulos: [
        'Define las obligaciones del personal directivo, docente y administrativo.',
        'Sustenta la elaboración y seguimiento del PMC como responsabilidad institucional.',
      ],
    },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function safeStr(val: unknown): string {
  if (val === null || val === undefined) return 'N/D';
  if (typeof val === 'string') return val || 'N/D';
  return String(val);
}

function parseJson<T = unknown>(val: unknown): T | Record<string, never> {
  if (!val) return {} as Record<string, never>;
  if (typeof val === 'object') return val as T;
  try {
    return JSON.parse(String(val)) as T;
  } catch {
    return {} as Record<string, never>;
  }
}

function cleanJsonResponse(text: string): string {
  return text
    .replace(/^```(?:json)?\n?/m, '')
    .replace(/\n?```$/m, '')
    .trim();
}

// ─── Route ───────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const teacher = await getTeacherByEmail(session.user.email);
    if (!teacher) {
      return NextResponse.json({ error: 'Docente no encontrado' }, { status: 404 });
    }

    const { id } = await params;

    const [project] = await sql`
      SELECT *
      FROM pmc_projects
      WHERE id = ${id}
        AND teacher_id = ${teacher.id}
    `;

    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    const body = await request.json() as { step?: string };
    const step = body.step as StepType | undefined;

    if (!step || !['normativa', 'diagnostico', 'plan_accion'].includes(step)) {
      return NextResponse.json(
        { error: "El paso debe ser 'normativa', 'diagnostico' o 'plan_accion'" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // ── NORMATIVA ────────────────────────────────────────────────────────────
    if (step === 'normativa') {
      const [updated] = await sql`
        UPDATE pmc_projects
        SET normativa = ${JSON.stringify(NORMATIVA_BGE)},
            current_step = GREATEST(current_step, 2),
            updated_at = ${now}
        WHERE id = ${id}
          AND teacher_id = ${teacher.id}
        RETURNING *
      `;
      return NextResponse.json({ success: true, step, data: NORMATIVA_BGE, project: updated });
    }

    // ── DIAGNÓSTICO ──────────────────────────────────────────────────────────
    if (step === 'diagnostico') {
      const indic = parseJson<{
        aprobacion_ant?: number;
        reprobacion_ant?: number;
        abandono_ant?: number;
        et_ant?: number;
        aprobacion_meta?: number;
        abandono_meta?: number;
        et_meta?: number;
        matricula?: number;
      }>(project.indicadores_academicos);

      const foda = parseJson<{
        fortalezas?: string;
        oportunidades?: string;
        debilidades?: string;
        amenazas?: string;
      }>(project.foda);

      const prompt = `Eres un experto en gestión directiva de planteles de Bachillerato General del Estado de Puebla (BGE), alineado a los Lineamientos para la Planeación de la Mejora Continua 2025-2026 de la DBEPA.

Con base en la siguiente información del plantel "${safeStr(project.school_name)}" (CCT: ${safeStr(project.school_cct)}), ubicado en ${safeStr(project.locality)}, municipio de ${safeStr(project.municipality)}, Puebla:

Contexto comunitario:
${safeStr(project.diagnostico_comunidad)}

Indicadores académicos del ciclo anterior:
- Aprobación: ${indic.aprobacion_ant ?? 'N/D'}%
- Reprobación: ${indic.reprobacion_ant ?? 'N/D'}%
- Abandono escolar: ${indic.abandono_ant ?? 'N/D'}%
- Eficiencia terminal: ${indic.et_ant ?? 'N/D'}%

Metas para el ciclo ${safeStr(project.ciclo_escolar)}:
- Aprobación: ${indic.aprobacion_meta ?? 'N/D'}%
- Abandono: ${indic.abandono_meta ?? 'N/D'}%
- Eficiencia terminal: ${indic.et_meta ?? 'N/D'}%

Matrícula: ${indic.matricula ?? 'N/D'} alumnos

FODA del plantel:
- Fortalezas: ${safeStr(foda.fortalezas)}
- Oportunidades: ${safeStr(foda.oportunidades)}
- Debilidades: ${safeStr(foda.debilidades)}
- Amenazas: ${safeStr(foda.amenazas)}

Genera el apartado de DIAGNÓSTICO del PMC con:
1. presentacion: (texto de presentación del PMC, 2-3 párrafos, mención a NEM y MCCEMS, qué es el PMC y su importancia)
2. contexto: (narrativa del contexto comunitario y del plantel, 2-3 párrafos con datos reales proporcionados)
3. analisis_indicadores: (análisis interpretativo de los indicadores académicos con datos numéricos, justificación de metas, 2-3 párrafos)
4. sintesis_foda: (síntesis del FODA en 2 párrafos: áreas de fortaleza y áreas de oportunidad detectadas)
5. priorizacion: (narrativa de priorización de problemas para el ciclo, 1-2 párrafos)

Responde con JSON con exactamente estas 5 claves. Texto formal y técnico. NO inventes datos no proporcionados.`;

      const response = await getOpenAI().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente experto en planeación educativa para el BGE de Puebla. Responde siempre con JSON válido y bien formado.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 4096,
      });

      const rawText = response.choices[0]?.message?.content ?? '{}';
      let parsedDiag: object;
      try {
        parsedDiag = JSON.parse(cleanJsonResponse(rawText));
      } catch {
        return NextResponse.json(
          { error: 'La IA no retornó un formato JSON válido. Por favor reintenta.' },
          { status: 500 }
        );
      }

      const [updated] = await sql`
        UPDATE pmc_projects
        SET diagnostico_generado = ${JSON.stringify(parsedDiag)},
            current_step = GREATEST(current_step, 3),
            updated_at = ${now}
        WHERE id = ${id}
          AND teacher_id = ${teacher.id}
        RETURNING *
      `;
      return NextResponse.json({ success: true, step, diagnostico_generado: parsedDiag, project: updated });
    }

    // ── PLAN DE ACCIÓN ───────────────────────────────────────────────────────
    if (step === 'plan_accion') {
      const indic = parseJson<{
        aprobacion_ant?: number;
        reprobacion_ant?: number;
        abandono_ant?: number;
        et_ant?: number;
        aprobacion_meta?: number;
        abandono_meta?: number;
        et_meta?: number;
      }>(project.indicadores_academicos);

      const diagnosticoGenerado = parseJson<Record<string, string>>(project.diagnostico_generado);
      const diagnosticoResumen = [
        diagnosticoGenerado.presentacion ?? '',
        diagnosticoGenerado.contexto ?? '',
        diagnosticoGenerado.analisis_indicadores ?? '',
      ]
        .filter(Boolean)
        .join('\n\n')
        .substring(0, 2000);

      // categorias_priorizadas may be string[] like ['1','2','3'] or object[]
      const CATEGORIA_NAMES: Record<string, string> = {
        '1': 'Desarrollo académico y del aprendizaje',
        '2': 'Gestión y administración escolar',
        '3': 'Desarrollo socioemocional y prevención de la violencia',
        '4': 'Proyectos educativos transversales',
        '5': 'Indicadores académicos',
        '6': 'Seguridad, convivencia y prevención',
        '7': 'Seguimiento de egresados',
      };
      const rawCategorias = parseJson<unknown[]>(project.categorias_priorizadas);
      const categoriasStr = Array.isArray(rawCategorias)
        ? rawCategorias.map((c) => {
            if (typeof c === 'string') return `- Categoría ${c}: ${CATEGORIA_NAMES[c] ?? 'Sin nombre'}`;
            const obj = c as { id?: string; nombre?: string };
            return `- Categoría ${obj.id ?? '?'}: ${obj.nombre ?? CATEGORIA_NAMES[obj.id ?? ''] ?? 'Sin nombre'}`;
          }).join('\n')
        : 'No especificadas';

      const staffData = parseJson<{ nombre?: string; cargo?: string }[]>(project.staff_data);
      const staffList = Array.isArray(staffData)
        ? staffData.map((s) => `- ${s.nombre ?? 'N/D'} — ${s.cargo ?? 'N/D'}`).join('\n')
        : 'No especificado';

      const prompt = `Eres un experto en planeación de mejora continua para planteles BGE de Puebla bajo metodología SMART.

Plantel: ${safeStr(project.school_name)} | CCT: ${safeStr(project.school_cct)} | Ciclo: ${safeStr(project.ciclo_escolar)}
Director(a): ${safeStr(project.director_name)}

Diagnóstico generado:
${diagnosticoResumen}

Indicadores actuales:
- Abandono: ${indic.abandono_ant ?? 'N/D'}% → Meta: ${indic.abandono_meta ?? 'N/D'}%
- Aprobación: ${indic.aprobacion_ant ?? 'N/D'}% → Meta: ${indic.aprobacion_meta ?? 'N/D'}%
- Eficiencia terminal: ${indic.et_ant ?? 'N/D'}% → Meta: ${indic.et_meta ?? 'N/D'}%

Categorías priorizadas por el director:
${categoriasStr}

Personal del plantel (${project.total_staff ?? 0} trabajadores):
${staffList}

Instrucciones:
1. Genera el Plan de Acción con al menos UNA meta por cada categoría priorizada, mínimo 3 metas en total.
2. Para CADA TRABAJADOR del personal listado, genera su meta individual específica acorde a su cargo.
3. Las metas deben ser SMART: verbo de resultado medible + porcentaje o número + plazo específico.
4. Los entregables DEBEN ser documentos analíticos (informes, reportes, rúbricas), NUNCA solo fotografías o listas.
5. Los períodos deben tener fechas específicas (mes/año), NO "permanente".

Responde con JSON con esta estructura:
{
  "metas_institucionales": [
    {
      "categoria": "1",
      "nombre_categoria": "Desarrollo académico y del aprendizaje",
      "tema": "Indicadores académicos",
      "meta": "Reducir el abandono escolar del X% al Y% al finalizar el ciclo ${safeStr(project.ciclo_escolar)}",
      "estrategia": "Descripción de 3-4 acciones pedagógicas concretas",
      "linea_base": "X% (ciclo 2024-2025)",
      "personal_designado": "Nombre - Cargo",
      "entregable": "Informe analítico de seguimiento académico con fichas individuales por alumno en riesgo",
      "periodo_inicio": "08/2025",
      "periodo_fin": "06/2026",
      "diagnostico_meta": "Conexión entre el dato diagnóstico y la meta propuesta"
    }
  ],
  "metas_personales": [
    {
      "nombre": "Nombre del trabajador",
      "cargo": "Cargo",
      "meta_individual": "Meta SMART específica para este cargo",
      "estrategia": "Acciones específicas para este trabajador",
      "entregable": "Evidencia documental específica para este cargo",
      "periodo": "agosto 2025 - junio 2026"
    }
  ]
}`;

      const response = await getOpenAI().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente experto en planeación educativa para el BGE de Puebla. Responde siempre con JSON válido y bien formado.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 8192,
      });

      const rawText = response.choices[0]?.message?.content ?? '{}';
      let parsedPlan: object;
      try {
        parsedPlan = JSON.parse(cleanJsonResponse(rawText));
      } catch {
        return NextResponse.json(
          { error: 'La IA no retornó un formato JSON válido. Por favor reintenta.' },
          { status: 500 }
        );
      }

      const [updated] = await sql`
        UPDATE pmc_projects
        SET plan_accion = ${JSON.stringify(parsedPlan)},
            current_step = GREATEST(current_step, 4),
            updated_at = ${now}
        WHERE id = ${id}
          AND teacher_id = ${teacher.id}
        RETURNING *
      `;
      return NextResponse.json({ success: true, step, plan_accion: parsedPlan, project: updated });
    }

    return NextResponse.json({ error: 'Paso no reconocido' }, { status: 400 });
  } catch (error) {
    console.error('PMC generate-step error:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
