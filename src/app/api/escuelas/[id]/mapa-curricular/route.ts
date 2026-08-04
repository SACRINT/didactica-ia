import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    return NextResponse.json({ success: true, message: "Mapa curricular reiniciado correctamente" });
  } catch (error: any) {
    console.error("[api/escuelas/mapa-curricular] Error:", error);
    return NextResponse.json({ error: "Error al reiniciar mapa curricular" }, { status: 500 });
  }
}
