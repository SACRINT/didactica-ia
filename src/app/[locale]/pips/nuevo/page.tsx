// src/app/[locale]/pips/nuevo/page.tsx
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import PipsWizard from './PipsWizard';

export const metadata: Metadata = {
  title: 'Nuevo PIPS — Plan de Intervención Pedagógica de Supervisión · DidácticaIA',
};

export default async function NuevoPipsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user?.email) redirect(`/${locale}/login`);

  return (
    <AppLayout locale={locale} activeSection="pips">
      <div className="page-header">
        <h1 className="page-title">Plan de Intervención Pedagógica de Supervisión</h1>
        <p className="page-subtitle">
          Completa el asistente paso a paso. La IA generará el PIPS completo al final.
        </p>
      </div>
      <Suspense fallback={<div style={{ color: 'var(--c-text-muted)', padding: 40, textAlign: 'center' }}>Cargando asistente…</div>}>
        <PipsWizard locale={locale} />
      </Suspense>
    </AppLayout>
  );
}
