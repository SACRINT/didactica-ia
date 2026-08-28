import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql, getTeacherByEmail } from '@/lib/db';

async function getDirectorId(email: string) {
  const teacher = await getTeacherByEmail(email);
  if (!teacher) return null;
  const isAdmin = teacher.role === 'administrador' || email === process.env.ADMIN_EMAIL;
  if (teacher.role !== 'director' && !isAdmin) return null;
  return teacher.id as string;
}

function normalizarCargo(cargoRaw: any): string {
  if (!cargoRaw) return 'DOCENTE';
  const str = String(cargoRaw).trim().toUpperCase();
  if (str.includes('DOC') || str.includes('PROF') || str.includes('MAESTR') || str.includes('CATEDRATICO')) return 'DOCENTE';
  if (str.includes('DIR') || str.includes('RECT') || str.includes('SUBDIR') || str.includes('COORDINAD')) return 'DIRECTIVO';
  if (str.includes('PREF') || str.includes('DISCIPLIN')) return 'PREFECTO';
  if (str.includes('ORIENT') || str.includes('TUTOR') || str.includes('PSICO') || str.includes('TRABAJO')) return 'ORIENTADOR';
  if (str.includes('ADMIN') || str.includes('SECRET') || str.includes('OFICIN') || str.includes('CONTAB') || str.includes('ASISTEN') || str.includes('APOYO')) return 'ADMINISTRATIVO';
  return 'OTRO';
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const directorId = await getDirectorId(session.user.email);
    if (!directorId) {
      return NextResponse.json({ error: 'Solo los directores pueden importar personal' }, { status: 403 });
    }

    const body = await req.json();
    const { personal } = body;

    if (!Array.isArray(personal) || personal.length === 0) {
      return NextResponse.json({ error: 'No se recibieron datos de personal para importar' }, { status: 400 });
    }

    let insertados = 0;
    let actualizados = 0;
    const errores: string[] = [];

    for (let i = 0; i < personal.length; i++) {
      const p = personal[i];
      const nom = (p.nombre || '').trim();
      const apP = (p.apellidoPaterno || '').trim();
      const apM = (p.apellidoMaterno || '').trim();
      const cargoNorm = normalizarCargo(p.cargo);

      if (!nom || !apP) {
        errores.push(`Fila ${i + 1}: Nombre o Apellido Paterno faltante (${nom} ${apP})`);
        continue;
      }

      let horas = Number(p.horasBase ?? p.horas ?? p.horasAsignadas);
      if (isNaN(horas) || horas < 0) {
        horas = cargoNorm === 'DOCENTE' ? 20 : 0;
      }
      if (horas > 50) horas = 50;

      const emailDoc = (p.email || '').trim() || null;

      try {
        const res = await sql()`
          INSERT INTO escuela_personal
            (director_id, nombre, apellido_paterno, apellido_materno, email, cargo, horas_base, activo)
          VALUES
            (${directorId}::uuid, ${nom}, ${apP}, ${apM || null}, ${emailDoc}, ${cargoNorm}, ${horas}, TRUE)
          ON CONFLICT (director_id, nombre, apellido_paterno) DO UPDATE SET
            apellido_materno = COALESCE(EXCLUDED.apellido_materno, escuela_personal.apellido_materno),
            email            = COALESCE(EXCLUDED.email, escuela_personal.email),
            cargo            = EXCLUDED.cargo,
            horas_base       = EXCLUDED.horas_base,
            activo           = TRUE
          RETURNING (xmax = 0) AS es_nuevo
        `;

        if (res.length > 0) {
          if (res[0].es_nuevo) {
            insertados++;
          } else {
            actualizados++;
          }
        }
      } catch (err: any) {
        console.error(`[bulk personal] Error fila ${i + 1}:`, err);
        errores.push(`Fila ${i + 1} (${nom} ${apP}): ${err.message || 'Error en BD'}`);
      }
    }

    return NextResponse.json({
      success: true,
      totalProcesados: personal.length,
      insertados,
      actualizados,
      errores,
    });
  } catch (err: any) {
    console.error('[escuela-personal bulk POST]', err);
    return NextResponse.json({ error: 'Error interno del servidor al procesar la carga masiva' }, { status: 500 });
  }
}
