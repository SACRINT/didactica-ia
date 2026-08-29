import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql, getTeacherByEmail } from "@/lib/db";
import { resolverHorario, SolverParams } from "@/lib/horarios/solver";

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
    const { horarioId, slotsLibresBloqueados = [], celdas = [] } = body;

    // 1. Cargar configuración y cargas de la base de datos
    const configResult = await sql()`
      SELECT * FROM horario_config WHERE teacher_id = ${teacherId}::uuid LIMIT 1
    `;
    const configRow = configResult[0];

    const horasPorDia = configRow?.horas_por_dia || 6;
    const diasLectivos = configRow?.dias_lectivos || 5;

    // 2. Cargar grupos
    const gruposRows = await sql()`
      SELECT id, nombre, semestre, horas_por_dia, turno FROM horario_grupos 
      WHERE teacher_id = ${teacherId}::uuid
      ORDER BY semestre ASC, nombre ASC
    `;

    const grupos = gruposRows.map((g: any) => ({
      id: String(g.id || g.nombre),
      nombre: String(g.nombre || g.id),
      semestre: Number(g.semestre || 1),
      horasPorDia: Number(g.horas_por_dia || (g.semestre === 1 ? 5 : horasPorDia))
    }));

    // 3. Cargar docentes de personal
    const personalRows = await sql()`
      SELECT id, nombre, apellido_paterno, apellido_materno, cargo, horas_max_dia 
      FROM personal 
      WHERE teacher_id = ${teacherId}::uuid
      ORDER BY nombre ASC
    `;

    const docentes = personalRows.map((d: any) => ({
      id: String(d.id),
      nombreCompleto: `${d.nombre || ''} ${d.apellido_paterno || ''} ${d.apellido_materno || ''}`.trim() || 'Docente',
      horasMaxDia: Number(d.horas_max_dia || horasPorDia)
    }));

    // 4. Cargar cargas docentes
    const cargasRows = await sql()`
      SELECT id, personal_id, grupo_id, uac_name, horas_semanales, requiere_aula_especial, aula_especial_id
      FROM horario_carga_docente
      WHERE teacher_id = ${teacherId}::uuid
    `;

    const cargas = cargasRows.map((c: any, idx: number) => ({
      id: String(c.id || `carga_${idx}`),
      docenteId: String(c.personal_id),
      grupoId: String(c.grupo_id),
      asignaturaId: String(c.uac_name),
      horasSemanales: Number(c.horas_semanales || 3),
      esHoraDoblePermitida: true,
      requiereAulaEspecial: !!c.requiere_aula_especial,
      aulaEspecialId: c.aula_especial_id || undefined
    })).filter((c: any) => c.docenteId && c.grupoId && c.horasSemanales > 0);

    // 5. Extraer celdas fijadas con candado
    const celdasFijas = (Array.isArray(celdas) ? celdas : [])
      .filter((c: any) => c.esBloqueado)
      .map((c: any) => ({
        diaSemana: Number(c.diaSemana),
        periodo: Number(c.periodo),
        grupoId: String(c.grupoId),
        docenteId: String(c.docenteId),
        asignaturaId: String(c.asignaturaId || c.uacName || ""),
        aulaId: c.aulaId || undefined
      }));

    // 6. Preparar parámetros del Solver Global
    const params: SolverParams = {
      diasLectivos,
      horasPorDia,
      grupos,
      docentes,
      aulas: [{ id: "aula-gen", nombre: "Aula General", tipo: "REGULAR" }],
      cargas,
      celdasFijas,
      slotsLibresBloqueados: Array.isArray(slotsLibresBloqueados) ? slotsLibresBloqueados : []
    };

    // 7. Ejecutar el Solver Global CSP + Min-Conflicts
    const resultado = resolverHorario(params);

    if (!resultado.exito && resultado.celdas.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No fue posible generar un horario válido con las restricciones y bloqueos actuales.",
        conflictos: resultado.conflictos
      }, { status: 422 });
    }

    // 8. Construir horario actualizado
    const horarioIdFinal = horarioId || configRow?.horario_generado?.id || `horario_${Date.now()}`;
    const horarioActualizado = {
      id: horarioIdFinal,
      config: { horasPorDia, diasLectivos },
      scoreMetricas: {
        ...resultado.metricas,
        slotsLibresBloqueados: Array.isArray(slotsLibresBloqueados) ? slotsLibresBloqueados : []
      },
      celdas: resultado.celdas.map((c: any, idx: number) => {
        const docObj = personalRows.find((d: any) => String(d.id) === String(c.docenteId));
        const grpObj = gruposRows.find((g: any) => String(g.id) === String(c.grupoId) || String(g.nombre) === String(c.grupoId));
        const esFija = celdasFijas.some(
          (f: any) => f.diaSemana === c.diaSemana && f.periodo === c.periodo && f.grupoId === c.grupoId
        );

        return {
          id: c.id || `celda_${idx}_${Date.now()}`,
          diaSemana: c.diaSemana,
          periodo: c.periodo,
          grupoId: c.grupoId,
          docenteId: c.docenteId,
          asignaturaId: c.asignaturaId,
          uacName: c.asignaturaId,
          aulaId: c.aulaId,
          esBloqueado: esFija || !!c.esBloqueado,
          grupo: grpObj ? { id: grpObj.id, nombre: grpObj.nombre, semestre: grpObj.semestre } : undefined,
          docente: docObj ? { id: docObj.id, nombre: docObj.nombre, apellidoPaterno: docObj.apellido_paterno } : undefined
        };
      }),
      mensajesChat: configRow?.horario_generado?.mensajesChat || []
    };

    // 9. Persistir permanentemente en base de datos PostgreSQL Neon
    await sql()`
      UPDATE horario_config
      SET horario_generado = ${JSON.stringify(horarioActualizado)}
      WHERE teacher_id = ${teacherId}::uuid
    `;

    return NextResponse.json({
      success: true,
      horario: horarioActualizado,
      metricas: resultado.metricas,
      conflictos: resultado.conflictos
    });

  } catch (error: any) {
    console.error("[api/horarios/regenerar] Error reoptimizando horario:", error);
    return NextResponse.json({ error: error.message || "Error interno al reoptimizar horario" }, { status: 500 });
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

    // 1. Cargar horario actual
    const configResult = await sql()`
      SELECT * FROM horario_config WHERE teacher_id = ${teacherId}::uuid LIMIT 1
    `;
    const configRow = configResult[0];
    const horarioActual = configRow?.horario_generado || {};

    // 2. Preservar únicamente las celdas que tengan candado (esBloqueado === true)
    const celdasPreservadas = Array.isArray(horarioActual.celdas)
      ? horarioActual.celdas.filter((c: any) => c.esBloqueado)
      : [];

    const horarioLimpio = {
      ...horarioActual,
      id: horarioActual.id || `horario_${Date.now()}`,
      celdas: celdasPreservadas,
      scoreMetricas: {
        ...(horarioActual.scoreMetricas || {}),
        totalClasesProgramadas: celdasPreservadas.length
      }
    };

    // 3. Persistir horario limpio en base de datos
    await sql()`
      UPDATE horario_config
      SET horario_generado = ${JSON.stringify(horarioLimpio)}
      WHERE teacher_id = ${teacherId}::uuid
    `;

    return NextResponse.json({
      success: true,
      horario: horarioLimpio,
      mensaje: "Retícula limpiada exitosamente. Las celdas con candado se han preservado."
    });

  } catch (error: any) {
    console.error("[api/horarios/regenerar] Error limpiando horario:", error);
    return NextResponse.json({ error: error.message || "Error interno al limpiar horario" }, { status: 500 });
  }
}
