// src/app/[locale]/mi-progreso/page.tsx
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import MiProgresoClient from './MiProgresoClient';

interface Props {
  params: Promise<{ locale: string }>;
}

export const metadata = {
  title: 'Mi Progreso Pedagógico — SIGPDA-EMS',
  description: 'Estadísticas personales de calidad educativa y uso de IA en tus planeaciones.',
};

export default async function MiProgresoPage({ params }: Props) {
  const session = await auth();
  const { locale } = await params;

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  return <MiProgresoClient locale={locale} />;
}
