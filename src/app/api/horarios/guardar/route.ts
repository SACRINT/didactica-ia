import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { horarioId, celdas, slotsLibresBloqueados, escuelaId } = body;

    if (!horarioId || !Array.isArray(celdas)) {
      return NextResponse.json({ error: "horarioId y celdas son requeridos." }, { status: 400 });
    }

    const horarioActualizado = {
      id: horarioId,
      celdas,
      scoreMetricas: {
        slotsLibresBloqueados: Array.isArray(slotsLibresBloqueados) ? slotsLibresBloqueados : []
      }
    };

    return NextResponse.json({
      success: true,
      message: "Horario guardado permanentemente.",
      horario: horarioActualizado
    });
  } catch (error: any) {
    console.error("[api/horarios/guardar] Error en POST:", error);
    return NextResponse.json(
      { error: "Error al guardar los cambios del horario." },
      { status: 500 }
    );
  }
}
