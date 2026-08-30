import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import MisDocumentosClient from './MisDocumentosClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Mis Documentos — SIGPDA-EMS' };

export default async function MisDocumentosPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user?.email) redirect(`/${locale}/login`);
  return (
    <AppLayout locale={locale}>
      <MisDocumentosClient />
    </AppLayout>
  );
}
