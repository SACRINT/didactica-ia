import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql, getTeacherByEmail } from "@/lib/db";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const currentTeacher = await getTeacherByEmail(session.user.email);
    if (!currentTeacher) {
      return NextResponse.json({ error: "Docente no encontrado" }, { status: 404 });
    }

    const params = await context.params;
    let targetTeacherId = params?.id;

    // Si el ID no es UUID válido o el usuario no es admin, usar el teacher.id autenticado
    if (!targetTeacherId || !UUID_REGEX.test(targetTeacherId)) {
      targetTeacherId = currentTeacher.id;
    } else if (
      currentTeacher.role !== "administrador" &&
      currentTeacher.role !== "admin" &&
      currentTeacher.role !== "supervision" &&
      targetTeacherId !== currentTeacher.id
    ) {
      // Directores y docentes solo configuran su propio plantel
      targetTeacherId = currentTeacher.id;
    }

    const body = await req.json();
    const { gruposPrimerAno, gruposSegundoAno, gruposTercerAno, gruposConfig } = body;

    const g1 = Math.max(1, parseInt(`${gruposPrimerAno || 1}`, 10));
    const g2 = Math.max(1, parseInt(`${gruposSegundoAno || 1}`, 10));
    const g3 = Math.max(1, parseInt(`${gruposTercerAno || 1}`, 10));

    // 1. Guardar o actualizar horario_config
    await sql()`
      INSERT INTO horario_config (
        teacher_id, g1, g2, g3, mapa_curricular_completado, updated_at
      )
      VALUES (
        ${targetTeacherId}::uuid,
        ${g1},
        ${g2},
        ${g3},
        TRUE,
        NOW()
      )
      ON CONFLICT (teacher_id) DO UPDATE SET
        g1 = EXCLUDED.g1,
        g2 = EXCLUDED.g2,
        g3 = EXCLUDED.g3,
        mapa_curricular_completado = TRUE,
        updated_at = NOW();
    `;

    // 2. Guardar gruposConfig si se proporcionaron
    if (Array.isArray(gruposConfig) && gruposConfig.length > 0) {
      for (const item of gruposConfig) {
        if (!item.grupoNombre) continue;
        const nombre = (item.grupoNombre || "").trim();
        const sem = Math.max(1, parseInt(`${item.semestre || 1}`, 10));
        const ffeOpts = item.ffeOptativas ? JSON.stringify(item.ffeOptativas) : "[]";

        await sql()`
          INSERT INTO horario_grupos (
            teacher_id, nombre, semestre, capacitacion_nombre, ffeo_socioemocional, ffe_optativas
          )
          VALUES (
            ${targetTeacherId}::uuid,
            ${nombre},
            ${sem},
            ${item.capacitacionNombre || "Administracion"},
            ${item.ffeoSocioemocional || null},
            ${ffeOpts}::jsonb
          )
          ON CONFLICT (teacher_id, nombre) DO UPDATE SET
            semestre = EXCLUDED.semestre,
            capacitacion_nombre = EXCLUDED.capacitacion_nombre,
            ffeo_socioemocional = EXCLUDED.ffeo_socioemocional,
            ffe_optativas = EXCLUDED.ffe_optativas;
        `;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Mapa curricular y estructura del plantel guardados exitosamente",
    });
  } catch (error: any) {
    console.error("[api/escuelas/[id]/mapa-curricular POST] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Error al guardar mapa curricular" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const currentTeacher = await getTeacherByEmail(session.user.email);
    if (!currentTeacher) {
      return NextResponse.json({ error: "Docente no encontrado" }, { status: 404 });
    }

    const params = await context.params;
    let targetTeacherId = params?.id;

    if (!targetTeacherId || !UUID_REGEX.test(targetTeacherId)) {
      targetTeacherId = currentTeacher.id;
    } else if (
      currentTeacher.role !== "administrador" &&
      currentTeacher.role !== "admin" &&
      currentTeacher.role !== "supervision" &&
      targetTeacherId !== currentTeacher.id
    ) {
      targetTeacherId = currentTeacher.id;
    }

    // 1. Desmarcar bandera en horario_config
    await sql()`
      UPDATE horario_config
      SET mapa_curricular_completado = FALSE, updated_at = NOW()
      WHERE teacher_id = ${targetTeacherId}::uuid;
    `;

    // 2. Limpiar grupos y cargas docentes asociadas
    await sql()`DELETE FROM horario_cargas WHERE teacher_id = ${targetTeacherId}::uuid;`;
    await sql()`DELETE FROM horario_grupos WHERE teacher_id = ${targetTeacherId}::uuid;`;

    return NextResponse.json({
      success: true,
      message: "Mapa curricular y grupos reiniciados correctamente",
    });
  } catch (error: any) {
    console.error("[api/escuelas/[id]/mapa-curricular DELETE] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Error al reiniciar mapa curricular" },
      { status: 500 }
    );
  }
}
