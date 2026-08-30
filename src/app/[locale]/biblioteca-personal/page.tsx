import { getTranslations } from 'next-intl/server';
import { BibliotecaPersonalClient } from './BibliotecaPersonalClient';
import { setRequestLocale } from 'next-intl/server';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: 'Dashboard' });
  return {
    title: 'Biblioteca Personal | SIGPDA-EMS',
  };
}

export default async function BibliotecaPersonalPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  return <BibliotecaPersonalClient />;
}
