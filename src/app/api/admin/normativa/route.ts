// src/app/api/admin/normativa/route.ts
// Admin CRUD para el catálogo normativo (documentos y artículos)
// Solo accesible para usuarios con role = 'admin'

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTeacherByEmail } from '@/lib/db';
import { neon } from '@neondatabase/serverless';

export const runtime = 'nodejs';

const db = neon(process.env.DATABASE_URL!);

// ─── GET — Lista todo el catálogo normativo ────────────────────────────────────
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const teacher = await getTeacherByEmail(session.user.email);
  if (!teacher || teacher.role !== 'admin') {
    return NextResponse.json({ error: 'Acceso restringido a administradores' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const generador = searchParams.get('generador'); // filtrar por generador: pmc|paec|pips|planeacion

  // Lee documentos con sus artículos agrupados
  const documentos = await db`
    SELECT
      d.id,
      d.titulo,
      d.tipo,
      d.fuente,
      d.vigente,
      d.orden_display,
      d.created_at,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id',          a.id,
            'numero',      a.numero,
            'texto',       a.texto,
            'aplicable_a', a.aplicable_a,
            'orden_en_doc', a.orden_en_doc
          ) ORDER BY a.orden_en_doc
        ) FILTER (WHERE a.id IS NOT NULL),
        '[]'
      ) AS articulos
    FROM normativa_documentos d
    LEFT JOIN normativa_articulos a ON a.documento_id = d.id
      ${generador ? db`AND ${generador} = ANY(a.aplicable_a)` : db``}
    GROUP BY d.id
    ORDER BY d.orden_display, d.created_at
  `;

  // Estadísticas rápidas
  const stats = await db`
    SELECT
      COUNT(DISTINCT d.id) AS total_documentos,
      COUNT(a.id)           AS total_articulos,
      COUNT(CASE WHEN 'pmc'       = ANY(a.aplicable_a) THEN 1 END) AS arts_pmc,
      COUNT(CASE WHEN 'paec'      = ANY(a.aplicable_a) THEN 1 END) AS arts_paec,
      COUNT(CASE WHEN 'pips'      = ANY(a.aplicable_a) THEN 1 END) AS arts_pips,
      COUNT(CASE WHEN 'planeacion' = ANY(a.aplicable_a) THEN 1 END) AS arts_planeacion
    FROM normativa_documentos d
    LEFT JOIN normativa_articulos a ON a.documento_id = d.id
    WHERE d.vigente = TRUE
  `;

  return NextResponse.json({ documentos, stats: stats[0] });
}

// ─── POST — Crea documento o artículo ────────────────────────────────────────
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const teacher = await getTeacherByEmail(session.user.email);
  if (!teacher || teacher.role !== 'admin') {
    return NextResponse.json({ error: 'Acceso restringido a administradores' }, { status: 403 });
  }

  const body = await request.json();

  // ── Crear documento
  if (body.action === 'create_documento') {
    const { titulo, tipo, fuente, orden_display } = body;
    if (!titulo || !tipo) {
      return NextResponse.json({ error: 'titulo y tipo son requeridos' }, { status: 400 });
    }
    const [doc] = await db`
      INSERT INTO normativa_documentos (titulo, tipo, fuente, vigente, orden_display)
      VALUES (${titulo}, ${tipo}, ${fuente || null}, TRUE, ${orden_display || 0})
      RETURNING *
    `;
    return NextResponse.json({ success: true, documento: doc });
  }

  // ── Crear artículo
  if (body.action === 'create_articulo') {
    const { documento_id, numero, texto, aplicable_a, orden_en_doc } = body;
    if (!documento_id || !numero || !texto || !aplicable_a) {
      return NextResponse.json(
        { error: 'documento_id, numero, texto y aplicable_a son requeridos' },
        { status: 400 }
      );
    }
    if (!Array.isArray(aplicable_a) || aplicable_a.length === 0) {
      return NextResponse.json({ error: 'aplicable_a debe ser un array no vacío' }, { status: 400 });
    }
    const [art] = await db`
      INSERT INTO normativa_articulos (documento_id, numero, texto, aplicable_a, orden_en_doc)
      VALUES (${documento_id}, ${numero}, ${texto}, ${aplicable_a}, ${orden_en_doc || 0})
      RETURNING *
    `;
    return NextResponse.json({ success: true, articulo: art });
  }

  return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 });
}

// ─── PATCH — Actualiza documento o artículo ───────────────────────────────────
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const teacher = await getTeacherByEmail(session.user.email);
  if (!teacher || teacher.role !== 'admin') {
    return NextResponse.json({ error: 'Acceso restringido a administradores' }, { status: 403 });
  }

  const body = await request.json();

  // ── Actualizar documento (vigente, fuente, orden_display)
  if (body.action === 'update_documento') {
    const { id, vigente, fuente, orden_display, titulo } = body;
    if (!id) return NextResponse.json({ error: 'id es requerido' }, { status: 400 });
    const [doc] = await db`
      UPDATE normativa_documentos
      SET
        vigente       = COALESCE(${vigente ?? null}, vigente),
        fuente        = COALESCE(${fuente ?? null}, fuente),
        orden_display = COALESCE(${orden_display ?? null}, orden_display),
        titulo        = COALESCE(${titulo ?? null}, titulo)
      WHERE id = ${id}
      RETURNING *
    `;
    return NextResponse.json({ success: true, documento: doc });
  }

  // ── Actualizar artículo
  if (body.action === 'update_articulo') {
    const { id, numero, texto, aplicable_a, orden_en_doc } = body;
    if (!id) return NextResponse.json({ error: 'id es requerido' }, { status: 400 });
    const [art] = await db`
      UPDATE normativa_articulos
      SET
        numero      = COALESCE(${numero ?? null}, numero),
        texto       = COALESCE(${texto ?? null}, texto),
        aplicable_a = COALESCE(${aplicable_a ?? null}, aplicable_a),
        orden_en_doc = COALESCE(${orden_en_doc ?? null}, orden_en_doc)
      WHERE id = ${id}
      RETURNING *
    `;
    return NextResponse.json({ success: true, articulo: art });
  }

  return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 });
}

// ─── DELETE — Elimina artículo (nunca el documento sin confirmar) ─────────────
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const teacher = await getTeacherByEmail(session.user.email);
  if (!teacher || teacher.role !== 'admin') {
    return NextResponse.json({ error: 'Acceso restringido a administradores' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const articuloId = searchParams.get('articulo_id');
  const documentoId = searchParams.get('documento_id');

  if (articuloId) {
    await db`DELETE FROM normativa_articulos WHERE id = ${articuloId}`;
    return NextResponse.json({ success: true, deleted: 'articulo', id: articuloId });
  }

  if (documentoId) {
    // Elimina en cascada (FK ON DELETE CASCADE)
    await db`DELETE FROM normativa_documentos WHERE id = ${documentoId}`;
    return NextResponse.json({ success: true, deleted: 'documento', id: documentoId });
  }

  return NextResponse.json({ error: 'Debes proporcionar articulo_id o documento_id' }, { status: 400 });
}
