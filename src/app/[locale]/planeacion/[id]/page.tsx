import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTeacherByEmail, getPlanningById } from '@/lib/db';
import AppLayout from '@/components/layout/AppLayout';
import Link from 'next/link';
import type { GeneratedPlanningContent } from '@/types/planning';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ver planeación — DidácticaIA',
};

export default async function PlanningDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await auth();
  if (!session?.user?.email) redirect(`/${locale}/login`);

  const teacher = await getTeacherByEmail(session.user.email);
  if (!teacher) redirect(`/${locale}/login`);

  const planning = await getPlanningById(id, teacher.id);
  if (!planning) redirect(`/${locale}/dashboard`);

  const content = planning.content_json as GeneratedPlanningContent | null;
  const s1 = content?.sectionI;

  return (
    <AppLayout locale={locale}>
      <div className="page-header">
        <Link
          href={`/${locale}/dashboard`}
          className="btn btn-ghost"
          style={{ marginBottom: '12px', display: 'inline-flex' }}
        >
          ← Mis planeaciones
        </Link>
        <h1 className="page-title">{planning.uac_name as string}</h1>
        <p className="page-subtitle">
          {planning.semester as number}° Semestre · Ciclo 2026-2027
        </p>
        <div className="page-actions">
          {content && (
            <a href={`/api/docx/${id}`} className="btn btn-amber">
              ↓ Descargar DOCX editable
            </a>
          )}
        </div>
      </div>

      {!content ? (
        <div className="alert alert-warning">
          <span>⚠️</span>
          <span>
            Esta planeación aún no ha sido generada. Regresa al asistente para completar el proceso.
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Section I */}
          <div className="section-card">
            <div className="section-card-header">
              <span className="section-card-title">I. Datos Generales y Administrativos</span>
            </div>
            <div className="section-card-body">
              <div className="form-row">
                <div><strong>Docente:</strong> {s1?.teacherName}</div>
                <div><strong>UAC:</strong> {s1?.uacName}</div>
                <div><strong>Semestre:</strong> {s1?.semester}°</div>
                <div><strong>Grupos:</strong> {s1?.groups}</div>
                <div><strong>Carga horaria:</strong> {s1?.totalHours} hrs.</div>
                <div><strong>Subsistema:</strong> {s1?.subsystem}</div>
              </div>
            </div>
          </div>

          {/* Section II */}
          <div className="section-card">
            <div className="section-card-header">
              <span className="section-card-title">II. Propósito Formativo de la Clase</span>
            </div>
            <div className="section-card-body">
              <p style={{ marginBottom: '12px' }}>{content.sectionII?.purpose}</p>
              <p><strong>Vinculación PAEC:</strong></p>
              <p style={{ color: 'var(--c-text-2)', fontStyle: 'italic' }}>
                {content.sectionII?.paecConnection}
              </p>
            </div>
          </div>

          {/* Section IV summary */}
          {(() => {
            const isLaboral = s1?.component?.toLowerCase().includes('laboral') || false;
            const activityLabel = isLaboral ? 'Actividades Clave' : 'Propósitos y Contenidos formativos';
            const prefix = isLaboral ? 'AC' : 'PC';
            return (
              <div className="section-card">
                <div className="section-card-header">
                  <span className="section-card-title">
                    IV. {activityLabel} ({content.sectionIV?.activities?.length || 0} elementos)
                  </span>
                </div>
                <div className="section-card-body">
                  {content.sectionIV?.activities?.map((a, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '12px 16px',
                        background: i % 2 === 0 ? 'var(--c-blue-pale)' : 'var(--c-surface)',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        borderLeft: '3px solid var(--c-blue-mid)',
                      }}
                    >
                      <strong>{prefix}{i + 1}:</strong> {a.name}{' '}
                      <span style={{ color: 'var(--c-text-muted)' }}>({a.hours} hrs.)</span>
                      {' — '}
                      <em style={{ color: 'var(--c-navy-light)' }}>{a.methodology}</em>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Section V summary */}
          {content.sectionV?.evaluations && (
            <div className="section-card">
              <div className="section-card-header">
                <span className="section-card-title">V. Estrategia de Evaluación Formativa</span>
              </div>
              <div className="section-card-body">
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'var(--c-navy)', color: '#fff' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Tipo</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Agente</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Evidencia</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Instrumento</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center' }}>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {content.sectionV.evaluations.map((ev, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : 'var(--c-blue-pale)' }}>
                          <td style={{ padding: '8px 12px' }}>{ev.type}</td>
                          <td style={{ padding: '8px 12px' }}>{ev.agent}</td>
                          <td style={{ padding: '8px 12px' }}>{ev.evidence}</td>
                          <td style={{ padding: '8px 12px' }}>{ev.instrument}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>
                            {ev.percentage}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div className="alert alert-info">
            <span>📝</span>
            <span>
              El documento DOCX completo con las 7 secciones, tablas con formato oficial DBEPA y
              colores institucionales está listo para descargar y editar en Microsoft Word o Google Docs.
            </span>
          </div>

        </div>
      )}
    </AppLayout>
  );
}
