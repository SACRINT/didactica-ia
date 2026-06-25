import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTeacherByEmail, getPlanningsByTeacher, createPlanning } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const teacher = await getTeacherByEmail(session.user.email);
    if (!teacher) {
      return NextResponse.json({ error: 'Docente no encontrado' }, { status: 404 });
    }
    const plannings = await getPlanningsByTeacher(teacher.id);
    return NextResponse.json({ plannings });
  } catch (error) {
    console.error('GET /api/plannings error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const teacher = await getTeacherByEmail(session.user.email);
    if (!teacher) {
      return NextResponse.json({ error: 'Docente no encontrado' }, { status: 404 });
    }
    const body = await request.json();
    const { uacName, semester, component, curriculumName, paecContext, extractedData } = body;

    if (!uacName || !semester || !component) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: uacName, semester, component' },
        { status: 400 }
      );
    }

    const planning = await createPlanning({
      teacherId: teacher.id,
      uacName,
      semester,
      component,
      curriculumName,
      paecContext,
      extractedData,
    });

    return NextResponse.json({ planning }, { status: 201 });
  } catch (error) {
    console.error('POST /api/plannings error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
