'use server';

import { signOut } from '@/lib/auth';

/**
 * Server Action for signing out.
 * Must be in a separate file (not inline in a component) so Client Components can use it.
 */
export async function signOutAction(locale: string) {
  await signOut({ redirectTo: `/${locale}/login` });
}

/**
 * Sign out without locale — used as a form action (e.g. maintenance screen).
 */
export async function signOutPlain() {
  await signOut({ redirectTo: '/es/login' });
}
