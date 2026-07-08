import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { requireAdmin, adminUnauthorized, adminForbidden } from '@/lib/admin-auth';

function getDb() { return neon(process.env.DATABASE_URL!); }

// GET /api/admin/users — list all teachers with stats
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const sql = getDb();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q') || '';

    const teachers = await sql`
      SELECT
        t.id, t.name, t.email, t.school_name, t.municipality, t.subsystem,
        t.is_blocked, t.created_at,
        (SELECT COUNT(*) FROM plannings p WHERE p.teacher_id = t.id) AS planning_count,
        (SELECT COUNT(*) FROM paec_projects pa WHERE pa.teacher_id = t.id) AS paec_count,
        (SELECT COUNT(*) FROM pmc_projects pm WHERE pm.teacher_id = t.id) AS pmc_count,
        (SELECT COUNT(*) FROM user_documents ud WHERE ud.teacher_email = t.email) AS doc_count,
        (SELECT MAX(created_at) FROM activity_log al WHERE al.teacher_email = t.email) AS last_active
      FROM teachers t
      WHERE (${search} = '' OR t.name ILIKE ${'%' + search + '%'} OR t.email ILIKE ${'%' + search + '%'})
      ORDER BY t.created_at DESC
    `;
    return NextResponse.json({ teachers });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return adminUnauthorized();
    if (e.message === 'FORBIDDEN') return adminForbidden();
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT /api/admin/users — block/unblock a user
export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const { teacherId, isBlocked } = await req.json();
    const sql = getDb();

    // Ensure teachers table has is_blocked column
    await sql`
      ALTER TABLE teachers ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE
    `.catch(() => {}); // Ignore if already exists

    await sql`UPDATE teachers SET is_blocked = ${isBlocked} WHERE id = ${teacherId}`;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return adminUnauthorized();
    if (e.message === 'FORBIDDEN') return adminForbidden();
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
