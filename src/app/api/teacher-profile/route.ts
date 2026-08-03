import { auth } from '@/lib/auth';
import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { schoolName, municipality, subsystem, name, lockProfile } = body;

    // Validaciones básicas
    if (!schoolName?.trim() || !municipality?.trim() || !subsystem?.trim()) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    const db = neon(process.env.DATABASE_URL!);

    // Verificar si existe el docente
    const existing = await db`
      SELECT id, school_locked, profile_completed
      FROM teachers
      WHERE email = ${session.user.email}
      LIMIT 1
    `;

    if (!existing.length) {
      return NextResponse.json({ error: 'Docente no encontrado' }, { status: 404 });
    }

    const teacher = existing[0];

    // Si el perfil ya está bloqueado, no permitir cambios en datos de escuela
    if (teacher.school_locked) {
      return NextResponse.json(
        { error: 'Los datos de tu escuela ya están bloqueados y no pueden modificarse.' },
        { status: 403 }
      );
    }

    // Actualizar el perfil del docente
    await db`
      UPDATE teachers SET
        name = ${name?.trim() || session.user.name || session.user.email},
        school_name = ${schoolName.trim()},
        municipality = ${municipality.trim()},
        subsystem = ${subsystem.trim()},
        profile_completed = true,
        school_locked = ${lockProfile === true},
        updated_at = now()
      WHERE email = ${session.user.email}
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[teacher-profile] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// GET: obtener datos actuales del perfil
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = neon(process.env.DATABASE_URL!);
    const rows = await db`
      SELECT name, school_name, municipality, subsystem,
             profile_completed, school_locked
      FROM teachers
      WHERE email = ${session.user.email}
      LIMIT 1
    `;

    if (!rows.length) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error: any) {
    console.error('[teacher-profile] GET Error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
