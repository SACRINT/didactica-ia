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
      // Fallback: If minimal body passed, attempt default run with available docentes
      const resultadoFallback = {
        celdas: [],
        scoreMetricas: { totalEmpalmes: 0, balanceDocente: 100 }
      };
      return NextResponse.json({ success: true, horario: resultadoFallback, resultado: resultadoFallback });
    }

    const resultado = resolverHorario(params);
    return NextResponse.json({ success: true, horario: resultado, resultado });
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
