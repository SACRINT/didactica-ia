import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getTeacherByEmail,
  getPaecProjectById,
  updatePaecProjectStep,
  getProgramsCatalogForPaec,
} from '@/lib/db';
import {
  PAEC_SYSTEM_PROMPT,
  buildPrompt1Diagnostico,
  buildPrompt2Justificacion,
  buildPrompt3Mapeo,
  buildPrompt4Cronograma,
  buildPrompt5PlanOperativo,
  buildPrompt6Anexos,
} from '@/lib/prompts/paec-prompts';
import { getAIProvider, logActivity } from '@/lib/ai-provider';
import { callGeminiPool } from '@/lib/gemini';
import { getUserLibraryContext } from '@/lib/context-extractor';
import { getNormativaForGenerator } from '@/lib/normativa-context';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const project = await getPaecProjectById(id, teacher.id);
    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { step } = body as { step: number };

    if (!step || step < 1 || step > 6) {
      return NextResponse.json({ error: 'Número de paso no válido (debe ser de 1 a 6)' }, { status: 400 });
    }

    let userPrompt = '';
    let fieldName = '';

    switch (step) {
      case 1: {
        fieldName = 'fase1_diagnostico';
        const comm = JSON.stringify(project.community_context);
        const school = JSON.stringify(project.school_context);
        userPrompt = buildPrompt1Diagnostico(comm, school, project.problem_statement);
        break;
      }
      case 2: {
        fieldName = 'fase2_justificacion';
        if (!project.fase1_diagnostico) {
          return NextResponse.json({ error: 'Debes completar el Paso 1 primero' }, { status: 400 });
        }
        const diagStr = JSON.stringify(project.fase1_diagnostico);
        userPrompt = buildPrompt2Justificacion(diagStr, project.project_name, project.problem_statement);
        break;
      }
      case 3: {
        fieldName = 'fase2_mapeo';
        if (!project.fase2_justificacion) {
          return NextResponse.json({ error: 'Debes completar el Paso 2 primero' }, { status: 400 });
        }
        const justStr = JSON.stringify(project.fase2_justificacion);
        
        // Filter UAC catalog by cycle type: Semesters 5 and 6 are excluded for this school year (old programs)
        let semesters: number[] = [];
        if (project.cycle_type === 'A') {
          semesters = [1, 3];
        } else if (project.cycle_type === 'B') {
          semesters = [2, 4];
        } else {
          semesters = [1, 2, 3, 4];
        }

        const allUacs = await getProgramsCatalogForPaec(semesters) as { uac_name: string; semester: number; component: string }[];
        
        // Filter laboral/ffe UACs based on school selection
        const schoolCtx = (project.school_context || {}) as { activeLaboralUacs?: string[]; activeFfeUacs?: string[] };
        const activeLaboral = schoolCtx.activeLaboralUacs || [];
        const activeFfe = schoolCtx.activeFfeUacs || [];

        const uacs = allUacs.filter(u => {
          if (u.component === 'fundamental' || u.component === 'ampliado') {
            return true;
          }
          if (u.component === 'laboral') {
            return activeLaboral.includes(u.uac_name);
          }
          if (u.component === 'ext_obligatorio' || u.component === 'ext_optativo') {
            return activeFfe.includes(u.uac_name);
          }
          return false;
        });

        userPrompt = buildPrompt3Mapeo(justStr, uacs);
        break;
      }
      case 4: {
        fieldName = 'fase2_cronograma';
        if (!project.fase2_mapeo) {
          return NextResponse.json({ error: 'Debes completar el Paso 3 primero' }, { status: 400 });
        }
        const mapeoStr = JSON.stringify(project.fase2_mapeo);
        userPrompt = buildPrompt4Cronograma(mapeoStr, project.cycle_type);
        break;
      }
      case 5: {
        fieldName = 'fase2_plan_operativo';
        if (!project.fase2_cronograma) {
          return NextResponse.json({ error: 'Debes completar el Paso 4 primero' }, { status: 400 });
        }
        const cronStr = JSON.stringify(project.fase2_cronograma);
        userPrompt = buildPrompt5PlanOperativo(cronStr, project.cycle_type);
        break;
      }
      case 6: {
        fieldName = 'fase2_anexos';
        if (!project.fase2_plan_operativo) {
          return NextResponse.json({ error: 'Debes completar el Paso 5 primero' }, { status: 400 });
        }
        const planStr = JSON.stringify(project.fase2_plan_operativo);
        userPrompt = buildPrompt6Anexos(planStr);
        break;
      }
    }

    // Inyectar contexto de la biblioteca documental si existe
    const libraryContext = await getUserLibraryContext(session.user.email!);

    // Inyectar normativa oficial en pasos 1 y 2 (Diagnóstico y Justificación),
    // donde el fundamento legal enriquece directamente la generación.
    let normativaContext = '';
    if (step === 1 || step === 2) {
      normativaContext = await getNormativaForGenerator('paec');
    }

    // Construir el prompt completo: prompt base + normativa (si aplica) + biblioteca
    let fullUserPrompt = userPrompt;
    if (normativaContext) {
      fullUserPrompt = `${fullUserPrompt}\n\n${normativaContext}`;
    }
    if (libraryContext) {
      fullUserPrompt = `${fullUserPrompt}\n\n${libraryContext}`;
    }

    // Call AI via pool engine (reads active model from platform_config)
    console.log(`Generating PAEC Step ${step} using callGeminiPool...`);
    const text = await callGeminiPool(PAEC_SYSTEM_PROMPT, fullUserPrompt, teacher.id);

    if (!text) {
      throw new Error('Respuesta vacía del proveedor de IA');
    }

    let parsedJson: object;
    try {
      const cleanJson = text
        .replace(/^```(?:json)?\n?/m, '')
        .replace(/\n?```$/m, '')
        .trim();
      parsedJson = JSON.parse(cleanJson);
    } catch (err) {
      console.error('Failed to parse AI response:', text.substring(0, 500));
      return NextResponse.json(
        { error: 'La IA no retornó un formato JSON válido. Por favor reintenta.' },
        { status: 500 }
      );
    }

    // Save to Neon DB
    const updatedProject = await updatePaecProjectStep(
      id,
      teacher.id,
      step,
      fieldName,
      parsedJson
    );

    // Log activity
    await logActivity({
      teacherEmail: session.user.email!,
      action: `generate_paec_step_${step}`,
      entityType: 'paec',
      entityId: id,
      success: true,
    });

    return NextResponse.json({ success: true, step, data: parsedJson, project: updatedProject });
  } catch (error) {
    console.error('PAEC Generation step error:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message || 'Error al generar el paso' }, { status: 500 });
  }
}
