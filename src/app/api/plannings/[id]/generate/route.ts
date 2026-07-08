import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTeacherByEmail, getPlanningById, updatePlanningContent } from '@/lib/db';
import { generatePlanning } from '@/lib/gemini';
import { buildUserPrompt } from '@/lib/prompts/build-prompt';
import type { ExtractedPdfData, TeacherContext } from '@/types/planning';

export const runtime = 'nodejs';
export const maxDuration = 60;

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
    const planning = await getPlanningById(id, teacher.id);
    if (!planning) {
      return NextResponse.json({ error: 'Planeación no encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const { extractedData, context } = body as {
      extractedData: ExtractedPdfData;
      context: TeacherContext;
    };

    if (!extractedData || !context) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos: extractedData y context' },
        { status: 400 }
      );
    }

    // Build the user prompt with teacher context
    const userPrompt = buildUserPrompt(
      extractedData,
      context,
      planning.semester as number,
      planning.component as string
    );

    // Generate with Claude Haiku 4.5 (with Prompt Caching)
    const content = await generatePlanning(userPrompt);

    // Save to database (teacher_id enforced = only owner can update)
    await updatePlanningContent(id, teacher.id, content);

    return NextResponse.json({ content });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Generate planning error:', message);
    return NextResponse.json(
      { error: message || 'Error al generar la planeación' },
      { status: 500 }
    );
  }
}
