import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
  PageBreak, Header, Footer, PageNumber, HeadingLevel,
} from 'docx';
import type { PaecProject } from '@/types/paec';

// DBEPA Institutional Color Palette
const C = {
  dark:   '1A3A5C',  // Dark Navy
  mid:    '2E6DA4',  // Blue
  light:  'D6E4F0',  // Light Blue
  alt:    'EBF3FA',  // Alternate row light blue
  accent: 'E8A020',  // Amber
  white:  'FFFFFF',
  gray:   'F0F4F8',
  text:   '1A1A1A',
  textMuted: '555555',
};

const PAGE_W = 12240;
const MARGIN = 720;
const CONTENT = PAGE_W - MARGIN * 2;

function bdr(color = 'AAAAAA') {
  const b = { style: BorderStyle.SINGLE, size: 4, color };
  return { top: b, bottom: b, left: b, right: b };
}

const CELLMRG = { top: 80, bottom: 80, left: 140, right: 140 };

function tc(
  text: string,
  opts: {
    w?: number; span?: number; bold?: boolean; fill?: string;
    color?: string; size?: number; align?: typeof AlignmentType[keyof typeof AlignmentType];
    valign?: typeof VerticalAlign[keyof typeof VerticalAlign]; italics?: boolean;
  } = {}
): TableCell {
  const { w, span = 1, bold = false, fill = C.white, color = C.text,
    size = 18, align = AlignmentType.LEFT, valign = VerticalAlign.CENTER,
    italics = false } = opts;

  return new TableCell({
    columnSpan: span,
    width: w ? { size: w, type: WidthType.DXA } : undefined,
    shading: { fill, type: ShadingType.CLEAR },
    borders: bdr(),
    margins: CELLMRG,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    verticalAlign: valign as any,
    children: [new Paragraph({
      alignment: align,
      spacing: { before: 50, after: 50 },
      children: [new TextRun({ text, bold, italics, size, color, font: 'Arial' })],
    })],
  });
}

function tcH(text: string, opts = {}) {
  return tc(text, { bold: true, fill: C.dark, color: C.white, size: 18, ...opts });
}

function tbl(rows: TableRow[], widths: number[]): Table {
  return new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: widths,
    rows,
  });
}

function secHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 300, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: C.accent, space: 1 } },
    children: [new TextRun({ text, bold: true, size: 26, color: C.dark, font: 'Arial' })],
  });
}

function subH(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, size: 22, color: C.mid, font: 'Arial' })],
  });
}

function sp(): Paragraph {
  return new Paragraph({ spacing: { before: 80, after: 80 }, children: [new TextRun('')] });
}

function parseMarkdownToParagraphs(text: string): Paragraph[] {
  if (!text) return [];
  const lines = text.split('\n');
  const paragraphs: Paragraph[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if it's a bullet point
    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      const bulletText = trimmed.replace(/^[-*]\s*/, '');
      paragraphs.push(new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun({ text: bulletText, size: 20, font: 'Arial' })],
        spacing: { before: 60, after: 60 },
      }));
    } else if (trimmed.startsWith('#')) {
      // Heading
      const hText = trimmed.replace(/^#+\s*/, '');
      const level = trimmed.match(/^#+/)?.[0].length || 1;
      const size = level === 1 ? 24 : level === 2 ? 20 : 18;
      const color = level === 1 ? C.dark : C.mid;
      paragraphs.push(new Paragraph({
        spacing: { before: 180, after: 80 },
        children: [new TextRun({ text: hText, bold: true, size, color, font: 'Arial' })],
      }));
    } else {
      // Normal paragraph
      paragraphs.push(new Paragraph({
        spacing: { before: 80, after: 80 },
        children: [new TextRun({ text: trimmed, size: 20, font: 'Arial' })],
      }));
    }
  }
  return paragraphs;
}

