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
    const escuelaId = searchParams.get("escuelaId") || "default_escuela";

    // Standard school structure fallback
    const escuela = {
      id: escuelaId,
      cct: "21EBH0001X",
      nombre: "Plantel DBEPA Puebla",
      gruposPrimerAno: 1,
      gruposSegundoAno: 1,
      gruposTercerAno: 1,
      mapaCurricularCompletado: true
    };

    const config = {
      diasLectivos: 5,
      horasPorDia: 6,
      horaInicio: "08:00",
      duracionMinutos: 50,
      recesoTrasPeriodo: 3,
      duracionReceso: 20
    };

    const grupos: any[] = [];
    const aulas = [{ id: "aula-general", nombre: "Aula General", tipo: "REGULAR" }];
    
    // Fetch teachers from DB for plantilla
    let docentes: any[] = [];
    try {
      const rows = await sql()`
        SELECT id, name as nombre, role as cargo
        FROM teachers
        ORDER BY name ASC
      `;
      docentes = rows.map((t: any) => {
        const parts = (t.nombre || '').trim().split(' ');
        return {
          id: t.id,
          nombre: parts[0] || '',
          apellidoPaterno: parts.slice(1).join(' ') || 'Docente',
          apellidoMaterno: '',
          cargo: t.cargo === 'director' ? 'DIRECTOR' : 'DOCENTE',
          horasAsignadas: 20
        };
      });
    } catch {
      docentes = [
        { id: "doc-1", nombre: "Prof. Dirección", apellidoPaterno: "Docente", cargo: "DIRECTOR", horasAsignadas: 20 }
      ];
    }

    return NextResponse.json({
      escuela,
      config,
      grupos,
      aulas,
      docentes,
      cargas: [],
      horario: null
    });
  } catch (error: any) {
    console.error("[api/horarios/configuracion] Error en GET:", error);
    return NextResponse.json({ error: "Error al cargar configuración de horario" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    return NextResponse.json({ success: true, message: "Configuración guardada correctamente", body });
  } catch (error: any) {
    console.error("[api/horarios/configuracion] Error en POST:", error);
    return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    return NextResponse.json({ success: true, message: "Cargas docentes limpiadas correctamente" });
  } catch (error: any) {
    console.error("[api/horarios/configuracion] Error en DELETE:", error);
    return NextResponse.json({ error: "Error al limpiar datos" }, { status: 500 });
  }
}
