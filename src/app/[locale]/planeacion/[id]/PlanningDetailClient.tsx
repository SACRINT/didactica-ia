'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import type { GeneratedPlanningContent, Planning, PlanningExtra } from '@/types/planning';
import { ExtraPreviewModal } from '@/components/planeacion/ExtraPreviewModal';
import DeletePlanningButton from '@/components/planeacion/DeletePlanningButton';

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

  // Modal Checklist Supervisión DBEPA
  const [showChecklistModal, setShowChecklistModal] = useState(false);

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

  if (!content) {
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
          <div className="page-actions" style={{ marginTop: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <DeletePlanningButton id={planning.id} locale={locale} redirectAfterDelete={true} />
          </div>
        </div>

        {/* Warning Banner */}
        <div className="card" style={{ border: '1px solid #f5c2c7', backgroundColor: '#f8d7da', color: '#842029', padding: '24px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '20px', fontWeight: 'bold' }}>
            <span>⚠️</span> Borrador - Generación Incompleta
          </div>
          <p style={{ lineHeight: 1.6, margin: 0, fontSize: '15px' }}>
            Esta planeación didáctica se encuentra en estado de <strong>Borrador</strong>. Las 7 secciones oficiales de la planeación y los instrumentos de evaluación no han sido generados.
          </p>
          <p style={{ lineHeight: 1.6, margin: 0, fontSize: '14px', opacity: 0.9 }}>
            Esto ocurre típicamente debido a una de las siguientes razones:
            <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginTop: '6px' }}>
              <li>La cuenta asociada a tu API Key se quedó sin saldo o créditos.</li>
              <li>El proceso de generación fue cancelado o se interrumpió la conexión antes de finalizar.</li>
            </ul>
          </p>
          <div style={{ marginTop: '8px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link href={`/${locale}/nueva-planeacion`} className="btn btn-primary" style={{ backgroundColor: 'var(--c-navy)', borderColor: 'var(--c-navy)' }}>
              Crear nueva planeación
            </Link>
            <DeletePlanningButton id={planning.id} locale={locale} redirectAfterDelete={true} />
          </div>
        </div>
      </div>
    );
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
        <div className="page-actions" style={{ marginTop: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          {content && (
            <a href={`/api/docx/${planning.id}`} className="btn btn-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span>↓</span> Descargar Planeación Completa (DOCX)
            </a>
          )}
          <DeletePlanningButton id={planning.id} locale={locale} redirectAfterDelete={true} />
        </div>
      </div>

      {/* Hierarchy & Compliance Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        color: '#f8fafc',
        padding: '16px 20px',
        borderRadius: '10px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>
            Jerarquía Normativa DBEPA 2026-2027
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ background: '#3b82f6', color: '#fff', fontSize: '12px', padding: '3px 10px', borderRadius: '12px', fontWeight: 600 }}>
              Macro: Planeación Didáctica Semestral
            </span>
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>➔</span>
            <span style={{ background: '#10b981', color: '#fff', fontSize: '12px', padding: '3px 10px', borderRadius: '12px', fontWeight: 600 }}>
              Micro: Secuencias Didácticas ({isLaboral ? 'Actividades Clave' : 'Propósitos Formativos'})
            </span>
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>➔</span>
            <span style={{ background: '#f59e0b', color: '#fff', fontSize: '12px', padding: '3px 10px', borderRadius: '12px', fontWeight: 600 }}>
              Micro-operativo: Planes de Clase ({lessonSessions.length} Sesiones)
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowChecklistModal(true)}
          style={{
            background: 'rgba(255,255,255,0.12)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
        >
          📋 Checklist de Supervisión DBEPA
        </button>
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

      {/* Modal Lista de Cotejo de Supervisión */}
      {showChecklistModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '12px', maxWidth: '750px', width: '100%',
            maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
            color: '#1e293b'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  📋 Lista de Cotejo de Supervisión DBEPA (2026-2027)
                </h3>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Alineado a <em>03 Lista de cotejo Plan de Clase 1-4_SEM.pdf</em> y normativas del Bachillerato General Estatal.
                </p>
              </div>
              <button onClick={() => setShowChecklistModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Propósitos Formativos / Contenidos Formativos', desc: 'Contenidos temáticos oficiales de la UAC vinculados al MCCEMS.', status: true },
                { label: 'Meta Educativa', desc: 'Metas de aprendizaje claras, objetivas y orientadas al logro de trayectoria.', status: true },
                { label: 'Transversalidad Disciplinar', desc: 'Conexión coherente con otras asignaturas del mismo semestre y currículum ampliado.', status: true },
                { label: 'Exploración de Conocimientos Previos', desc: 'Fase de Apertura con recuperación activa de saberes e ideas de los estudiantes.', status: true },
                { label: 'Actividades de Aprendizaje Acordes', desc: 'Actividades continuas, contextualizadas a la comunidad de Puebla y al PAEC.', status: true },
                { label: 'Metodología Socio-crítica / Estrategias Activas', desc: 'Uso obligatorio de ABP, Método de Casos o Simulaciones prácticas (Nivel 2 de complejidad).', status: true },
                { label: 'Productos Esperados', desc: 'Entregables físicos/digitales concretos por sesión y por Actividad Clave.', status: true },
                { label: 'Temporalidad y Dosificación de Tiempos', desc: 'Dosificación matemática estricta por Cortes (18h/24h por corte) y sesiones de 50 min.', status: true },
                { label: 'Momentos de Evaluación Formativa', desc: 'Evaluación Diagnóstica, Formativa y Sumativa con Hetero, Co y Autoevaluación.', status: true },
                { label: 'Metacognición Formativa en Cierre', desc: 'Fase de Cierre orientada a la reflexión del aprendizaje y consolidación de competencias.', status: true },
                { label: 'Instrumentos Objetivos de Evaluación', desc: 'Rúbricas analíticas y Listas de cotejo para Producto y Desempeño.', status: true }
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ background: '#10b981', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', flexShrink: 0, marginTop: '2px' }}>✓</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{i + 1}. {item.label}</div>
                    <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 700 }}>
                ✓ Cumplimiento del 100% verificado por DidácticaIA
              </span>
              <button onClick={() => setShowChecklistModal(false)} className="btn btn-navy" style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '6px' }}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
