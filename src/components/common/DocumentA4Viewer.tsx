'use client';

import React, { useState } from 'react';
import type { Planning, GeneratedPlanningContent } from '@/types/planning';
import { generatePlanningPDF } from '@/lib/pdf-generator';

interface DocumentA4ViewerProps {
  planning: Planning;
  onDownloadDocx?: () => void;
}

export default function DocumentA4Viewer({
  planning,
  onDownloadDocx,
}: DocumentA4ViewerProps) {
  const [zoom, setZoom] = useState<number>(100);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);

  const content = planning.contentJson as GeneratedPlanningContent | null;
  const s1 = content?.sectionI;
  const s2 = content?.sectionII;
  const s3 = content?.sectionIII;
  const s4 = content?.sectionIV;
  const s5 = content?.sectionV;

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const pdf = await generatePlanningPDF(planning);
      const filename = `Planeacion_${planning.uacName.replace(/\s+/g, '_')}_Semestre_${planning.semester}.pdf`;
      pdf.save(filename);
    } catch (e) {
      console.error('Error generating PDF:', e);
      alert('Hubo un error al generar el archivo PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <style>{`
        .a4-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #1e293b;
          color: #f8fafc;
          padding: 10px 16px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          flex-wrap: wrap;
          gap: 12px;
        }
        .a4-page {
          width: 794px;
          min-height: 1123px;
          background: #ffffff;
          color: #1e293b;
          margin: 0 auto 24px auto;
          padding: 36px 44px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.08);
          border-radius: 2px;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
          position: relative;
        }
        .a4-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
          font-size: 11px;
        }
        .a4-table th {
          background: #1f3864;
          color: #ffffff;
          font-weight: 700;
          text-align: left;
          padding: 6px 8px;
          border: 1px solid #1f3864;
          font-size: 11px;
        }
        .a4-table td {
          border: 1px solid #cbd5e1;
          padding: 5px 8px;
          vertical-align: top;
          font-size: 10.5px;
          line-height: 1.4;
        }
        .a4-table .label-cell {
          background: #f1f5f9;
          font-weight: 600;
          color: #334155;
          width: 25%;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          .a4-printable-area, .a4-printable-area * {
            visibility: visible;
          }
          .a4-printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }
          .a4-toolbar {
            display: none !important;
          }
          .a4-page {
            box-shadow: none !important;
            margin: 0 !important;
            page-break-after: always;
          }
        }
      `}</style>

      {/* Toolbar */}
      <div className="a4-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>Visor Editorial A4:</span>
          <span style={{ fontSize: '12px', background: '#3b82f6', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
            {planning.uacName} ({planning.semester}° Semestre)
          </span>
        </div>

        {/* Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => setZoom(Math.max(50, zoom - 10))}
            style={{ background: '#334155', color: '#fff', border: 'none', borderRadius: '4px', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 'bold' }}
            title="Reducir zoom"
          >
            -
          </button>
          <span style={{ fontSize: '12px', minWidth: '45px', textAlign: 'center', fontWeight: 600 }}>{zoom}%</span>
          <button
            onClick={() => setZoom(Math.min(150, zoom + 10))}
            style={{ background: '#334155', color: '#fff', border: 'none', borderRadius: '4px', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 'bold' }}
            title="Aumentar zoom"
          >
            +
          </button>
          <button
            onClick={() => setZoom(100)}
            style={{ background: '#334155', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', marginLeft: '4px' }}
          >
            100%
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={handlePrint}
            style={{ background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            🖨️ Imprimir
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            {downloadingPdf ? '⏳ Generando PDF...' : '↓ Descargar PDF'}
          </button>
          {onDownloadDocx && (
            <button
              onClick={onDownloadDocx}
              style={{ background: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              ↓ Descargar DOCX
            </button>
          )}
        </div>
      </div>

      {/* Printable / Viewable Container with Zoom */}
      <div
        style={{
          background: '#e2e8f0',
          padding: '24px',
          borderRadius: '10px',
          overflowX: 'auto',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          className="a4-printable-area"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease',
          }}
        >
          {/* HOJA 1: Membrete Oficial con 3 Logos + Datos Generales */}
          <div className="a4-page">
            {/* Header Oficial con 3 Logos */}
            <div style={{ borderBottom: '3px solid #E8A020', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <img
                  src="/images/logo-gobierno-puebla.png"
                  alt="Gobierno de Puebla"
                  style={{ height: '46px', maxWidth: '140px', objectFit: 'contain' }}
                />
                <img
                  src="/images/logo-sep-puebla.png"
                  alt="Secretaría de Educación Pública"
                  style={{ height: '36px', maxWidth: '140px', objectFit: 'contain' }}
                />
                <img
                  src="/images/logo-supervision-004.png"
                  alt="Supervisión Escolar 004"
                  style={{ height: '42px', maxWidth: '120px', objectFit: 'contain' }}
                />
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#1f3864', letterSpacing: '0.02em' }}>
                  SECRETARÍA DE EDUCACIÓN
                </div>
                <div style={{ fontSize: '10px', fontWeight: 600, color: '#1e293b', marginTop: '1px' }}>
                  SUBSECRETARÍA DE EDUCACIÓN OBLIGATORIA
                </div>
                <div style={{ fontSize: '9.5px', color: '#475569', marginTop: '1px' }}>
                  DIRECCIÓN GENERAL DE EDUCACIÓN BÁSICA SEGUNDO NIVEL
                </div>
                <div style={{ fontSize: '9.5px', color: '#475569', marginTop: '1px' }}>
                  DIRECCIÓN DE BACHILLERATOS ESTATALES Y PREPARATORIA ABIERTA
                </div>
                <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#1f3864', marginTop: '3px' }}>
                  SUPERVISIÓN DE BACHILLERATOS 004
                </div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#2e74b5', marginTop: '1px' }}>
                  CCT: {s1?.cct || s1?.schoolName || '21EBH0000X'}
                </div>

                <div style={{ fontSize: '12px', fontWeight: 800, color: '#1f3864', marginTop: '4px' }}>
                  INSTRUMENTO DE PLANEACIÓN DIDÁCTICA OFICIAL (MCCEMS NEM)
                </div>
              </div>
            </div>


            {/* SECCIÓN I */}
            <table className="a4-table">
              <thead>
                <tr>
                  <th colSpan={4}>I. DATOS DE IDENTIFICACIÓN INSTITUCIONAL Y CURRICULAR</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="label-cell">Plantel / Escuela:</td>
                  <td>{s1?.schoolName || 'Bachillerato General Oficial'}</td>
                  <td className="label-cell">Clave C.C.T.:</td>
                  <td>{s1?.cct || '21EBH0000X'}</td>
                </tr>
                <tr>
                  <td className="label-cell">Docente Titular:</td>
                  <td>{s1?.teacherName || 'Docente Responsable'}</td>
                  <td className="label-cell">Semestre / Grupo:</td>
                  <td>{planning.semester}° Semestre · {s1?.groups || 'Grupos Únicos'}</td>
                </tr>
                <tr>
                  <td className="label-cell">Unidad de Aprendizaje:</td>
                  <td style={{ fontWeight: 'bold', color: '#1f3864' }}>{planning.uacName}</td>
                  <td className="label-cell">Componente:</td>
                  <td>{planning.component === 'laboral' ? 'Formación Laboral' : 'Fundamental / Ampliado'}</td>
                </tr>
                <tr>
                  <td className="label-cell">Horas Semanales / Totales:</td>
                  <td>{s1?.totalHoursWeekly || 4} hrs/sem · {s1?.totalHours || 64} hrs/semestre</td>
                  <td className="label-cell">Periodo:</td>
                  <td>{s1?.applicationPeriod || s1?.period || 'Semestre 2026-2027'}</td>
                </tr>
              </tbody>
            </table>

            {/* SECCIÓN II */}
            <table className="a4-table">
              <thead>
                <tr>
                  <th colSpan={2}>II. PROPÓSITO FORMATIVO Y METAS DE APRENDIZAJE</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="label-cell" style={{ width: '30%' }}>Propósito General:</td>
                  <td>{s2?.purpose || 'Desarrollo de competencias socioformativas y pensamiento reflexivo.'}</td>
                </tr>
                <tr>
                  <td className="label-cell">Metas de Aprendizaje:</td>
                  <td>{s2?.learningOutcomes?.join('; ') || 'Logro de aprendizajes de trayectoria e integración comunitaria.'}</td>
                </tr>
                <tr>
                  <td className="label-cell">Contexto y Problemática:</td>
                  <td>{s2?.paecConnection || planning.paecContext || 'Contextualización a las necesidades de la comunidad.'}</td>
                </tr>
              </tbody>
            </table>

            {/* SECCIÓN III */}
            <table className="a4-table">
              <thead>
                <tr>
                  <th colSpan={2}>III. TRANSVERSALIDAD Y VINCULACIÓN COMUNITARIA (PAEC)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="label-cell" style={{ width: '30%' }}>Proyecto PAEC:</td>
                  <td>{s2?.paecConnection || planning.paecContext || 'Articulación con el Proyecto Comunitario del Plantel.'}</td>
                </tr>
                <tr>
                  <td className="label-cell">Ejes Transversales:</td>
                  <td>
                    {s3?.fundamentalCurriculum?.length
                      ? s3.fundamentalCurriculum.map((t) => `${t.area}: ${t.description}`).join(' | ')
                      : 'Cultura Digital, Lengua y Comunicación, Conciencia Histórica, Pensamiento Matemático.'}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* SECCIÓN IV: Primeras Actividades */}
            <table className="a4-table">
              <thead>
                <tr>
                  <th colSpan={4}>IV. SECUENCIA DIDÁCTICA POR MOMENTOS PEDAGÓGICOS (EXTRACTO)</th>
                </tr>
              </thead>
              <tbody>
                {(s4?.activities || []).slice(0, 2).map((act, idx) => (
                  <React.Fragment key={idx}>
                    <tr style={{ background: '#2e74b5', color: '#fff' }}>
                      <td colSpan={4} style={{ fontWeight: 'bold', color: '#fff', padding: '6px 8px', border: '1px solid #2e74b5' }}>
                        Bloque {idx + 1}: {act.name} ({act.hours || 18} Horas)
                      </td>
                    </tr>
                    <tr>
                      <td className="label-cell">Apertura:</td>
                      <td colSpan={3}>{act.apertura?.activities || 'Exploración y motivación inicial.'}</td>
                    </tr>
                    <tr>
                      <td className="label-cell">Desarrollo:</td>
                      <td colSpan={3}>{act.ejecucion?.activities || 'Construcción activa del conocimiento.'}</td>
                    </tr>
                    <tr>
                      <td className="label-cell">Cierre:</td>
                      <td colSpan={3}>{act.conclusion?.activities || 'Metacognición y consolidación.'}</td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            {/* SECCIÓN V & Firmas */}
            <table className="a4-table" style={{ marginTop: '12px' }}>
              <thead>
                <tr>
                  <th colSpan={3} style={{ textAlign: 'center' }}>VALIDACIÓN Y AUTORIZACIÓN OFICIAL</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ height: '70px', verticalAlign: 'bottom' }}>
                  <td style={{ textAlign: 'center', width: '33.3%', paddingBottom: '8px' }}>
                    <div style={{ borderTop: '1px solid #000', margin: '30px 10px 4px 10px' }} />
                    <div style={{ fontWeight: 'bold', fontSize: '10px' }}>DOCENTE TITULAR</div>
                    <div style={{ fontSize: '9px', color: '#64748b' }}>{s1?.teacherName || 'Nombre y Firma'}</div>
                  </td>
                  <td style={{ textAlign: 'center', width: '33.3%', paddingBottom: '8px' }}>
                    <div style={{ borderTop: '1px solid #000', margin: '30px 10px 4px 10px' }} />
                    <div style={{ fontWeight: 'bold', fontSize: '10px' }}>DIRECTOR DEL PLANTEL</div>
                    <div style={{ fontSize: '9px', color: '#64748b' }}>Firma y Sello</div>
                  </td>
                  <td style={{ textAlign: 'center', width: '33.3%', paddingBottom: '8px' }}>
                    <div style={{ borderTop: '1px solid #000', margin: '30px 10px 4px 10px' }} />
                    <div style={{ fontWeight: 'bold', fontSize: '10px' }}>SUPERVISIÓN DE ZONA</div>
                    <div style={{ fontSize: '9px', color: '#64748b' }}>Vo. Bo. Oficial</div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Footer page */}
            <div style={{ position: 'absolute', bottom: '20px', left: '48px', right: '48px', textAlign: 'center', fontSize: '9px', color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
              SIGPDA-EMS · Sistema Integral de Gestión Pedagógica y Didáctica · Generación 2025-2028 NEM
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