export async function generatePaecDocx(p: PaecProject, teacherName: string): Promise<Buffer> {
  const sections: any[] = [];

  // --- 1. TITLE PAGE / HEADER ---
  sections.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 200 },
      children: [
        new TextRun({
          text: 'DOCUMENTO OFICIAL DEL PROYECTO ESCOLAR COMUNITARIO (PEC)',
          bold: true,
          size: 28,
          color: C.dark,
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 300 },
      children: [
        new TextRun({
          text: 'Programa Aula, Escuela y Comunidad (PAEC) — Ciclo Escolar 2026-2027',
          bold: true,
          size: 20,
          color: C.accent,
          font: 'Arial',
        }),
      ],
    }),
    sp()
  );

  // --- 2. SECTION I: DATOS GENERALES ---
  sections.push(secHeading('I. DATOS GENERALES Y ADMINISTRATIVOS'));
  
  const cycleLabel = p.cycleType === 'A' ? 'Semestre A (Grupos de 3° y 5° Semestre)' : 
                     p.cycleType === 'B' ? 'Semestre B (Grupos de 4° y 6° Semestre)' :
                     'Ciclo Completo Anual (3° a 6° Semestre)';

  const genRows = [
    new TableRow({
      children: [
        tcH('Proyecto Escolar Comunitario:', { w: 3000 }),
        tc(p.projectName, { bold: true, w: 7800, span: 3 }),
      ],
    }),
    new TableRow({
      children: [
        tcH('Problemática Abordada:', { w: 3000 }),
        tc(p.problemStatement, { w: 7800, span: 3 }),
      ],
    }),
    new TableRow({
      children: [
        tcH('Docente Coordinador:', { w: 3000 }),
        tc(teacherName, { w: 3000 }),
        tcH('Ciclo Semestral / Relevo:', { w: 2400 }),
        tc(cycleLabel, { w: 2400 }),
      ],
    }),
    new TableRow({
      children: [
        tcH('Plantel Escolar:', { w: 3000 }),
        tc((p.schoolContext as any).facilities || 'BGE', { w: 3000 }),
        tcH('Ubicación / Comunidad:', { w: 2400 }),
        tc((p.communityContext as any).location || 'Puebla', { w: 2400 }),
      ],
    }),
  ];
  sections.push(tbl(genRows, [3000, 3000, 2400, 2400]));
  sections.push(sp());

  // --- 3. SECTION II: DIAGNÓSTICO COLECTIVO ---
  if (p.fase1Diagnostico) {
    sections.push(secHeading('II. FASE I: DIAGNÓSTICO COLECTIVO'));
    
    // Tabla 1: Comunidad
    sections.push(subH('Características de la comunidad (Contexto Externo)'));
    const t1Rows = [
      new TableRow({ children: [tcH('Aspecto de la Localidad', { w: 3000 }), tcH('Descripción y Diagnóstico', { w: 7800 })] }),
      ...p.fase1Diagnostico.tabla1.map((r, i) => new TableRow({
        children: [
          tc(r.col1, { bold: true, w: 3000, fill: i % 2 === 0 ? C.gray : C.white }),
          tc(r.col2, { w: 7800, fill: i % 2 === 0 ? C.gray : C.white })
        ]
      }))
    ];
    sections.push(tbl(t1Rows, [3000, 7800]));
    sections.push(sp());

    // Tabla 2: Educación
    sections.push(subH('Características de la educación e institución (Contexto Interno)'));
    const t2Rows = [
      new TableRow({ children: [tcH('Aspecto Escolar/Educativo', { w: 3000 }), tcH('Descripción e Indicadores', { w: 7800 })] }),
      ...p.fase1Diagnostico.tabla2.map((r, i) => new TableRow({
        children: [
          tc(r.col1, { bold: true, w: 3000, fill: i % 2 === 0 ? C.gray : C.white }),
          tc(r.col2, { w: 7800, fill: i % 2 === 0 ? C.gray : C.white })
        ]
      }))
    ];
    sections.push(tbl(t2Rows, [3000, 7800]));
    sections.push(sp());

    // Tabla 3: FODA
    sections.push(subH('Análisis FODA y Estrategia Maestra del PEC'));
    const t3Rows = [
      new TableRow({ children: [tcH('Aspecto FODA', { w: 3000 }), tcH('Análisis Estratégico', { w: 7800 })] }),
      ...p.fase1Diagnostico.tabla3.map((r, i) => new TableRow({
        children: [
          tc(r.aspect, { bold: true, w: 3000, fill: i % 2 === 0 ? C.gray : C.white }),
          tc(r.analysis, { w: 7800, fill: i % 2 === 0 ? C.gray : C.white })
        ]
      }))
    ];
    sections.push(tbl(t3Rows, [3000, 7800]));
    sections.push(sp());

    // Tabla 4: Justificación del Problema
    sections.push(subH('Justificación Metodológica de la problematica seleccionada'));
    const t4Rows = [
      new TableRow({ children: [tcH('Etapa del Proceso', { w: 3000 }), tcH('Descripción Metodológica', { w: 7800 })] }),
      ...p.fase1Diagnostico.tabla4.map((r, i) => new TableRow({
        children: [
          tc(r.col1, { bold: true, w: 3000, fill: i % 2 === 0 ? C.gray : C.white }),
          tc(r.col2, { w: 7800, fill: i % 2 === 0 ? C.gray : C.white })
        ]
      }))
    ];
    sections.push(tbl(t4Rows, [3000, 7800]));
    sections.push(new PageBreak());
  }

  // --- 4. SECTION III: JUSTIFICACIÓN, PILARES Y PROPÓSITOS ---
  if (p.fase2Justificacion) {
    sections.push(secHeading('III. FASE II: DISEÑO DEL PROYECTO (JUSTIFICACIÓN Y PROPÓSITO)'));
    
    sections.push(subH('Introducción y Sustento Académico'));
    sections.push(...parseMarkdownToParagraphs(p.fase2Justificacion.introduction));
    sections.push(sp());

    sections.push(subH('Pilares Estratégicos de Viabilidad'));
    p.fase2Justificacion.pilares.forEach((pilar) => {
      const match = pilar.match(/^([^:]+):(.*)$/);
      if (match) {
        sections.push(new Paragraph({
          bullet: { level: 0 },
          children: [
            new TextRun({ text: match[1] + ':', bold: true, size: 20, font: 'Arial', color: C.dark }),
            new TextRun({ text: match[2], size: 20, font: 'Arial' }),
          ],
          spacing: { before: 60, after: 60 },
        }));
      } else {
        sections.push(new Paragraph({
          bullet: { level: 0 },
          children: [new TextRun({ text: pilar, size: 20, font: 'Arial' })],
          spacing: { before: 60, after: 60 },
        }));
      }
    });
    sections.push(sp());

    sections.push(subH('Propósitos Integrales del Proyecto'));
    const propRows = [
      new TableRow({ children: [tcH('Propósito', { w: 3000 }), tcH('Detalle Operativo', { w: 7800 })] }),
      new TableRow({ children: [tc('Educativo', { bold: true, w: 3000 }), tc(p.fase2Justificacion.proposito.educativo, { w: 7800 })] }),
      new TableRow({ children: [tc('Social/Ambiental', { bold: true, w: 3000, fill: C.gray }), tc(p.fase2Justificacion.proposito.social, { w: 7800, fill: C.gray })] }),
      new TableRow({ children: [tc('Funcional', { bold: true, w: 3000 }), tc(p.fase2Justificacion.proposito.funcional, { w: 7800 })] }),
    ];
    sections.push(tbl(propRows, [3000, 7800]));
    sections.push(sp());

    sections.push(subH('Alcance, Metas y Recursos Requeridos'));
    sections.push(new Paragraph({ children: [new TextRun({ text: 'Metas Cuantitativas del Proyecto:', bold: true, size: 20, font: 'Arial', color: C.dark })] }));
    p.fase2Justificacion.alcance.metas.forEach((meta) => {
      sections.push(new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun({ text: meta, size: 20, font: 'Arial' })],
        spacing: { before: 40, after: 40 },
      }));
    });
    sections.push(sp());

    sections.push(new Paragraph({ children: [new TextRun({ text: 'Participantes Clave:', bold: true, size: 20, font: 'Arial', color: C.dark })] }));
    p.fase2Justificacion.alcance.participantes.forEach((p) => {
      sections.push(new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun({ text: p, size: 20, font: 'Arial' })],
        spacing: { before: 40, after: 40 },
      }));
    });
    sections.push(sp());

    sections.push(new Paragraph({ children: [new TextRun({ text: 'Recursos Requeridos:', bold: true, size: 20, font: 'Arial', color: C.dark })] }));
    p.fase2Justificacion.alcance.recursos.forEach((r) => {
      sections.push(new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun({ text: r, size: 20, font: 'Arial' })],
        spacing: { before: 40, after: 40 },
      }));
    });

    sections.push(new PageBreak());
  }

  // --- 5. SECTION IV: MAPEO CURRICULAR TRANSVERSAL ---
  if (p.fase2Mapeo) {
    sections.push(secHeading('IV. VINCUACIÓN MULTIDISCIPLINARIA (MAPEO DE UACs)'));
    sections.push(
      new Paragraph({
        spacing: { before: 100, after: 200 },
        children: [
          new TextRun({
            text: 'La siguiente matriz detalla de forma exhaustiva cómo cada Unidad de Aprendizaje Curricular (UAC) activa dentro de los semestres del bloque actual se asocia directamente a la resolución de la problemática común y al desarrollo del PEC.',
            size: 20,
            font: 'Arial',
          }),
        ],
      })
    );

    const mapRows = [
      new TableRow({
        children: [
          tcH('Semestre', { w: 1200, align: AlignmentType.CENTER }),
          tcH('Unidad de Aprendizaje Curricular (UAC)', { w: 2800 }),
          tcH('Tema / Actividad Específica', { w: 3000 }),
          tcH('Vinculación y Progresión Curricular con el PEC', { w: 3800 }),
        ],
      }),
      ...p.fase2Mapeo.map((r, i) => new TableRow({
        children: [
          tc(`${r.semester}°`, { w: 1200, align: AlignmentType.CENTER, bold: true, fill: i % 2 === 0 ? C.gray : C.white }),
          tc(r.uacName, { w: 2800, bold: true, fill: i % 2 === 0 ? C.gray : C.white }),
          tc(r.topic, { w: 3000, fill: i % 2 === 0 ? C.gray : C.white }),
          tc(r.linking, { w: 3800, fill: i % 2 === 0 ? C.gray : C.white }),
        ],
      })),
    ];
    sections.push(tbl(mapRows, [1200, 2800, 3000, 3800]));
    sections.push(new PageBreak());
  }

  // --- 6. SECTION V: CRONOGRAMA MACRO ---
  if (p.fase2Cronograma) {
    sections.push(secHeading('V. DISEÑO GENERAL (CRONOGRAMA MACRO POR FASES)'));
    
    const cronRows = [
      new TableRow({
        children: [
          tcH('Fase Bimestral', { w: 2200 }),
          tcH('Objetivo de la Etapa', { w: 2800 }),
          tcH('Macro-Actividades del Proyecto', { w: 3800 }),
          tcH('Semestre Involucrado (Relevo)', { w: 2000, align: AlignmentType.CENTER }),
        ],
      }),
      ...p.fase2Cronograma.map((r, i) => new TableRow({
        children: [
          tc(r.phase, { w: 2200, bold: true, fill: i % 2 === 0 ? C.gray : C.white }),
          tc(r.objective, { w: 2800, fill: i % 2 === 0 ? C.gray : C.white }),
          tc(r.macroActivities, { w: 3800, fill: i % 2 === 0 ? C.gray : C.white }),
          tc(r.semesterInvolved, { w: 2000, align: AlignmentType.CENTER, bold: true, fill: i % 2 === 0 ? C.gray : C.white }),
        ],
      })),
    ];
    sections.push(tbl(cronRows, [2200, 2800, 3800, 2000]));
    sections.push(new PageBreak());
  }

  // --- 7. SECTION VI: PLAN OPERATIVO DETALLADO ---
  if (p.fase2PlanOperativo) {
    sections.push(secHeading('VI. PLAN OPERATIVO DETALLADO DE TRABAJO'));

    const renderPlanTable = (rows: any[], title: string) => {
      sections.push(subH(title));
      const planTableRows = [
        new TableRow({
          children: [
            tcH('Fase', { w: 1400 }),
            tcH('Actividad Semanal', { w: 2600 }),
            tcH('UAC Involucrada', { w: 1800 }),
            tcH('Progresión', { w: 1200, align: AlignmentType.CENTER }),
            tcH('Estrategia Activa', { w: 1600 }),
            tcH('Semana', { w: 1000, align: AlignmentType.CENTER }),
            tcH('Responsables', { w: 1200 }),
          ],
        }),
        ...rows.map((r, i) => new TableRow({
          children: [
            tc(r.phase, { w: 1400, fill: i % 2 === 0 ? C.gray : C.white }),
            tc(r.activity, { w: 2600, fill: i % 2 === 0 ? C.gray : C.white }),
            tc(r.uac, { w: 1800, bold: true, fill: i % 2 === 0 ? C.gray : C.white }),
            tc(r.progression, { w: 1200, align: AlignmentType.CENTER, fill: i % 2 === 0 ? C.gray : C.white }),
            tc(r.strategy, { w: 1600, fill: i % 2 === 0 ? C.gray : C.white }),
            tc(r.week, { w: 1000, align: AlignmentType.CENTER, bold: true, fill: i % 2 === 0 ? C.gray : C.white }),
            tc(r.responsibles, { w: 1200, fill: i % 2 === 0 ? C.gray : C.white }),
          ],
        })),
      ];
      sections.push(tbl(planTableRows, [1400, 2600, 1800, 1200, 1600, 1000, 1200]));
      sections.push(sp());
    };

    if (p.fase2PlanOperativo.semestreA && p.fase2PlanOperativo.semestreA.length > 0) {
      renderPlanTable(p.fase2PlanOperativo.semestreA, 'Plan Operativo: Semestre A (3° y 5° Semestre - Bloque de Relevo A)');
    }
    if (p.fase2PlanOperativo.semestreB && p.fase2PlanOperativo.semestreB.length > 0) {
      renderPlanTable(p.fase2PlanOperativo.semestreB, 'Plan Operativo: Semestre B (4° y 6° Semestre - Bloque de Relevo B)');
    }

    sections.push(new PageBreak());
  }

  // --- 8. SECTION VII: ANEXOS TÉCNICOS ---
  if (p.fase2Anexos) {
    sections.push(secHeading('VII. ANEXOS DINÁMICOS DE CONTROL Y SEGUIMIENTO'));

    sections.push(subH('Minuta de Reunión de Seguimiento Escolar 2.0'));
    sections.push(...parseMarkdownToParagraphs(p.fase2Anexos.anexo1));
    sections.push(sp());

    sections.push(subH('Cuadro de Seguimiento Operativo de Actividades y Métricas'));
    sections.push(...parseMarkdownToParagraphs(p.fase2Anexos.anexo2));
    sections.push(sp());

    sections.push(subH('Reporte Mensual de Avances de la Coordinación'));
    sections.push(...parseMarkdownToParagraphs(p.fase2Anexos.anexo3));
    sections.push(sp());

    sections.push(subH('Cuestionario de Hábitos y Percepciones de la Comunidad (Impacto Social)'));
    sections.push(...parseMarkdownToParagraphs(p.fase2Anexos.anexo4));
    sections.push(sp());

    sections.push(subH('Cuestionario de Autoevaluación de Habilidades y Competencias para Estudiantes'));
    sections.push(...parseMarkdownToParagraphs(p.fase2Anexos.anexo5));
    sections.push(sp());

    sections.push(subH('Estructura del Informe Final y Socialización de Resultados'));
    sections.push(...parseMarkdownToParagraphs(p.fase2Anexos.anexo6));
  }

  // Combine into single Document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: MARGIN,
              bottom: MARGIN,
              left: MARGIN,
              right: MARGIN,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `Proyecto Escolar Comunitario: ${p.projectName} — DBEPA Puebla`,
                    size: 14,
                    color: C.textMuted,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Página ',
                    size: 16,
                    color: C.textMuted,
                    font: 'Arial',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: C.textMuted,
                    font: 'Arial',
                  }),
                  new TextRun({
                    text: ' de ',
                    size: 16,
                    color: C.textMuted,
                    font: 'Arial',
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: C.textMuted,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        },
        children: sections,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
