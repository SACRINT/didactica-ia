'use client';

import { clearAllWizardDrafts } from '@/hooks/useWizardPersistence';

interface Props {
  locale: string;
  signOutAction: (locale: string) => Promise<void>;
}

/**
 * Client-side sign-out button that clears all wizard localStorage drafts
 * before triggering the server-side sign-out action.
 */
export default function SignOutButton({ locale, signOutAction }: Props) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // Clear all wizard drafts from localStorage before signing out
    clearAllWizardDrafts();
  };

  return (
    <form action={signOutAction.bind(null, locale)} onSubmit={handleSubmit}>
      <button type="submit" className="header-btn">Cerrar sesión</button>
    </form>
  );
}
