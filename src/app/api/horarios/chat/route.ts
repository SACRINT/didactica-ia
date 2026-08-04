import { auth } from '@/lib/auth';
import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';
import { procesarComandoIA } from '@/lib/horarios/ai-assistant';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const teacherRows = await sql`SELECT role FROM teachers WHERE email = ${session.user.email} LIMIT 1`;
    const role = teacherRows[0]?.role || 'docente';

    if (!['administrador', 'director', 'supervisor', 'atp'].includes(role) && session.user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Acceso exclusivo para directores.' }, { status: 403 });
    }

    const { mensajeUsuario, contextoHorario } = await req.json();

    if (!mensajeUsuario || !contextoHorario) {
      return NextResponse.json({ error: 'Faltan campos requeridos (mensajeUsuario, contextoHorario)' }, { status: 400 });
    }

    const respuesta = await procesarComandoIA(mensajeUsuario, contextoHorario);

    return NextResponse.json({ success: true, respuesta });
  } catch (e: any) {
    console.error('API /api/horarios/chat error:', e);
    return NextResponse.json({ error: e.message || 'Error en el asistente de horarios' }, { status: 500 });
  }
}
