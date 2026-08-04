import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const escuelaId = searchParams.get("escuelaId");

    // Fetch teachers from database
    const rows = await sql()`
      SELECT id, name as nombre, '' as "apellidoPaterno", '' as "apellidoMaterno", email, role as cargo
      FROM teachers
      ORDER BY name ASC
    `;

    // Split name into first and last name if possible for display
    const personal = rows.map((t: any) => {
      const parts = (t.nombre || '').trim().split(' ');
      const nombre = parts[0] || '';
      const apellidoPaterno = parts.slice(1).join(' ') || '';
      return {
        id: t.id,
        nombre: nombre,
        apellidoPaterno: apellidoPaterno,
        apellidoMaterno: '',
        cargo: t.cargo === 'director' ? 'DIRECTOR' : t.cargo === 'administrador' ? 'ADMINISTRATIVO' : 'DOCENTE',
        horasAsignadas: 20
      };
    });

    return NextResponse.json({ personal });
  } catch (error: any) {
    console.error("[api/expedientes/personal] Error:", error);
    return NextResponse.json({ personal: [] });
  }
}
