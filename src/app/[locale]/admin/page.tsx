import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { neon } from '@neondatabase/serverless';
import AppLayout from '@/components/layout/AppLayout';
import AdminClient from './AdminClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Panel de Administrador — SIGPDA-EMS',
};

async function isAdmin(email: string): Promise<boolean> {
  if (process.env.ADMIN_EMAIL === email) return true;
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const adminRows = await sql`SELECT email FROM admins WHERE email = ${email} LIMIT 1`;
    if (adminRows.length > 0) return true;
    
    const teacherRows = await sql`SELECT role FROM teachers WHERE email = ${email} LIMIT 1`;
    if (teacherRows.length > 0 && teacherRows[0].role === 'administrador') return true;
  } catch {}
  return false;
}

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user?.email) redirect(`/${locale}/login`);

  const adminOk = await isAdmin(session.user.email);
  if (!adminOk) redirect(`/${locale}/dashboard`);

  return (
    <AppLayout locale={locale}>
      <AdminClient locale={locale} adminEmail={session.user.email} />
    </AppLayout>
  );
}
