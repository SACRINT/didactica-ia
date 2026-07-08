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

export const runtime = 'nodejs';
export const maxDuration = 120; // Increase to 120s as Gemini 2.5 Pro can take slightly longer for high-depth tasks

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  return new GoogleGenerativeAI(apiKey);
}

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

    // Call Gemini 2.5 Pro
    console.log(`Generating PAEC Step ${step} using Gemini...`);
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const response = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: `System Instructions:\n${PAEC_SYSTEM_PROMPT}\n\nUser Input:\n${userPrompt}` }
          ]
        }
      ]
    });

    const text = response.response.text();
    if (!text) {
      throw new Error('Unexpected empty response from Gemini API');
    }

    let parsedJson: object;
    try {
      const cleanJson = text
        .replace(/^```(?:json)?\n?/m, '')
        .replace(/\n?```$/m, '')
        .trim();
      parsedJson = JSON.parse(cleanJson);
    } catch (err) {
      console.error('Failed to parse Gemini response:', text.substring(0, 500));
      return NextResponse.json(
        { error: 'La IA de Google no retornó un formato JSON válido. Por favor reintenta.' },
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

    return NextResponse.json({ success: true, step, data: parsedJson, project: updatedProject });
  } catch (error) {
    console.error('PAEC Generation step error:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message || 'Error al generar el paso' }, { status: 500 });
  }
}
