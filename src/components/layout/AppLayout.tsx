import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { neon } from '@neondatabase/serverless';
import { signOutAction } from '@/lib/server-actions';
import SignOutButton from './SignOutButton';

type Props = {
  children: React.ReactNode;
  locale: string;
  activeSection?: string;
};

async function checkIsAdmin(email: string): Promise<boolean> {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`SELECT email FROM admins WHERE email = ${email} LIMIT 1`;
    if (rows.length > 0) return true;
  } catch {}
  return process.env.ADMIN_EMAIL === email;
}

export default async function AppLayout({ children, locale, activeSection }: Props) {
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/login`);

  const user = session.user;
  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : user.email?.[0].toUpperCase() || '?';

  const isAdmin = user.email ? await checkIsAdmin(user.email) : false;

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <div className="header-logo">
          <span className="header-logo-icon">📚</span>
          <div>
            <div className="header-logo-text">DidácticaIA</div>
            <div className="header-logo-sub">DBEPA Puebla 2026-2027</div>
          </div>
        </div>
        <div className="header-right">
          <div className="header-user">
            <div className="header-avatar">
              {user.image
                ? <img src={user.image} alt={user.name || ''} />
                : initials
              }
            </div>
            <span>{user.name?.split(' ')[0] || user.email}</span>
          </div>
          <SignOutButton locale={locale} signOutAction={signOutAction} />
        </div>
      </header>

      {/* Sidebar */}
      <aside className="app-sidebar">
        <Link href={`/${locale}/nueva-planeacion`} className="sidebar-new-btn">
          + Nueva planeación
        </Link>
        <div className="sidebar-section-label">Menú</div>
        <Link href={`/${locale}/dashboard`} className={`sidebar-link ${activeSection === 'dashboard' ? 'active' : ''}`}>
          <span className="sidebar-link-icon">📂</span>Mis planeaciones
        </Link>
        <Link href={`/${locale}/paec`} className={`sidebar-link ${activeSection === 'paec' ? 'active' : ''}`}>
          <span className="sidebar-link-icon">🏫</span>Proyectos PAEC-PEC
        </Link>
        <Link href={`/${locale}/pmc`} className={`sidebar-link ${activeSection === 'pmc' ? 'active' : ''}`}>
          <span className="sidebar-link-icon">📈</span>Plan de Mejora (PMC)
        </Link>
        <Link href={`/${locale}/mis-documentos`} className={`sidebar-link ${activeSection === 'mis-documentos' ? 'active' : ''}`}>
          <span className="sidebar-link-icon">📁</span>Mis Documentos
        </Link>
        <Link href={`/${locale}/mis-escuelas`} className={`sidebar-link ${activeSection === 'mis-escuelas' ? 'active' : ''}`}>
          <span className="sidebar-link-icon">🏫</span>Mis Escuelas
        </Link>

        {/* Admin section — visible only for admins */}
        {isAdmin && (
          <>
            <div className="sidebar-section-label" style={{ marginTop: 16 }}>Administrador</div>
            <Link href={`/${locale}/admin`} className={`sidebar-link ${activeSection === 'admin' ? 'active' : ''}`} style={{ color: '#818cf8' }}>
              <span className="sidebar-link-icon">⚙️</span>Panel de Admin
            </Link>
          </>
        )}
      </aside>

      {/* Main */}
      <main className="app-main">
        {children}
      </main>
    </div>
  );
}
