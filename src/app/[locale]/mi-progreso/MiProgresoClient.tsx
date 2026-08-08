'use client';
// src/app/[locale]/mi-progreso/MiProgresoClient.tsx
import { useEffect, useState } from 'react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────
interface FeedbackSummary {
  entity_type: string;
  avg_rating: number;
  total_count: number;
  recent_comment: string | null;
}

interface PlanningStats {
  total_plannings: number;
  by_semester: Record<number, number>;
  by_component: Record<string, number>;
  recent: { id: string; uac_name: string; created_at: string }[];
}

interface ProgressData {
  feedback: FeedbackSummary[];
  plannings: PlanningStats;
  paec_count: number;
  pmc_count: number;
  pips_count: number;
  library_docs_count: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const entityLabels: Record<string, string> = {
  planning: 'Planeaciones',
  paec: 'PAEC / PEC',
  pmc: 'PMC',
  pips: 'PIPS',
};

const componentLabels: Record<string, string> = {
  laboral: 'Formación Laboral',
  fundamental: 'Fundamental',
  ampliado: 'Ampliado',
};

function StarBar({ rating }: { rating: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          style={{
            fontSize: '1.1rem',
            color: s <= Math.round(rating) ? '#f59e0b' : 'rgba(255,255,255,0.18)',
          }}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: string;
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="stat-card">
      <span className="stat-icon">{icon}</span>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MiProgresoClient({ locale }: { locale: string }) {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch('/api/pedagogical-analytics');
        if (!res.ok) throw new Error('Error al cargar datos');
        setData(await res.json());
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, []);

  const overallAvg =
    data?.feedback && data.feedback.length > 0
      ? data.feedback.reduce((s, f) => s + f.avg_rating, 0) / data.feedback.length
      : null;

  return (
    <div className="progreso-page">
      {/* Header */}
      <div className="progreso-header">
        <Link href={`/${locale}/dashboard`} className="back-link">
          ← Dashboard
        </Link>
        <h1 className="progreso-title">📊 Mi Progreso Pedagógico</h1>
        <p className="progreso-subtitle">
          Estadísticas personales sobre la calidad y uso de tus generaciones con IA
        </p>
      </div>

      {loading && (
        <div className="progreso-loading">
          <div className="spinner" />
          <p>Cargando estadísticas…</p>
        </div>
      )}

      {error && (
        <div className="progreso-error">
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* KPI Cards */}
          <div className="kpi-grid">
            <StatCard icon="📝" label="Planeaciones" value={data.plannings.total_plannings} />
            <StatCard icon="📋" label="PAEC / PEC" value={data.paec_count} />
            <StatCard icon="📈" label="PMC" value={data.pmc_count} />
            <StatCard icon="🗺️" label="PIPS" value={data.pips_count} />
            <StatCard icon="📚" label="Docs en Biblioteca" value={data.library_docs_count} />
            {overallAvg !== null && (
              <StatCard
                icon="⭐"
                label="Calidad IA promedio"
                value={`${overallAvg.toFixed(1)} / 5`}
                sub="basado en tus evaluaciones"
              />
            )}
          </div>

          {/* Feedback by Module */}
          {data.feedback.length > 0 ? (
            <div className="progreso-section">
              <h2 className="section-title">Evaluación de Calidad por Módulo</h2>
              <div className="feedback-grid">
                {data.feedback.map((f) => (
                  <div key={f.entity_type} className="feedback-card">
                    <div className="feedback-card-header">
                      <span className="feedback-entity-label">
                        {entityLabels[f.entity_type] ?? f.entity_type}
                      </span>
                      <span className="feedback-count">{f.total_count} evaluación{f.total_count !== 1 ? 'es' : ''}</span>
                    </div>
                    <div className="feedback-rating-row">
                      <StarBar rating={f.avg_rating} />
                      <span className="feedback-avg">{f.avg_rating.toFixed(1)}</span>
                    </div>
                    {f.recent_comment && (
                      <p className="feedback-comment">"{f.recent_comment}"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="progreso-empty">
              <p>
                Aún no has evaluado ninguna generación de IA.<br />
                <span style={{ fontSize: '0.85rem', opacity: 0.6 }}>
                  Cuando abras una planeación o PAEC verás la opción de calificarla con ★★★★★.
                </span>
              </p>
            </div>
          )}

          {/* Plannings distribution */}
          {data.plannings.total_plannings > 0 && (
            <div className="progreso-section">
              <h2 className="section-title">Planeaciones por Semestre y Componente</h2>
              <div className="dist-grid">
                <div className="dist-card">
                  <h3 className="dist-title">Por Semestre</h3>
                  {Object.entries(data.plannings.by_semester)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([sem, count]) => (
                      <div key={sem} className="dist-row">
                        <span>{sem}° Semestre</span>
                        <span className="dist-bar-wrap">
                          <span
                            className="dist-bar"
                            style={{
                              width: `${Math.round((count / data.plannings.total_plannings) * 100)}%`,
                            }}
                          />
                        </span>
                        <span className="dist-count">{count}</span>
                      </div>
                    ))}
                </div>

                <div className="dist-card">
                  <h3 className="dist-title">Por Componente</h3>
                  {Object.entries(data.plannings.by_component).map(([comp, count]) => (
                    <div key={comp} className="dist-row">
                      <span>{componentLabels[comp] ?? comp}</span>
                      <span className="dist-bar-wrap">
                        <span
                          className="dist-bar"
                          style={{
                            width: `${Math.round((count / data.plannings.total_plannings) * 100)}%`,
                            background: 'linear-gradient(90deg, #10b981, #34d399)',
                          }}
                        />
                      </span>
                      <span className="dist-count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent plannings */}
              <div className="recent-section">
                <h3 className="dist-title" style={{ marginBottom: 12 }}>Planeaciones Recientes</h3>
                {data.plannings.recent.map((p) => (
                  <Link
                    key={p.id}
                    href={`/${locale}/planeacion/${p.id}`}
                    className="recent-row"
                  >
                    <span className="recent-name">{p.uac_name}</span>
                    <span className="recent-date">
                      {new Date(p.created_at).toLocaleDateString('es-MX', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .progreso-page {
          max-width: 860px;
          margin: 0 auto;
          padding: 24px 16px 60px;
          display: flex;
          flex-direction: column;
          gap: 28px;
          color: #f1f5f9;
        }
        .back-link {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.45);
          text-decoration: none;
          display: inline-block;
          margin-bottom: 8px;
        }
        .back-link:hover { color: #fff; }
        .progreso-title {
          font-size: 1.9rem;
          font-weight: 800;
          margin: 0;
          background: linear-gradient(135deg, #a78bfa, #60a5fa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .progreso-subtitle {
          font-size: 0.9rem;
          color: rgba(255,255,255,0.5);
          margin: 4px 0 0;
        }
        .progreso-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          color: rgba(255,255,255,0.45);
          padding: 60px 0;
        }
        .spinner {
          width: 36px; height: 36px;
          border: 3px solid rgba(255,255,255,0.1);
          border-top-color: #7c3aed;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .progreso-error {
          background: rgba(239,68,68,0.12);
          border: 1px solid rgba(239,68,68,0.3);
          border-radius: 10px;
          padding: 16px;
          color: #fca5a5;
        }
        .progreso-empty {
          background: rgba(255,255,255,0.04);
          border: 1px dashed rgba(255,255,255,0.12);
          border-radius: 12px;
          padding: 32px;
          text-align: center;
          color: rgba(255,255,255,0.5);
        }
        /* KPIs */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 14px;
        }
        .stat-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 18px 16px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .stat-icon { font-size: 1.5rem; line-height: 1; }
        .stat-value {
          font-size: 1.6rem;
          font-weight: 800;
          line-height: 1;
          background: linear-gradient(135deg, #a78bfa, #60a5fa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .stat-label {
          font-size: 0.78rem;
          color: rgba(255,255,255,0.5);
          margin-top: 4px;
        }
        .stat-sub {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.3);
          margin-top: 2px;
        }
        /* Sections */
        .progreso-section {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 20px;
        }
        .section-title {
          font-size: 1rem;
          font-weight: 700;
          color: rgba(255,255,255,0.85);
          margin: 0 0 16px;
        }
        /* Feedback cards */
        .feedback-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
        }
        .feedback-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 12px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .feedback-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .feedback-entity-label {
          font-weight: 700;
          font-size: 0.85rem;
        }
        .feedback-count {
          font-size: 0.72rem;
          color: rgba(255,255,255,0.4);
        }
        .feedback-rating-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .feedback-avg {
          font-size: 1.1rem;
          font-weight: 800;
          color: #f59e0b;
        }
        .feedback-comment {
          font-size: 0.77rem;
          color: rgba(255,255,255,0.4);
          font-style: italic;
          margin: 0;
          line-height: 1.4;
        }
        /* Distribution */
        .dist-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }
        @media (max-width: 560px) {
          .dist-grid { grid-template-columns: 1fr; }
        }
        .dist-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .dist-title {
          font-size: 0.82rem;
          font-weight: 700;
          color: rgba(255,255,255,0.6);
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .dist-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.82rem;
        }
        .dist-row > span:first-child {
          width: 100px;
          flex-shrink: 0;
          color: rgba(255,255,255,0.7);
        }
        .dist-bar-wrap {
          flex: 1;
          background: rgba(255,255,255,0.07);
          border-radius: 4px;
          height: 8px;
          overflow: hidden;
        }
        .dist-bar {
          display: block;
          height: 100%;
          background: linear-gradient(90deg, #7c3aed, #4f46e5);
          border-radius: 4px;
          min-width: 4px;
        }
        .dist-count {
          width: 24px;
          text-align: right;
          font-weight: 700;
          color: rgba(255,255,255,0.8);
          font-size: 0.8rem;
        }
        /* Recent */
        .recent-section {
          border-top: 1px solid rgba(255,255,255,0.07);
          padding-top: 16px;
        }
        .recent-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          text-decoration: none;
          transition: background 0.15s;
        }
        .recent-row:hover .recent-name { color: #a78bfa; }
        .recent-name {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.75);
          transition: color 0.15s;
        }
        .recent-date {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.35);
        }
      `}</style>
    </div>
  );
}
