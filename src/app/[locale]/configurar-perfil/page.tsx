import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTeacherByEmail } from '@/lib/db';
import ConfigurarPerfilClient from './ConfigurarPerfilClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Configura tu perfil — DidácticaIA',
};

export default async function ConfigurarPerfilPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user?.email) redirect(`/${locale}/login`);

  const teacher = await getTeacherByEmail(session.user.email);
  if (!teacher) redirect(`/${locale}/login`);

  // Si el perfil ya está completo, redirigir al dashboard
  if (teacher.profile_completed) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <ConfigurarPerfilClient
      locale={locale}
      teacherName={session.user.name || session.user.email}
      teacherEmail={session.user.email}
      currentData={{
        schoolName: (teacher.school_name as string) || '',
        municipality: (teacher.municipality as string) || '',
        city: (teacher.city as string) || '',
        cct: (teacher.cct as string) || '',
        subsystem: (teacher.subsystem as string) || '',
      }}
    />
  );
}
