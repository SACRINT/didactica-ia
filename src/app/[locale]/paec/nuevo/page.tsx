import AppLayout from '@/components/layout/AppLayout';
import PaecWizardClient from './PaecWizardClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Asistente PAEC-PEC — DidácticaIA',
};

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ id?: string }>;
}

export default async function NuevoPaecPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { id } = await searchParams;

  return (
    <AppLayout locale={locale} activeSection="paec">
      <PaecWizardClient locale={locale} initialId={id || null} />
    </AppLayout>
  );
}
