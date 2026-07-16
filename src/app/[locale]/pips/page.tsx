// src/app/[locale]/pips/page.tsx
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTeacherByEmail } from '@/lib/db';
import AppLayout from '@/components/layout/AppLayout';
import Link from 'next/link';
import type { Metadata } from 'next';
import { neon } from '@neondatabase/serverless';
import DeletePipsButton from './DeletePipsButton';

export const metadata: Metadata = {
  title: 'PIPS — Plan de Intervención Pedagógica de Supervisión · DidácticaIA',
};

export default async function PipsDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user?.email) redirect(`/${locale}/login`);

  const teacher = await getTeacherByEmail(session.user.email);
  if (!teacher) redirect(`/${locale}/login`);

  const sql = neon(process.env.DATABASE_URL!);
  const projects = await sql`
    SELECT id, zona_nombre, zona_clave, supervisor_name,
           ciclo_escolar, num_planteles, current_step, status, created_at, updated_at
    FROM pips_projects
    WHERE teacher_id = ${teacher.id}::uuid
    ORDER BY updated_at DESC
  `;

  return (
    <AppLayout locale={locale} activeSection="pips">
      <div className="page-header">
        <h1 className="page-title">Plan de Intervención Pedagógica (PIPS)</h1>
        <p className="page-subtitle">
          Supervisión Escolar · {projects.length} plan{projects.length !== 1 ? 'es' : ''} registrado{projects.length !== 1 ? 's' : ''}
        </p>
        <div className="page-actions">
          <Link href={`/${locale}/pips/nuevo`} className="btn btn-primary">
            + Nuevo PIPS
          </Link>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏫</div>
          <h2 className="empty-state-title">Aún no tienes planes PIPS</h2>
          <p className="empty-state-text">
            Elabora tu Plan de Intervención Pedagógica de Supervisión de forma guiada.
            La IA analizará el diagnóstico de tu zona y generará objetivos, cronograma y estrategias completas.
          </p>
          <Link href={`/${locale}/pips/nuevo`} className="btn btn-primary">
            Crear primer PIPS
          </Link>
        </div>
      ) : (
        <div className="planning-grid">
          {projects.map((proj) => (
            <div
              key={proj.id as string}
              className="planning-card"
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div>
                <div className="planning-card-header">
                  <h3 className="planning-card-title">{proj.zona_nombre as string}</h3>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--c-text-muted)', marginBottom: '10px' }}>
                  <strong>Clave:</strong> {proj.zona_clave as string || '—'}
                  &nbsp;&nbsp;|&nbsp;&nbsp;
                  <strong>Supervisor:</strong> {proj.supervisor_name as string || '—'}
                </p>
                <div className="planning-card-meta" style={{ marginBottom: '16px' }}>
                  <span
                    className="badge badge-component"
                    style={{ backgroundColor: 'var(--c-blue-mid)', color: '#fff' }}
                  >
                    Ciclo {proj.ciclo_escolar as string}
                  </span>
                  <span
                    className={`badge ${proj.status === 'completed' ? 'badge-generated' : 'badge-draft'}`}
                    style={{
                      backgroundColor: proj.status === 'completed' ? '#28a745' : '#ffc107',
                      color: proj.status === 'completed' ? '#fff' : '#212529',
                    }}
                  >
                    {proj.status === 'completed'
                      ? '✅ Completado'
                      : `Paso ${proj.current_step} de 6`}
                  </span>
                  <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                    {proj.num_planteles as number} planteles
                  </span>
                </div>
              </div>
              <div>
                <p className="planning-card-date">
                  Actualizado:{' '}
                  {new Date(proj.updated_at as string).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
                <div
                  className="planning-card-actions"
                  style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}
                >
                  <Link
                    href={`/${locale}/pips/nuevo?id=${proj.id as string}`}
                    className="btn btn-secondary btn-sm"
                  >
                    {proj.status === 'completed' ? 'Ver / Editar' : 'Continuar'}
                  </Link>
                  {proj.status === 'completed' && (
                    <a
                      href={`/api/docx/pips/${proj.id as string}`}
                      className="btn btn-primary btn-sm"
                      style={{ backgroundColor: 'var(--c-amber)', borderColor: 'var(--c-amber)', color: '#fff' }}
                    >
                      ↓ Descargar Word
                    </a>
                  )}
                  <DeletePipsButton id={proj.id as string} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
