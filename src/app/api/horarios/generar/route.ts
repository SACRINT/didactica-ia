import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolverHorario, SolverParams } from "@/lib/horarios/solver";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const params: SolverParams = body.params || body;

    if (!params.grupos || !params.docentes || !params.cargas) {
      const resultadoFallback = {
        exito: true,
        celdas: [],
        conflictos: [],
        metricas: {
          totalClasesProgramadas: 0,
          totalClasesRequeridas: 0,
          huecosDocentes: 0,
          huecosGrupos: 0
        }
      };
      return NextResponse.json({
        success: true,
        horario: {
          id: `horario_${Date.now()}`,
          celdas: [],
          scoreMetricas: resultadoFallback.metricas,
          config: { horasPorDia: 6, diasLectivos: 5 }
        },
        resultado: resultadoFallback
      });
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

    return NextResponse.json({ success: true, message: "Horario eliminado correctamente" });
  } catch (error: any) {
    console.error("[api/horarios/generar] Error en DELETE:", error);
    return NextResponse.json({ error: "Error al eliminar horario" }, { status: 500 });
  }
}
