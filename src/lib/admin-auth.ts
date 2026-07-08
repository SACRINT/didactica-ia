/**
 * Admin middleware helper — verifies that the current session user is an admin.
 * Returns the user email if authorized, throws otherwise.
 */

import { auth } from '@/lib/auth';
import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

export async function requireAdmin(): Promise<string> {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error('UNAUTHORIZED');
  }

  const email = session.user.email;

  try {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`SELECT email FROM admins WHERE email = ${email} LIMIT 1`;
    if (rows.length === 0) throw new Error('FORBIDDEN');
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') throw err;
    // Also check env var as fallback during initial setup
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail || adminEmail !== email) {
      throw new Error('FORBIDDEN');
    }
  }

  return email;
}

export function adminUnauthorized() {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
}

export function adminForbidden() {
  return NextResponse.json({ error: 'Acceso denegado. Solo administradores.' }, { status: 403 });
}
