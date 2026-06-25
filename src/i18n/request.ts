import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import esMessages from '../../messages/es.json';
import enMessages from '../../messages/en.json';

const messageMap: Record<string, Record<string, unknown>> = {
  es: esMessages as Record<string, unknown>,
  en: enMessages as Record<string, unknown>,
};

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as 'es' | 'en')) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: messageMap[locale] ?? esMessages,
  };
});
