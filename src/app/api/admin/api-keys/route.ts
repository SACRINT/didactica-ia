import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { requireAdmin, adminUnauthorized, adminForbidden } from '@/lib/admin-auth';

function getDb() { return neon(process.env.DATABASE_URL!); }

function getEncKey(): Buffer {
  const key = process.env.ADMIN_ENCRYPTION_KEY;
  if (!key || key.length !== 32) throw new Error('ADMIN_ENCRYPTION_KEY must be 32 characters');
  return Buffer.from(key);
}

function encryptApiKey(plain: string): { encrypted: string; preview: string } {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', getEncKey(), iv);
  let enc = cipher.update(plain, 'utf8', 'hex');
  enc += cipher.final('hex');
  return {
    encrypted: iv.toString('hex') + ':' + enc,
    preview: '...' + plain.slice(-4),
  };
}

// GET /api/admin/api-keys — list all keys (without decrypted value)
export async function GET() {
  try {
    await requireAdmin();
    const sql = getDb();
    const rows = await sql`
      SELECT id, label, provider, model_default, key_preview, is_active, priority,
             usage_count, error_count, last_used_at, last_error_at, created_at
      FROM api_keys
      ORDER BY provider, priority ASC
    `;
    return NextResponse.json({ keys: rows });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return adminUnauthorized();
    if (e.message === 'FORBIDDEN') return adminForbidden();
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/admin/api-keys — add a new API key
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { label, provider, modelDefault, apiKey } = await req.json();
    if (!label || !provider || !apiKey) {
      return NextResponse.json({ error: 'label, provider y apiKey son requeridos' }, { status: 400 });
    }

    const { encrypted, preview } = encryptApiKey(apiKey);
    const sql = getDb();

    // Get max priority for this provider to auto-assign next
    const maxRow = await sql`SELECT COALESCE(MAX(priority), 0) as max_p FROM api_keys WHERE provider = ${provider}`;
    const nextPriority = (maxRow[0]?.max_p || 0) + 1;

    const inserted = await sql`
      INSERT INTO api_keys (label, provider, model_default, key_encrypted, key_preview, is_active, priority)
      VALUES (${label}, ${provider}, ${modelDefault || null}, ${encrypted}, ${preview}, true, ${nextPriority})
      RETURNING id, label, provider, model_default, key_preview, is_active, priority, usage_count, error_count, created_at
    `;
    return NextResponse.json({ key: inserted[0] }, { status: 201 });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return adminUnauthorized();
    if (e.message === 'FORBIDDEN') return adminForbidden();
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT /api/admin/api-keys — update a key (active status, priority, label, modelDefault)
export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json({ error: 'El ID de la API Key es requerido' }, { status: 400 });
    }
    const sql = getDb();

    // Construcción dinámica de campos para evitar problemas de tipos de COALESCE con NULL en Neon
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (body.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(body.isActive);
    }
    if (body.priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      params.push(body.priority);
    }
    if (body.label !== undefined) {
      updates.push(`label = $${paramIndex++}`);
      params.push(body.label);
    }
    if (body.modelDefault !== undefined) {
      updates.push(`model_default = $${paramIndex++}`);
      params.push(body.modelDefault);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No se especificaron campos para actualizar' }, { status: 400 });
    }

    params.push(id); // ID como último parámetro
    const query = `UPDATE api_keys SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
    
    await sql.query(query, params);
    
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return adminUnauthorized();
    if (e.message === 'FORBIDDEN') return adminForbidden();
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/admin/api-keys
export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'El ID de la API Key es requerido' }, { status: 400 });
    }
    const sql = getDb();
    await sql`DELETE FROM api_keys WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return adminUnauthorized();
    if (e.message === 'FORBIDDEN') return adminForbidden();
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

