import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProgramsCatalog } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const semesterParam = searchParams.get('semester');
    const component = searchParams.get('component') || undefined;
    const subsystem = searchParams.get('subsystem') || undefined;

    const semester = semesterParam ? parseInt(semesterParam, 10) : undefined;

    const programs = await getProgramsCatalog(
      semester !== undefined && !isNaN(semester) ? semester : undefined,
      component,
      subsystem
    );

    return NextResponse.json({ programs });
  } catch (error) {
    console.error('GET /api/programs error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
