import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'DidácticaIA — Planeaciones DBEPA 2026-2027',
  description: 'Genera planeaciones didácticas oficiales DBEPA 2026-2027 con IA para el Bachillerato General Estatal, Digital y EMSAD de Puebla.',
  keywords: 'planeación didáctica, DBEPA, Puebla, NEM, MCCEMS, secuencia didáctica, IA',
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as 'es' | 'en')) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
