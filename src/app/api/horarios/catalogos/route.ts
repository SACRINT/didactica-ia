import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql, getTeacherByEmail } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Devuelve todos los teachers como lista de docentes
    let rows: any[] = [];
    try {
      rows = await sql()`
        SELECT id::text, name, email, role, school_name
        FROM teachers
        ORDER BY name ASC
      `;
    } catch { /* ignore */ }

    const docentes = rows.map((t: any) => {
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

    return NextResponse.json({ success: true, docentes });
  } catch (error: any) {
    console.error("[api/horarios/catalogos GET] Error:", error);
    return NextResponse.json({ error: "Error al obtener catálogo" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { accion, nombre, apellidoPaterno, apellidoMaterno, email: emailDocente } = body;

    if (accion === "CREAR_DOCENTE") {
      const fullName = [nombre, apellidoPaterno, apellidoMaterno].filter(Boolean).join(" ");
      const emailFinal = emailDocente || `${Date.now()}@temporal-horario.local`;

      // Intentar insertar en la tabla teachers
      let docenteId = `doc_temp_${Date.now()}`;
      try {
        const rows = await sql()`
          INSERT INTO teachers (name, email, role)
          VALUES (${fullName}, ${emailFinal}, 'docente')
          ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
          RETURNING id::text
        `;
        if (rows[0]?.id) docenteId = rows[0].id;
      } catch {
        // Si falla (ej: email duplicado), usar ID temporal
      }

      const docente = {
        id: docenteId,
        nombre,
        apellidoPaterno: apellidoPaterno || "",
        apellidoMaterno: apellidoMaterno || "",
        cargo: "DOCENTE",
        horasAsignadas: 20,
        email: emailFinal,
      };
      return NextResponse.json({ success: true, docente });
    }

    return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
  } catch (error: any) {
    console.error("[api/horarios/catalogos POST] Error:", error);
    return NextResponse.json({ error: "Error al procesar catálogo" }, { status: 500 });
  }
}
