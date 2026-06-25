import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import NuevaPlaneacionClient from './NuevaPlaneacionClient';

export default async function NuevaPlaneacionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user?.email) redirect(`/${locale}/login`);

  return (
    <AppLayout locale={locale}>
      <NuevaPlaneacionClient locale={locale} />
    </AppLayout>
  );
}
