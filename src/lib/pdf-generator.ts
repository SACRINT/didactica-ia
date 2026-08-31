/**
 * pdf-generator.ts — Generador PDF de Planeación Didáctica Oficial (SEP - DBEPA)
 * SIGPDA-EMS · Generación 2025-2028 NEM
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { GeneratedPlanningContent, Planning } from '@/types/planning';

const NAVY: [number, number, number] = [31, 56, 100];     // #1F3864
const BLUE_MID: [number, number, number] = [46, 116, 181]; // #2E74B5
const GRAY_BG: [number, number, number] = [242, 244, 248]; // #F2F4F8
const TEXT_DARK: [number, number, number] = [30, 41, 59];  // #1E293B

export function generatePlanningPDF(planning: Planning): jsPDF {
  const content = planning.contentJson as GeneratedPlanningContent | null;
  const s1 = content?.sectionI;
  const s2 = content?.sectionII;
  const s3 = content?.sectionIII;
  const s4 = content?.sectionIV;
  const s5 = content?.sectionV;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter', // 215.9 x 279.4 mm
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  let currentY = margin;

  // ─── Header Oficial SEP ───────────────────────────────────────────────────
  const drawOfficialHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text('SECRETARÍA DE EDUCACIÓN PÚBLICA DEL ESTADO DE PUEBLA', pageWidth / 2, currentY, { align: 'center' });
    currentY += 4.5;

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text('SUBSECRETARÍA DE EDUCACIÓN MEDIA SUPERIOR · DIRECCIÓN DE BACHILLERATOS ESTATALES', pageWidth / 2, currentY, { align: 'center' });
    currentY += 4.5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...BLUE_MID);
    doc.text('INSTRUMENTO DE PLANEACIÓN DIDÁCTICA OFICIAL', pageWidth / 2, currentY, { align: 'center' });
    currentY += 4.5;

    doc.setFontSize(9);
    doc.setTextColor(...TEXT_DARK);
    doc.text(`MARCO CURRICULAR COMÚN DE LA EDUCACIÓN MEDIA SUPERIOR (NEM) · CICLO ESCOLAR ${s1?.schoolYear || '2026-2027'}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 4;

    // Line separator
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.8);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 4;
  };

  drawOfficialHeader();

  // ─── Sección I: Datos Generales ──────────────────────────────────────────
  autoTable(doc, {
    startY: currentY,
    head: [[{ content: 'I. DATOS DE IDENTIFICACIÓN INSTITUCIONAL Y CURRICULAR', colSpan: 4, styles: { fillColor: NAVY, fontStyle: 'bold', halign: 'left', textColor: [255, 255, 255] } }]],
    body: [
      [
        { content: 'Plantel / Escuela:', styles: { fontStyle: 'bold', fillColor: GRAY_BG, cellWidth: 35 } },
        { content: s1?.schoolName || 'Bachillerato General Oficial', styles: { cellWidth: 55 } },
        { content: 'Clave C.C.T.:', styles: { fontStyle: 'bold', fillColor: GRAY_BG, cellWidth: 25 } },
        { content: s1?.cct || '21EBH0000X', styles: { cellWidth: 65 } },
      ],
      [
        { content: 'Docente Titular:', styles: { fontStyle: 'bold', fillColor: GRAY_BG } },
        { content: s1?.teacherName || 'Docente Responsable' },
        { content: 'Semestre / Grupo:', styles: { fontStyle: 'bold', fillColor: GRAY_BG } },
        { content: `${planning.semester}° Semestre · ${s1?.groups || 'Grupos Únicos'}` },
      ],
      [
        { content: 'Unidad de Aprendizaje (UAC):', styles: { fontStyle: 'bold', fillColor: GRAY_BG } },
        { content: planning.uacName, styles: { fontStyle: 'bold', textColor: NAVY } },
        { content: 'Componente:', styles: { fontStyle: 'bold', fillColor: GRAY_BG } },
        { content: planning.component === 'laboral' ? 'Formación Laboral' : 'Fundamental / Ampliado' },
      ],
      [
        { content: 'Horas Semanales / Totales:', styles: { fontStyle: 'bold', fillColor: GRAY_BG } },
        { content: `${s1?.totalHoursWeekly || 4} hrs/sem · ${s1?.totalHours || 64} hrs/semestre` },
        { content: 'Periodo de Aplicación:', styles: { fontStyle: 'bold', fillColor: GRAY_BG } },
        { content: s1?.applicationPeriod || s1?.period || 'Semestre 2026-2027' },
      ],
    ],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2, textColor: TEXT_DARK },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // ─── Sección II: Propósito y Metas Formativas ─────────────────────────────
  autoTable(doc, {
    startY: currentY,
    head: [[{ content: 'II. PROPÓSITO FORMATIVO Y METAS DE APRENDIZAJE', colSpan: 2, styles: { fillColor: NAVY, fontStyle: 'bold', textColor: [255, 255, 255] } }]],
    body: [
      [
        { content: 'Propósito General de la Asignatura:', styles: { fontStyle: 'bold', fillColor: GRAY_BG, cellWidth: 45 } },
        { content: s2?.purpose || 'Desarrollar competencias integrales mediante metodologías activas y pensamiento crítico.' },
      ],
      [
        { content: 'Metas de Aprendizaje:', styles: { fontStyle: 'bold', fillColor: GRAY_BG } },
        { content: s2?.learningOutcomes?.join('; ') || 'Alcanzar los aprendizajes de trayectoria establecidos en el MCCEMS.' },
      ],
      [
        { content: 'Problemática Central / Contexto:', styles: { fontStyle: 'bold', fillColor: GRAY_BG } },
        { content: s2?.paecConnection || planning.paecContext || 'Contextualización a las necesidades socioformativas de la comunidad.' },
      ],
    ],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2, textColor: TEXT_DARK },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // ─── Sección III: Transversalidad y PAEC ──────────────────────────────────
  const transItems = [
    ...(s3?.fundamentalCurriculum || []).map((t) => `${t.area}: ${t.description}`),
    ...(s3?.expandedCurriculum || []).map((t) => `${t.area}: ${t.description}`),
  ];

  autoTable(doc, {
    startY: currentY,
    head: [[{ content: 'III. TRANSVERSALIDAD Y VINCULACIÓN COMUNITARIA (PAEC)', colSpan: 2, styles: { fillColor: NAVY, fontStyle: 'bold', textColor: [255, 255, 255] } }]],
    body: [
      [
        { content: 'Proyecto Comunitario (PAEC):', styles: { fontStyle: 'bold', fillColor: GRAY_BG, cellWidth: 45 } },
        { content: s2?.paecConnection || planning.paecContext || 'Articulación con el Programa de Trabajo Comunitario del Plantel.' },
      ],
      [
        { content: 'Transversalidad Interdisciplinar:', styles: { fontStyle: 'bold', fillColor: GRAY_BG } },
        { content: transItems.length > 0 ? transItems.join('\n') : 'Cultura Digital, Lengua y Comunicación, Conciencia Histórica, Pensamiento Matemático.' },
      ],
    ],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2, textColor: TEXT_DARK },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // ─── Sección IV: Secuencia Didáctica por Momentos ─────────────────────────
  const activities = s4?.activities || [];
  const activityRows: any[] = [];

  activities.forEach((act, idx) => {
    activityRows.push([
      {
        content: `Bloque / Actividad ${idx + 1}: ${act.name} (${act.hours || 18} Horas) — Metodología: ${act.methodology || 'ABP'}`,
        colSpan: 4,
        styles: { fillColor: BLUE_MID, textColor: [255, 255, 255], fontStyle: 'bold' },
      },
    ]);

    // Apertura
    activityRows.push([
      { content: 'Apertura (Exploración):', styles: { fontStyle: 'bold', fillColor: GRAY_BG, cellWidth: 40 } },
      { content: `${act.apertura?.activities || 'Recuperación de conocimientos previos.'}\nMateriales: ${act.apertura?.materials || 'Cuaderno, pizarrón.'}`, colSpan: 3 },
    ]);

    // Desarrollo
    activityRows.push([
      { content: 'Desarrollo (Construcción):', styles: { fontStyle: 'bold', fillColor: GRAY_BG } },
      { content: `${act.ejecucion?.activities || 'Investigación, análisis y aplicación.'}\nMateriales: ${act.ejecucion?.materials || 'Guías, dispositivos.'}`, colSpan: 3 },
    ]);

    // Cierre
    activityRows.push([
      { content: 'Cierre (Metacognición):', styles: { fontStyle: 'bold', fillColor: GRAY_BG } },
      { content: `${act.conclusion?.activities || 'Socialización de evidencias y síntesis.'}\nMateriales: ${act.conclusion?.materials || 'Instrumentos de evaluación.'}`, colSpan: 3 },
    ]);
  });

  if (activityRows.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [[{ content: 'IV. SECUENCIA DIDÁCTICA DETALLADA POR MOMENTOS FORMATIVOS', colSpan: 4, styles: { fillColor: NAVY, fontStyle: 'bold', textColor: [255, 255, 255] } }]],
      body: activityRows,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2, textColor: TEXT_DARK },
      margin: { left: margin, right: margin },
      pageBreak: 'auto',
    });

    currentY = (doc as any).lastAutoTable.finalY + 4;
  }

  // ─── Sección V: Evaluación y Ponderaciones ────────────────────────────────
  const evalRows = (s5?.evaluations || []).map((ev) => [
    { content: ev.moment || 'Formativa' },
    { content: ev.type || 'Heteroevaluación' },
    { content: ev.evidence || 'Producto de aprendizaje' },
    { content: ev.instrument || 'Rúbrica analítica' },
    { content: `${ev.percentage || 20}%` },
  ]);

  if (evalRows.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [
        [{ content: 'V. CRITERIOS E INSTRUMENTOS DE EVALUACIÓN FORMATIVA', colSpan: 5, styles: { fillColor: NAVY, fontStyle: 'bold', textColor: [255, 255, 255] } }],
        ['Momento', 'Tipo / Agente', 'Evidencia / Producto', 'Instrumento', 'Pond.'].map((h) => ({ content: h, styles: { fillColor: BLUE_MID, textColor: [255, 255, 255], fontStyle: 'bold' } })),
      ],
      body: evalRows,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2, textColor: TEXT_DARK },
      margin: { left: margin, right: margin },
      pageBreak: 'avoid',
    });

    currentY = (doc as any).lastAutoTable.finalY + 4;
  }

  // ─── Firmas Oficiales ────────────────────────────────────────────────────
  autoTable(doc, {
    startY: currentY,
    head: [[{ content: 'VALIDACIÓN Y AUTORIZACIÓN OFICIAL', colSpan: 3, styles: { fillColor: NAVY, fontStyle: 'bold', halign: 'center', textColor: [255, 255, 255] } }]],
    body: [
      [
        { content: '\n\n\n___________________________________\nDOCENTE TITULAR\n' + (s1?.teacherName || 'Nombre y Firma'), styles: { halign: 'center', cellWidth: 60 } },
        { content: '\n\n\n___________________________________\nDIRECTOR DEL PLANTEL\nNombre, Firma y Sello', styles: { halign: 'center', cellWidth: 60 } },
        { content: '\n\n\n___________________________________\nSUPERVISIÓN DE ZONA ESCOLAR\nVo. Bo.', styles: { halign: 'center', cellWidth: 60 } },
      ],
    ],
    theme: 'plain',
    styles: { fontSize: 7.5, cellPadding: 2, textColor: TEXT_DARK },
    margin: { left: margin, right: margin },
    pageBreak: 'avoid',
  });

  // ─── Pie de Página en Todas las Hojas ─────────────────────────────────────
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `SIGPDA-EMS · ${planning.uacName} (${planning.semester}° Semestre) — Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  return doc;
}
