import { auth } from '@/lib/auth';
import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';
import { generarPlanesDeClase } from '@/lib/class-plan-generator';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { planningId, totalSesiones = 3 } = body;

    if (!planningId) {
      return NextResponse.json({ error: 'Se requiere el ID de la planeación' }, { status: 400 });
    }

    const db = neon(process.env.DATABASE_URL!);

    const rows = await db`
      SELECT uac_name, semester, content_json
      FROM plannings
      WHERE id = ${planningId}::uuid
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Planeación no encontrada' }, { status: 404 });
    }

    const plan = rows[0];
    const planeacionTexto = JSON.stringify(plan.content_json || {}, null, 2);

    const planesDeClase = await generarPlanesDeClase({
      uacNombre: plan.uac_name,
      semestre: plan.semester,
      totalSesiones,
      planeacionTexto,
    });

    // Guardar en la base de datos (tabla class_plans)
    await db`ALTER TABLE plannings ADD COLUMN IF NOT EXISTS class_plans_json JSONB`.catch(() => {});
    await db`UPDATE plannings SET class_plans_json = ${JSON.stringify(planesDeClase)}::jsonb WHERE id = ${planningId}::uuid`;

    return NextResponse.json({ success: true, planesDeClase });
  } catch (e: any) {
    console.error('API /api/class-plans error:', e);
    return NextResponse.json({ error: e.message || 'Error al generar planes de clase' }, { status: 500 });
  }
}
