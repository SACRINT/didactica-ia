import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTeacherByEmail } from '@/lib/db';
import { getSubscriptionStatus } from '@/lib/subscription-gate';
import SuscripcionClient from './SuscripcionClient';
import type { Metadata } from 'next';
import { PLANS, EXTRA_SUBJECT_PRICE_MXN } from '@/lib/stripe';

export const metadata: Metadata = {
  title: 'Suscripción — DidácticaIA',
};

export default async function SuscripcionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ canceled?: string }>;
}) {
  const { locale } = await params;
  const { canceled } = await searchParams;
  const session = await auth();
  if (!session?.user?.email) redirect(`/${locale}/login`);

  const teacher = await getTeacherByEmail(session.user.email);
  if (!teacher) redirect(`/${locale}/login`);

  // Admin no necesita suscripción
  if (session.user.email === process.env.ADMIN_EMAIL) {
    redirect(`/${locale}/dashboard`);
  }

  // Si perfil no configurado, primero configurar perfil
  if (!teacher.profile_completed) {
    redirect(`/${locale}/configurar-perfil`);
  }

  const subscriptionStatus = await getSubscriptionStatus(
    teacher.id as string,
    session.user.email
  );

  return (
    <SuscripcionClient
      locale={locale}
      plans={[...PLANS]}
      extraSubjectPriceMXN={EXTRA_SUBJECT_PRICE_MXN}
      currentSubscription={subscriptionStatus.subscription}
      currentSubjects={subscriptionStatus.subjects}
      canceled={canceled === '1'}
      teacherSchool={(teacher.school_name as string) || ''}
    />
  );
}
