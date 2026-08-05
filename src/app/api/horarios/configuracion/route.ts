import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql, getTeacherByEmail } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const teacher = await getTeacherByEmail(session.user.email);
    if (!teacher) {
      return NextResponse.json({ error: "Docente no encontrado" }, { status: 404 });
    }

    const teacherId = teacher.id;

    // ── Configuración del horario ──────────────────────────────────────
    let configRows: any[] = [];
    try {
      configRows = await sql()`
        SELECT * FROM horario_config WHERE teacher_id = ${teacherId}::uuid LIMIT 1
      `;
    } catch {
      // Tabla no existe aún — retornar defaults
    }

    const configDB = configRows[0] || null;
    const config = {
      diasLectivos: configDB?.dias_lectivos ?? 5,
      horasPorDia: configDB?.horas_por_dia ?? 6,
      horaInicio: configDB?.hora_inicio ?? "08:00",
      periodoActivo: configDB?.periodo_activo ?? "A",
      duracionMinutos: 50,
      recesoTrasPeriodo: 3,
      duracionReceso: 20,
    };

    // Estructura de escuela (usando datos del teacher + config)
    const escuela = {
      id: teacherId,
      cct: teacher.cct || teacher.school_name || "SIN CCT",
      nombre: teacher.school_name || "Mi Plantel",
      gruposPrimerAno: configDB?.g1 ?? 1,
      gruposSegundoAno: configDB?.g2 ?? 1,
      gruposTercerAno: configDB?.g3 ?? 1,
      mapaCurricularCompletado: configDB?.mapa_curricular_completado ?? false,
    };

    // ── Grupos guardados ───────────────────────────────────────────────
    let gruposRows: any[] = [];
    try {
      gruposRows = await sql()`
        SELECT
          id::text,
          nombre,
          semestre,
          capacitacion_nombre  AS "capacitacionNombre",
          ffeo_socioemocional  AS "ffeoSocioemocional",
          ffe_optativas        AS "ffeOptativas"
        FROM horario_grupos
        WHERE teacher_id = ${teacherId}::uuid
        ORDER BY semestre ASC, nombre ASC
      `;
    } catch { /* tabla no existe */ }

    // ── Cargas guardadas ───────────────────────────────────────────────
    let cargasRows: any[] = [];
    try {
      cargasRows = await sql()`
        SELECT
          id::text,
          grupo_nombre      AS "grupoId",
          uac_name          AS "uacName",
          personal_id       AS "personalId",
          horas_semanales   AS "horasSemanales",
          requiere_aula_esp AS "requiereAulaEspecial"
        FROM horario_cargas
        WHERE teacher_id = ${teacherId}::uuid
        ORDER BY grupo_nombre ASC, uac_name ASC
      `;
    } catch { /* tabla no existe */ }

    // Normalizar cargas al formato interno del wizard
    const cargas = cargasRows.map((c: any) => ({
      grupoId: c.grupoId,
      asignaturaId: c.uacName,   // usamos uacName como asignaturaId
      uacName: c.uacName,
      personalId: c.personalId,
      horasSemanales: c.horasSemanales,
      requiereAulaEspecial: c.requiereAulaEspecial,
    }));

    // ── Docentes: todos los teachers de la DB ──────────────────────────
    let docentesRows: any[] = [];
    try {
      docentesRows = await sql()`
        SELECT id::text, name, email, role, school_name
        FROM teachers
        ORDER BY name ASC
      `;
    } catch { /* ignore */ }

    const docentes = docentesRows.map((t: any) => {
      const parts = (t.name || "").trim().split(" ");
      return {
        id: t.id,
        nombre: parts[0] || "",
        apellidoPaterno: parts.slice(1).join(" ") || "Docente",
        apellidoMaterno: "",
        cargo: t.role === "director" ? "DIRECTOR"
             : t.role === "administrador" ? "DIRECTOR"
             : "DOCENTE",
        horasAsignadas: 20,
        email: t.email,
      };
    });

    const aulas = [{ id: "aula-general", nombre: "Aula General", tipo: "REGULAR" }];

    return NextResponse.json({
      escuela,
      config,
      grupos: gruposRows,
      aulas,
      docentes,
      cargas,
      horario: null, // horario generado: por ahora siempre null (fase futura)
    });
  } catch (error: any) {
    console.error("[api/horarios/configuracion GET]", error);
    return NextResponse.json({ error: "Error al cargar configuración de horario" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const teacher = await getTeacherByEmail(session.user.email);
    if (!teacher) {
      return NextResponse.json({ error: "Docente no encontrado" }, { status: 404 });
    }

    const teacherId = teacher.id;
    const body = await req.json();
    const { config, grupos, cargas, escuela: escuelaBody } = body;

    // ── 1. Guardar / actualizar configuración ──────────────────────────
    const g1 = escuelaBody?.gruposPrimerAno  ?? config?.g1  ?? 1;
    const g2 = escuelaBody?.gruposSegundoAno ?? config?.g2  ?? 1;
    const g3 = escuelaBody?.gruposTercerAno  ?? config?.g3  ?? 1;
    const mapaDone = escuelaBody?.mapaCurricularCompletado ?? false;

    try {
      await sql()`
        INSERT INTO horario_config
          (teacher_id, dias_lectivos, horas_por_dia, hora_inicio, periodo_activo, g1, g2, g3, mapa_curricular_completado)
        VALUES
          (${teacherId}::uuid,
           ${config?.diasLectivos ?? 5},
           ${config?.horasPorDia  ?? 6},
           ${config?.horaInicio   ?? "08:00"},
           ${config?.periodoActivo ?? "A"},
           ${g1}, ${g2}, ${g3},
           ${mapaDone})
        ON CONFLICT (teacher_id) DO UPDATE SET
          dias_lectivos             = EXCLUDED.dias_lectivos,
          horas_por_dia             = EXCLUDED.horas_por_dia,
          hora_inicio               = EXCLUDED.hora_inicio,
          periodo_activo            = EXCLUDED.periodo_activo,
          g1                        = EXCLUDED.g1,
          g2                        = EXCLUDED.g2,
          g3                        = EXCLUDED.g3,
          mapa_curricular_completado= EXCLUDED.mapa_curricular_completado,
          updated_at                = NOW()
      `;
    } catch (e) {
      console.error("[api/horarios/configuracion POST] Error guardando config:", e);
    }

    // ── 2. Guardar grupos (upsert por teacher_id + nombre) ─────────────
    if (Array.isArray(grupos) && grupos.length > 0) {
      for (const g of grupos) {
        try {
          const ffeOpts = g.ffeOptativas
            ? JSON.stringify(g.ffeOptativas)
            : null;
          await sql()`
            INSERT INTO horario_grupos
              (teacher_id, nombre, semestre, capacitacion_nombre, ffeo_socioemocional, ffe_optativas)
            VALUES
              (${teacherId}::uuid,
               ${g.nombre},
               ${g.semestre},
               ${g.capacitacionNombre ?? null},
               ${g.ffeoSocioemocional ?? null},
               ${ffeOpts}::jsonb)
            ON CONFLICT (teacher_id, nombre) DO UPDATE SET
              semestre             = EXCLUDED.semestre,
              capacitacion_nombre  = EXCLUDED.capacitacion_nombre,
              ffeo_socioemocional  = EXCLUDED.ffeo_socioemocional,
              ffe_optativas        = EXCLUDED.ffe_optativas
          `;
        } catch (e) {
          console.error("[api/horarios/configuracion POST] Error guardando grupo:", g.nombre, e);
        }
      }
    }

    // ── 3. Guardar cargas (upsert por teacher_id + grupo_nombre + uac_name) ─
    if (Array.isArray(cargas) && cargas.length > 0) {
      // Limpiar cargas anteriores del teacher y recrear
      try {
        await sql()`
          DELETE FROM horario_cargas WHERE teacher_id = ${teacherId}::uuid
        `;
      } catch { /* ignore */ }

      for (const c of cargas) {
        if (!c.grupoId || !c.uacName || !c.personalId) continue;
        try {
          await sql()`
            INSERT INTO horario_cargas
              (teacher_id, grupo_nombre, uac_name, personal_id, horas_semanales, requiere_aula_esp)
            VALUES
              (${teacherId}::uuid,
               ${c.grupoId},
               ${c.uacName},
               ${c.personalId},
               ${c.horasSemanales ?? 3},
               ${c.requiereAulaEspecial ?? false})
            ON CONFLICT (teacher_id, grupo_nombre, uac_name) DO UPDATE SET
              personal_id       = EXCLUDED.personal_id,
              horas_semanales   = EXCLUDED.horas_semanales,
              requiere_aula_esp = EXCLUDED.requiere_aula_esp
          `;
        } catch (e) {
          console.error("[api/horarios/configuracion POST] Error guardando carga:", c.uacName, e);
        }
      }
    }

    return NextResponse.json({ success: true, message: "Configuración guardada correctamente" });
  } catch (error: any) {
    console.error("[api/horarios/configuracion POST]", error);
    return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const teacher = await getTeacherByEmail(session.user.email);
    if (!teacher) {
      return NextResponse.json({ error: "Docente no encontrado" }, { status: 404 });
    }

    const teacherId = teacher.id;

    try {
      await sql()`DELETE FROM horario_cargas WHERE teacher_id = ${teacherId}::uuid`;
      await sql()`DELETE FROM horario_grupos WHERE teacher_id = ${teacherId}::uuid`;
      await sql()`
        UPDATE horario_config
        SET mapa_curricular_completado = FALSE, updated_at = NOW()
        WHERE teacher_id = ${teacherId}::uuid
      `;
    } catch (e) {
      console.error("[api/horarios/configuracion DELETE]", e);
    }

    return NextResponse.json({ success: true, message: "Datos del horario limpiados correctamente" });
  } catch (error: any) {
    console.error("[api/horarios/configuracion DELETE]", error);
    return NextResponse.json({ error: "Error al limpiar datos" }, { status: 500 });
  }
}
