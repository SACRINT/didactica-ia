import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTeacherByEmail } from '@/lib/db';
import PmcWizardClient from './PmcWizardClient';
import type { Metadata } from 'next';
import { neon } from '@neondatabase/serverless';

export const metadata: Metadata = {
  title: 'Nuevo PMC — DidácticaIA',
};

export default async function PmcNuevoPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ id?: string }>;
}) {
  const { locale } = await params;
  const { id } = await searchParams;

  const session = await auth();
  if (!session?.user?.email) redirect(`/${locale}/login`);

  const teacher = await getTeacherByEmail(session.user.email);
  if (!teacher) redirect(`/${locale}/login`);

  let project = null;
  if (id) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set');
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      SELECT * FROM pmc_projects
      WHERE id = ${id}::uuid AND teacher_id = ${teacher.id}::uuid
      LIMIT 1
    `;
    project = rows[0] || null;
  }

  return (
    <PmcWizardClient
      locale={locale}
      teacherId={teacher.id as string}
      teacherName={teacher.name as string}
      teacherSchool={teacher.school_name as string}
      teacherMunicipality={teacher.municipality as string}
      existingProject={project}
    />
  );
}
