import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

/**
 * GET /api/maintenance-status
 * Public endpoint — returns maintenance mode state and message.
 * Called by AppLayout to gate user access without requiring auth.
 */
export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`
      SELECT key, value FROM platform_config
      WHERE key IN ('maintenance_mode', 'maintenance_message')
    `;
    const cfg: Record<string, string> = {};
    for (const r of rows) cfg[r.key] = r.value;

    return NextResponse.json({
      active: cfg.maintenance_mode === 'true',
      message: cfg.maintenance_message || 'La plataforma está en mantenimiento. Por favor regresa más tarde.',
    });
  } catch {
    // If DB fails or table doesn't exist yet, don't block users
    return NextResponse.json({ active: false, message: '' });
  }
}
