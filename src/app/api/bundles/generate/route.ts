import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTeacherByEmail, getPlanningById } from '@/lib/db';
import { generateBundle, generateFullBundle } from '@/lib/bundle-generator';
import type { GeneratedPlanningContent } from '@/types/planning';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const teacher = await getTeacherByEmail(session.user.email);
    if (!teacher) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    const body = await request.json();
    const { planningId, type } = body;

    if (!planningId) {
      return NextResponse.json({ error: 'planningId requerido' }, { status: 400 });
    }

    const planning = await getPlanningById(planningId, teacher.id);
    if (!planning) return NextResponse.json({ error: 'Planeación no encontrada' }, { status: 404 });

    if (!planning.contentJson) {
      return NextResponse.json({ error: 'La planeación no tiene contenido generado' }, { status: 400 });
    }

    const content = planning.contentJson as GeneratedPlanningContent;

    if (type === 'full') {
      const bundle = await generateFullBundle(content);
      return NextResponse.json({ bundle });
    }

    if (!type || !['guia', 'instrumento', 'diapositivas', 'quiz'].includes(type)) {
      return NextResponse.json({ error: 'type inválido. Usa: guia, instrumento, diapositivas, quiz, full' }, { status: 400 });
    }

    const result = await generateBundle(content, type as 'guia' | 'instrumento' | 'diapositivas' | 'quiz');
    return NextResponse.json({ result, type });
  } catch (error) {
    console.error('Bundle generation error:', error);
    return NextResponse.json({ error: 'Error al generar bundle' }, { status: 500 });
  }
}
