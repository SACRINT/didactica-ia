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

    const body = await req.json();
    const rawParams = body.params || body;

    const gruposRaw = Array.isArray(rawParams.grupos) ? rawParams.grupos : [];
    const docentesRaw = Array.isArray(rawParams.docentes) ? rawParams.docentes : [];
    const cargasRaw = Array.isArray(rawParams.cargas) ? rawParams.cargas : [];

    // Normalizar grupos
    const grupos = gruposRaw.map((g: any) => ({
      id: String(g.id || g.nombre),
      nombre: String(g.nombre || g.id),
      semestre: Number(g.semestre || 1),
      horasPorDia: Number(g.horasPorDia || rawParams.horasPorDia || 6),
    }));

    // Normalizar docentes
    const docentes = docentesRaw.map((d: any) => ({
      id: String(d.id),
      nombreCompleto: d.nombreCompleto || `${d.nombre || ''} ${d.apellidoPaterno || ''} ${d.apellidoMaterno || ''}`.trim() || 'Docente',
      horasMaxDia: Number(d.horasMaxDia || 6),
    }));

    // Normalizar cargas (soportar docenteId / personalId, grupoId / grupo_nombre, asignaturaId / uacName)
    const cargas = cargasRaw.map((c: any, idx: number) => {
      const docId = String(c.docenteId || c.personalId || '');
      const grpId = String(c.grupoId || c.grupo_nombre || '');
      const asigId = String(c.uacName || c.asignaturaId || `uac_${idx}`);
      const horas = Number(c.horasSemanales || c.horas_semanales || 3);

      return {
        id: c.id || `carga_${idx}`,
        docenteId: docId,
        grupoId: grpId,
        asignaturaId: asigId,
        horasSemanales: horas,
        esHoraDoblePermitida: c.esHoraDoblePermitida !== false,
        requiereAulaEspecial: !!c.requiereAulaEspecial,
        aulaEspecialId: c.aulaEspecialId,
      };
    }).filter((c: any) => c.docenteId && c.grupoId && c.horasSemanales > 0);

    const params: SolverParams = {
      diasLectivos: Number(rawParams.diasLectivos || 5),
      horasPorDia: Number(rawParams.horasPorDia || 6),
      grupos,
      docentes,
      aulas: Array.isArray(rawParams.aulas) && rawParams.aulas.length > 0
        ? rawParams.aulas
        : [{ id: "aula-gen", nombre: "Aula General", tipo: "REGULAR" }],
      cargas,
      celdasFijas: rawParams.celdasFijas || [],
      restriccionesDocentes: rawParams.restriccionesDocentes || [],
      slotsLibresBloqueados: rawParams.slotsLibresBloqueados || [],
    };

    if (params.grupos.length === 0 || params.docentes.length === 0 || params.cargas.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Debe configurar grupos, docentes y asignar materias antes de generar el horario.",
      }, { status: 400 });
    }

    const resultado = resolverHorario(params);

    const horarioGenerado = {
      id: `horario_${Date.now()}`,
      config: {
        horasPorDia: params.horasPorDia || 6,
        diasLectivos: params.diasLectivos || 5
      },
      scoreMetricas: {
        ...resultado.metricas,
        slotsLibresBloqueados: Array.isArray(params.slotsLibresBloqueados)
          ? params.slotsLibresBloqueados
          : params.slotsLibresBloqueados
          ? Array.from(params.slotsLibresBloqueados)
          : []
      },
      celdas: resultado.celdas.map((c, idx) => ({
        id: `celda_${idx}_${c.diaSemana}_${c.periodo}_${c.grupoId}`,
        diaSemana: c.diaSemana,
        periodo: c.periodo,
        grupoId: c.grupoId,
        docenteId: c.docenteId,
        asignaturaId: c.asignaturaId,
        aulaId: c.aulaId || null,
        cargaId: c.cargaId || null,
        esBloqueado: !!c.esBloqueado
      }))
    };

    // Guardar horario generado permanentemente en la base de datos
    try {
      await sql()`
        UPDATE horario_config
        SET horario_generado = ${JSON.stringify(horarioGenerado)}::jsonb,
            updated_at = NOW()
        WHERE teacher_id = ${teacher.id}::uuid
      `;
    } catch (e) {
      console.warn("[api/horarios/generar] Error guardando horario_generado en horario_config:", e);
    }

    return NextResponse.json({
      success: true,
      exitoSolver: resultado.exito,
      metricas: resultado.metricas,
      conflictos: resultado.conflictos,
      horario: horarioGenerado,
      resultado
    });
  } catch (error: any) {
    console.error("[api/horarios/generar] Error en POST:", error);
    return NextResponse.json({ error: error.message || "Error al generar horario con IA" }, { status: 500 });
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

    try {
      await sql()`
        UPDATE horario_config
        SET horario_generado = NULL,
            updated_at = NOW()
        WHERE teacher_id = ${teacher.id}::uuid
      `;
    } catch (e) {
      console.warn("[api/horarios/generar DELETE] Error limpiando horario_generado:", e);
    }

    return NextResponse.json({ success: true, message: "Horario eliminado correctamente" });
  } catch (error: any) {
    console.error("[api/horarios/generar] Error en DELETE:", error);
    return NextResponse.json({ error: "Error al eliminar horario" }, { status: 500 });
  }
}
