'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import type { GeneratedPlanningContent, Planning, PlanningExtra } from '@/types/planning';
import { ExtraPreviewModal } from '@/components/planeacion/ExtraPreviewModal';

interface PlanningDetailClientProps {
  locale: string;
  planning: Planning;
  initialExtras: PlanningExtra[];
}

export default function PlanningDetailClient({
  locale,
  planning,
  initialExtras,
}: PlanningDetailClientProps) {
  const content = planning.contentJson as GeneratedPlanningContent | null;
  const s1 = content?.sectionI;
  const isLaboral = s1?.component?.toLowerCase().includes('laboral') || false;
  const activityLabel = isLaboral ? 'Actividades Clave' : 'Propósitos y Contenidos formativos';
  const prefix = isLaboral ? 'AC' : 'PC';

  // Tabs state
  const [activeTab, setActiveTab] = useState<'planning' | 'extras' | 'lessonPlans'>('planning');

  // Extras state
  const [extras, setExtras] = useState<PlanningExtra[]>(initialExtras);
  const [generatingKey, setGeneratingKey] = useState<string | null>(null);
  const [previewExtra, setPreviewExtra] = useState<PlanningExtra | null>(null);

  // Fetch extras on mount (to ensure sync)
  useEffect(() => {
    async function loadExtras() {
      try {
        const res = await fetch(`/api/plannings/${planning.id}/extras`);
        if (res.ok) {
          const data = await res.json();
          setExtras(data);
        }
      } catch (err) {
        console.error('Failed to load extras:', err);
      }
    }
    loadExtras();
  }, [planning.id]);

  // Generate extra handler
  async function handleGenerateExtra(
    type: 'rubric' | 'checklist' | 'material' | 'lesson_plan',
    title: string,
    keyIndex: number | null,
    extraData: {
      activityName?: string;
      evidence?: string;
      sessionNum?: number;
      totalSessions?: number;
    }
  ) {
    // Generate unique key for loading state
    const loadingKey = `${type}-${keyIndex !== null ? keyIndex : ''}-${extraData.sessionNum || ''}-${extraData.evidence || title}`;
    setGeneratingKey(loadingKey);

    try {
      const res = await fetch(`/api/plannings/${planning.id}/extras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title,
          keyIndex,
          ...extraData,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to generate extra');
      }

      const result = await res.json();
      if (result.success && result.extra) {
        setExtras((prev) => [...prev, result.extra]);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al generar el recurso');
    } finally {
      setGeneratingKey(null);
    }
  }

  // Delete extra handler
  async function handleDeleteExtra(extraId: string) {
    if (!confirm('¿Estás seguro de que deseas eliminar este recurso generado?')) {
      return;
    }

    try {
      const res = await fetch(`/api/plannings/${planning.id}/extras?extraId=${extraId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setExtras((prev) => prev.filter((ex) => ex.id !== extraId));
      } else {
        alert('Error al eliminar el recurso');
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Helper to find existing generated extra
  function findExtra(type: string, keyIndex: number | null, title?: string, sessionNum?: number) {
    return extras.find((ex) => {
      if (ex.type !== type) return false;
      if (ex.keyIndex !== keyIndex) return false;
      if (type === 'lesson_plan' && sessionNum !== undefined) {
        return ex.title.includes(`Sesión ${sessionNum} `) || ex.title.endsWith(`Sesión ${sessionNum}`);
      }
      if (type === 'material' && title) {
        return ex.title.toLowerCase().includes(title.toLowerCase());
      }
      return true;
    });
  }

  // List of estimated sessions for lesson plans
  const lessonSessions: {
    sessionNum: number;
    activityIndex: number;
    activityName: string;
    totalSessions: number;
  }[] = [];

  if (content?.sectionIV?.activities) {
    content.sectionIV.activities.forEach((act, actIdx) => {
      const hours = act.hours || 18;
      // Assume 1 session per hour of UAC
      for (let sNum = 1; sNum <= hours; sNum++) {
        lessonSessions.push({
          sessionNum: sNum,
          activityIndex: actIdx,
          activityName: act.name,
          totalSessions: hours,
        });
      }
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="page-header" style={{ borderBottom: '1px solid var(--c-border)', paddingBottom: '16px' }}>
        <Link href={`/${locale}/dashboard`} className="btn btn-ghost" style={{ marginBottom: '12px', display: 'inline-flex' }}>
          ← Mis planeaciones
        </Link>
        <h1 className="page-title" style={{ fontSize: '28px', color: 'var(--c-navy)' }}>{planning.uacName}</h1>
        <p className="page-subtitle" style={{ color: 'var(--c-text-muted)', fontSize: '15px' }}>
          {planning.semester}° Semestre · Componente {planning.component === 'laboral' ? 'Formación Laboral' : 'Fundamental/Ampliado'}
        </p>
        <div className="page-actions" style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
          {content && (
            <a href={`/api/docx/${planning.id}`} className="btn btn-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span>↓</span> Descargar Planeación Completa (DOCX)
            </a>
          )}
        </div>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--c-border)', gap: '16px', marginBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('planning')}
          className={`tab-btn ${activeTab === 'planning' ? 'active' : ''}`}
          style={{
            padding: '12px 16px',
            fontSize: '15px',
            fontWeight: 600,
            borderBottom: activeTab === 'planning' ? '3px solid var(--c-blue-mid)' : '3px solid transparent',
            color: activeTab === 'planning' ? 'var(--c-blue-mid)' : 'var(--c-text-muted)',
            background: 'none',
            cursor: 'pointer',
          }}
        >
          📄 Planeación Didáctica
        </button>
        <button
          onClick={() => setActiveTab('extras')}
          className={`tab-btn ${activeTab === 'extras' ? 'active' : ''}`}
          style={{
            padding: '12px 16px',
            fontSize: '15px',
            fontWeight: 600,
            borderBottom: activeTab === 'extras' ? '3px solid var(--c-blue-mid)' : '3px solid transparent',
            color: activeTab === 'extras' ? 'var(--c-blue-mid)' : 'var(--c-text-muted)',
            background: 'none',
            cursor: 'pointer',
          }}
        >
          ⚡ Rúbricas y Materiales Impresos
        </button>
        <button
          onClick={() => setActiveTab('lessonPlans')}
          className={`tab-btn ${activeTab === 'lessonPlans' ? 'active' : ''}`}
          style={{
            padding: '12px 16px',
            fontSize: '15px',
            fontWeight: 600,
            borderBottom: activeTab === 'lessonPlans' ? '3px solid var(--c-blue-mid)' : '3px solid transparent',
            color: activeTab === 'lessonPlans' ? 'var(--c-blue-mid)' : 'var(--c-text-muted)',
            background: 'none',
            cursor: 'pointer',
          }}
        >
          🕒 Planes de Clase ({lessonSessions.length} Sesiones)
        </button>
      </div>

      {/* TAB CONTENT: PLANNING GENERAL */}
      {activeTab === 'planning' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Section I */}
          <div className="section-card">
            <div className="section-card-header">
              <span className="section-card-title">I. Datos Generales y Administrativos</span>
            </div>
            <div className="section-card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div><strong>Docente:</strong> {s1?.teacherName}</div>
                <div><strong>UAC/Ubicación:</strong> {s1?.uacName}</div>
                <div><strong>Semestre:</strong> {s1?.semester}° Semestre</div>
                <div><strong>Grupos:</strong> {s1?.groups}</div>
                <div><strong>Carga horaria:</strong> {s1?.totalHours} hrs.</div>
                <div><strong>Subsistema:</strong> {s1?.subsystem}</div>
              </div>
            </div>
          </div>

          {/* Section II */}
          <div className="section-card">
            <div className="section-card-header">
              <span className="section-card-title">II. Propósito Formativo (Intencionalidad Curricular)</span>
            </div>
            <div className="section-card-body">
              <p style={{ marginBottom: '16px', lineHeight: 1.6 }}>{content?.sectionII?.purpose}</p>
              
              <p style={{ fontWeight: 600, marginBottom: '6px' }}>Resultados de Aprendizaje:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginBottom: '16px' }}>
                {content?.sectionII?.learningOutcomes?.map((out, idx) => (
                  <li key={idx} style={{ marginBottom: '4px', fontSize: '14px' }}>{out}</li>
                ))}
              </ul>

              <p><strong>Vinculación PAEC:</strong></p>
              <p style={{ color: 'var(--c-text-2)', fontStyle: 'italic', fontSize: '14px' }}>
                {content?.sectionII?.paecConnection}
              </p>
            </div>
          </div>

          {/* Activities Dosificación Table */}
          {content?.sectionII?.activities && (
            <div className="section-card">
              <div className="section-card-header">
                <span className="section-card-title">Dosificación de Actividades Clave y Tiempos</span>
              </div>
              <div className="section-card-body" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--c-navy)', color: '#fff' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>{activityLabel}</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>Corte de Evaluación</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>Horas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {content.sectionII.activities.map((a, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : 'var(--c-blue-pale)' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 500 }}>{a.name}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--c-navy-light)', fontWeight: 600 }}>
                          {a.corte || 'Corte ' + (i + 1)}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>{a.hours} hrs.</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section IV Summary */}
          <div className="section-card">
            <div className="section-card-header">
              <span className="section-card-title">IV. Diseño de Secuencia Didáctica (Actividades)</span>
            </div>
            <div className="section-card-body">
              {content?.sectionIV?.activities?.map((a, i) => (
                <div
                  key={i}
                  style={{
                    padding: '14px 18px',
                    background: i % 2 === 0 ? 'var(--c-blue-pale)' : 'var(--c-surface)',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    borderLeft: '4px solid var(--c-blue-mid)',
                  }}
                >
                  <strong>{prefix}{i + 1}:</strong> {a.name}{' '}
                  <span style={{ color: 'var(--c-text-muted)', fontSize: '13px' }}>({a.hours} hrs.)</span>
                  {' — '}
                  <em style={{ color: 'var(--c-navy-light)', fontWeight: 500 }}>{a.methodology}</em>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: EXTRAS & INSTRUMENTS */}
      {activeTab === 'extras' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Section V - Instruments generation */}
          <div className="section-card">
            <div className="section-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="section-card-title">A. Instrumentos de Evaluación Propuestos</span>
              <span className="text-xs" style={{ color: 'var(--c-navy-light)', fontWeight: 600 }}>Trinomio de Evaluación</span>
            </div>
            <div className="section-card-body">
              {content?.sectionV?.evaluationAgreement && (
                <div style={{ padding: '12px', background: '#F8FAFC', borderLeft: '3px solid var(--c-amber)', borderRadius: '6px', marginBottom: '16px', fontSize: '13.5px' }}>
                  <p style={{ fontWeight: 600, color: 'var(--c-navy)', marginBottom: '4px' }}>Acuerdo de Acreditación / Evaluación:</p>
                  <p style={{ color: '#475569', fontStyle: 'italic' }}>{content.sectionV.evaluationAgreement}</p>
                </div>
              )}

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--c-navy)', color: '#fff' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Corte / Momento</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Evidencia</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Instrumento Propuesto</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>%</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Herramientas Extra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {content?.sectionV?.evaluations?.map((ev, i) => {
                      const isDiagnostic = ev.type?.toLowerCase().includes('diagn') || ev.percentage === 0;
                      const instrumentType = ev.instrument?.toLowerCase().includes('rubri') ? 'rubric' : 'checklist';
                      
                      // Match extra
                      const generated = findExtra(instrumentType, i);
                      const loadingKey = `${instrumentType}-${i}--${ev.evidence}`;
                      const isCurrentGenerating = generatingKey === loadingKey;

                      return (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : 'var(--c-blue-pale)', borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ fontWeight: 600 }}>{ev.moment}</span>
                            <div style={{ fontSize: '11px', color: 'var(--c-text-muted)' }}>{ev.type} · {ev.agent}</div>
                          </td>
                          <td style={{ padding: '10px 12px', maxWidth: '220px' }}>{ev.evidence}</td>
                          <td style={{ padding: '10px 12px', fontWeight: 500 }}>{ev.instrument}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>{ev.percentage}%</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            {generated ? (
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <button
                                  onClick={() => setPreviewExtra(generated)}
                                  className="btn"
                                  style={{ padding: '4px 8px', fontSize: '11px', background: 'var(--c-blue-pale)', border: '1px solid var(--c-blue-mid)', color: 'var(--c-blue-mid)', borderRadius: '4px' }}
                                >
                                  👁️ Ver
                                </button>
                                <a
                                  href={`/api/docx/extra/${generated.id}`}
                                  className="btn btn-amber"
                                  style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', textDecoration: 'none' }}
                                >
                                  ↓ Word
                                </a>
                                <button
                                  onClick={() => handleDeleteExtra(generated.id)}
                                  className="btn"
                                  style={{ padding: '4px 8px', fontSize: '11px', background: '#FEE2E2', border: '1px solid #EF4444', color: '#EF4444', borderRadius: '4px' }}
                                >
                                  🗑️
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() =>
                                  handleGenerateExtra(
                                    instrumentType,
                                    `${ev.instrument}: ${ev.evidence.substring(0, 30)}...`,
                                    i,
                                    { evidence: ev.evidence, activityName: ev.moment }
                                  )
                                }
                                disabled={generatingKey !== null}
                                className="btn btn-navy"
                                style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '4px', background: 'var(--c-blue-mid)', color: '#fff', border: 'none', cursor: 'pointer' }}
                              >
                                {isCurrentGenerating ? '⏳ Generando...' : `⚡ Generar ${instrumentType === 'rubric' ? 'Rúbrica' : 'Lista'}`}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section VI - Classroom Materials */}
          <div className="section-card">
            <div className="section-card-header">
              <span className="section-card-title">B. Materiales Didácticos Impresos del Docente</span>
            </div>
            <div className="section-card-body">
              <p style={{ fontSize: '13px', color: 'var(--c-text-muted)', marginBottom: '14px' }}>
                Genera el contenido técnico real y completo de los materiales sugeridos en la Sección VI.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {content?.sectionVI?.teacherMaterials?.map((mat, idx) => {
                  const cleanMatName = mat.replace(/^[•\s\-\*]+/g, '').trim();
                  
                  // Match extra
                  const generated = findExtra('material', null, cleanMatName);
                  const loadingKey = `material--${cleanMatName}`;
                  const isCurrentGenerating = generatingKey === loadingKey;

                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ fontSize: '16px' }}>📄</span>
                        <span style={{ fontWeight: 500, fontSize: '14px', color: 'var(--c-navy)' }}>{cleanMatName}</span>
                      </div>
                      
                      <div>
                        {generated ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => setPreviewExtra(generated)}
                              className="btn"
                              style={{ padding: '6px 12px', fontSize: '12px', background: 'var(--c-blue-pale)', border: '1px solid var(--c-blue-mid)', color: 'var(--c-blue-mid)', borderRadius: '4px' }}
                            >
                              👁️ Ver en Pantalla
                            </button>
                            <a
                              href={`/api/docx/extra/${generated.id}`}
                              className="btn btn-amber"
                              style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '4px', textDecoration: 'none' }}
                            >
                              ↓ Descargar Word
                            </a>
                            <button
                              onClick={() => handleDeleteExtra(generated.id)}
                              className="btn"
                              style={{ padding: '6px 12px', fontSize: '12px', background: '#FEE2E2', border: '1px solid #EF4444', color: '#EF4444', borderRadius: '4px' }}
                            >
                              🗑️
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              handleGenerateExtra(
                                'material',
                                cleanMatName,
                                null,
                                {}
                              )
                            }
                            disabled={generatingKey !== null}
                            className="btn btn-navy"
                            style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                          >
                            {isCurrentGenerating ? '⏳ Redactando...' : '⚡ Generar Material Impreso'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: LESSON PLANS */}
      {activeTab === 'lessonPlans' && (
        <div className="section-card">
          <div className="section-card-header">
            <span className="section-card-title">Planes de Clase Desglosados por Sesión (50 min)</span>
          </div>
          <div className="section-card-body">
            <div style={{ padding: '12px', background: 'var(--c-blue-pale)', borderLeft: '3px solid var(--c-blue-mid)', borderRadius: '6px', marginBottom: '16px', fontSize: '13.5px' }}>
              <p style={{ color: 'var(--c-navy)', fontWeight: 600 }}>💡 Evaluación del Supervisor (USICAMM):</p>
              <p style={{ color: 'var(--c-text-muted)' }}>
                Genera el desglose del plan de clase de una sesión específica. Cada plan de clase cuenta con temporalidad exacta (Apertura 10m, Desarrollo 30m, Cierre 10m), exploración de saberes previos, metodología socio-crítica y metacognición formativa.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
              {lessonSessions.map((session, idx) => {
                const sLabel = `Plan de Clase: Sesión ${session.sessionNum} - ${session.activityName.substring(0, 40)}...`;
                
                // Match generated extra
                const generated = findExtra('lesson_plan', session.activityIndex, undefined, session.sessionNum);
                const loadingKey = `lesson_plan-${session.activityIndex}-${session.sessionNum}-`;
                const isCurrentGenerating = generatingKey?.startsWith(loadingKey);

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background: idx % 2 === 0 ? '#fff' : 'var(--c-blue-pale)',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                    }}
                  >
                    <div>
                      <span className="font-semibold" style={{ color: 'var(--c-navy-light)', marginRight: '10px' }}>
                        Sesión {session.sessionNum}
                      </span>
                      <span style={{ fontSize: '13px', color: '#475569' }}>
                        ({prefix}{session.activityIndex + 1}) {session.activityName.substring(0, 75)}...
                      </span>
                    </div>

                    <div>
                      {generated ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => setPreviewExtra(generated)}
                            className="btn"
                            style={{ padding: '4px 8px', fontSize: '11px', background: 'var(--c-blue-pale)', border: '1px solid var(--c-blue-mid)', color: 'var(--c-blue-mid)', borderRadius: '4px' }}
                          >
                            👁️ Ver
                          </button>
                          <a
                            href={`/api/docx/extra/${generated.id}`}
                            className="btn btn-amber"
                            style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', textDecoration: 'none' }}
                          >
                            ↓ Word
                          </a>
                          <button
                            onClick={() => handleDeleteExtra(generated.id)}
                            className="btn"
                            style={{ padding: '4px 8px', fontSize: '11px', background: '#FEE2E2', border: '1px solid #EF4444', color: '#EF4444', borderRadius: '4px' }}
                          >
                            🗑️
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            handleGenerateExtra(
                              'lesson_plan',
                              `Plan de Clase: Sesión ${session.sessionNum} - ${session.activityName.substring(0, 45)}`,
                              session.activityIndex,
                              {
                                sessionNum: session.sessionNum,
                                totalSessions: session.totalSessions,
                                activityName: session.activityName,
                              }
                            )
                          }
                          disabled={generatingKey !== null}
                          className="btn btn-navy"
                          style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                        >
                          {isCurrentGenerating ? '⏳ Creando plan...' : '⚡ Generar Plan de Clase'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Visor Modal Overlay */}
      {previewExtra && (
        <ExtraPreviewModal
          isOpen={previewExtra !== null}
          onClose={() => setPreviewExtra(null)}
          title={previewExtra.title}
          contentText={previewExtra.contentText}
          type={previewExtra.type}
        />
      )}
    </div>
  );
}
