import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import MisEscuelasClient from './MisEscuelasClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Mis Escuelas — Didáctica-IA' };

export default async function MisEscuelasPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user?.email) redirect(`/${locale}/login`);
  return (
    <AppLayout locale={locale}>
      <MisEscuelasClient />
    </AppLayout>
  );
}
