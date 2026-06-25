import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import LoginButton from '@/components/auth/LoginButton';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Iniciar sesión — DidácticaIA',
    description: 'Accede a DidácticaIA con tu correo institucional de la SEP Puebla',
  };
}

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (session?.user) {
    redirect(`/${locale}/dashboard`);
  }

  const t = await getTranslations('auth');

  return (
    <main className="login-page">
      <div className="login-container">
        {/* Header */}
        <div className="login-header">
          <div className="login-logo">
            <span className="logo-icon">📚</span>
            <h1 className="logo-text">DidácticaIA</h1>
          </div>
          <div className="dbepa-badge">DBEPA · Puebla · 2026-2027</div>
        </div>

        {/* Card */}
        <div className="login-card">
          <h2 className="login-title">{t('title')}</h2>
          <p className="login-subtitle">{t('subtitle')}</p>

          <div className="login-divider" />

          <LoginButton />

          <p className="login-terms">{t('termsNotice')}</p>
        </div>

        {/* Footer */}
        <div className="login-footer">
          <p>Secretaría de Educación Pública del Estado de Puebla</p>
          <p>Dirección de Bachilleratos Estatales y Preparatoria Abierta</p>
        </div>
      </div>

      {/* Background decorative elements */}
      <div className="login-bg">
        <div className="bg-circle bg-circle-1" />
        <div className="bg-circle bg-circle-2" />
        <div className="bg-circle bg-circle-3" />
      </div>
    </main>
  );
}
