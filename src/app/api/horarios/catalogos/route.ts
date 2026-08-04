import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { accion, nombre, apellidoPaterno, apellidoMaterno } = body;

    if (accion === "CREAR_DOCENTE") {
      const docente = {
        id: `doc_custom_${Date.now()}`,
        nombre,
        apellidoPaterno,
        apellidoMaterno,
        cargo: "DOCENTE",
        horasAsignadas: 20
      };
      return NextResponse.json({ success: true, docente });
    }

    return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
  } catch (error: any) {
    console.error("[api/horarios/catalogos] Error:", error);
    return NextResponse.json({ error: "Error al procesar catálogo" }, { status: 500 });
  }
}
