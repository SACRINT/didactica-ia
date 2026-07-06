import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  VerticalAlign,
  PageBreak,
  HeadingLevel,
} from 'docx';

// ─── Color Palette ───────────────────────────────────────────────────────────
const C = {
  navy:   '1A3A5C',
  blue:   'DCE4F5',
  white:  'FFFFFF',
  alt:    'EBF3FA',
  gray:   'F5F5F5',
  accent: '2E6DA4',
  text:   '1A1A1A',
  muted:  '555555',
};

const PAGE_W = 12240;
const MARGIN = 720;
const CONTENT = PAGE_W - MARGIN * 2;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function bdr(color = 'AAAAAA') {
  const b = { style: BorderStyle.SINGLE, size: 4, color };
  return { top: b, bottom: b, left: b, right: b };
}

const CELLMRG = { top: 80, bottom: 80, left: 140, right: 140 };

function tc(
  text: string,
  opts: {
    w?: number;
    span?: number;
    bold?: boolean;
    fill?: string;
    color?: string;
    size?: number;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    valign?: (typeof VerticalAlign)[keyof typeof VerticalAlign];
    italics?: boolean;
  } = {}
): TableCell {
  const {
    w,
    span = 1,
    bold = false,
    fill = C.white,
    color = C.text,
    size = 18,
    align = AlignmentType.LEFT,
    valign = VerticalAlign.CENTER,
    italics = false,
  } = opts;

  return new TableCell({
    columnSpan: span,
    width: w ? { size: w, type: WidthType.DXA } : undefined,
    shading: { fill, type: ShadingType.CLEAR },
    borders: bdr(),
    margins: CELLMRG,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    verticalAlign: valign as any,
    children: [
      new Paragraph({
        alignment: align,
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text, bold, italics, size, color, font: 'Arial' })],
      }),
    ],
  });
}

function tcH(text: string, opts: Parameters<typeof tc>[1] = {}) {
  return tc(text, { bold: true, fill: C.navy, color: C.white, size: 18, ...opts });
}

function tcSub(text: string, opts: Parameters<typeof tc>[1] = {}) {
  return tc(text, { bold: true, fill: C.blue, color: C.navy, size: 18, ...opts });
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
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.navy, space: 1 } },
    children: [new TextRun({ text, bold: true, size: 28, color: C.navy, font: 'Arial' })],
  });
}

function subHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 100 },
    children: [new TextRun({ text, bold: true, size: 22, color: C.accent, font: 'Arial' })],
  });
}

function bodyPara(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text: text ?? '', size: 20, color: C.text, font: 'Arial' })],
  });
}

function gap(n = 1): Paragraph[] {
  return Array.from({ length: n }, () => new Paragraph({ children: [] }));
}

function safeStr(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val);
}

function parseJson<T = unknown>(val: unknown): T {
  if (!val) return {} as T;
  if (typeof val === 'object') return val as T;
  try { return JSON.parse(String(val)) as T; } catch { return {} as T; }
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PmcProject {
  id: string;
  school_name?: string;
  school_cct?: string;
  municipality?: string;
  locality?: string;
  school_zone?: string;
  director_name?: string;
  supervisor_name?: string;
  ciclo_escolar?: string;
  subsystem?: string;
  total_staff?: number;
  staff_data?: unknown;
  indicadores_academicos?: unknown;
  foda?: unknown;
  categorias_priorizadas?: unknown;
  diagnostico_comunidad?: string;
  normativa?: unknown;
  diagnostico_generado?: unknown;
  plan_accion?: unknown;
  current_step?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

interface MetaInstitucional {
  categoria?: string;
  nombre_categoria?: string;
  tema?: string;
  meta?: string;
  estrategia?: string;
  linea_base?: string;
  personal_designado?: string;
  entregable?: string;
  periodo_inicio?: string;
  periodo_fin?: string;
  diagnostico_meta?: string;
}

interface MetaPersonal {
  nombre?: string;
  cargo?: string;
  meta_individual?: string;
  estrategia?: string;
  entregable?: string;
  periodo?: string;
}

interface PlanAccion {
  metas_institucionales?: MetaInstitucional[];
  metas_personales?: MetaPersonal[];
}

interface DiagnosticoGenerado {
  presentacion?: string;
  contexto?: string;
  analisis_indicadores?: string;
  sintesis_foda?: string;
  priorizacion?: string;
}

interface IndicadoresAcademicos {
  aprobacion_ant?: number;
  reprobacion_ant?: number;
  abandono_ant?: number;
  et_ant?: number;
  aprobacion_meta?: number;
  abandono_meta?: number;
  et_meta?: number;
  matricula?: number;
}

interface FodaData {
  fortalezas?: string;
  oportunidades?: string;
  debilidades?: string;
  amenazas?: string;
}

interface NormativaDoc {
  titulo?: string;
  descripcion?: string;
  documentos?: Array<{
    orden?: number;
    titulo?: string;
    articulos?: string[];
  }>;
}

// ─── Cover Page ──────────────────────────────────────────────────────────────
function buildCoverPage(p: PmcProject): (Paragraph | Table)[] {
  const today = new Date().toLocaleDateString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const rows: (Paragraph | Table)[] = [
    new Paragraph({ spacing: { before: 0, after: 60 }, children: [] }),
    // Logo-like header block
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40 },
      children: [
        new TextRun({
          text: 'GOBIERNO DEL ESTADO DE PUEBLA',
          bold: true,
          size: 20,
          color: C.navy,
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40 },
      children: [
        new TextRun({
          text: 'SECRETARÍA DE EDUCACIÓN PÚBLICA DEL ESTADO',
          bold: true,
          size: 20,
          color: C.navy,
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 160 },
      children: [
        new TextRun({
          text: 'DIRECCIÓN DE BACHILLERATO Y EDUCACIÓN PARA ADULTOS (DBEPA)',
          bold: true,
          size: 20,
          color: C.navy,
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 80 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 24, color: C.navy },
        bottom: { style: BorderStyle.SINGLE, size: 24, color: C.navy },
      },
      children: [
        new TextRun({
          text: 'PLAN DE MEJORA CONTINUA',
          bold: true,
          size: 48,
          color: C.navy,
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 240 },
      children: [
        new TextRun({
          text: `Ciclo Escolar ${safeStr(p.ciclo_escolar) || '2025-2026'}`,
          bold: true,
          size: 32,
          color: C.accent,
          font: 'Arial',
        }),
      ],
    }),
    // Info table
    tbl(
      [
        new TableRow({ children: [tcH('DATOS DEL PLANTEL', { span: 2 })] }),
        new TableRow({ children: [tcSub('Nombre del Plantel'), tc(safeStr(p.school_name))] }),
        new TableRow({ children: [tcSub('CCT'), tc(safeStr(p.school_cct))] }),
        new TableRow({ children: [tcSub('Municipio'), tc(safeStr(p.municipality))] }),
        new TableRow({ children: [tcSub('Localidad'), tc(safeStr(p.locality))] }),
        new TableRow({ children: [tcSub('Zona Escolar'), tc(safeStr(p.school_zone))] }),
        new TableRow({ children: [tcSub('Subsistema'), tc(safeStr(p.subsystem) || 'BGE')] }),
        new TableRow({ children: [tcSub('Director(a)'), tc(safeStr(p.director_name))] }),
        new TableRow({ children: [tcSub('Supervisor(a)'), tc(safeStr(p.supervisor_name))] }),
        new TableRow({ children: [tcSub('Fecha de elaboración'), tc(today)] }),
      ],
      [CONTENT / 3, (CONTENT * 2) / 3]
    ),
    ...gap(2),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Puebla, Pue., ${today}`,
          size: 20,
          color: C.muted,
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  return rows;
}

// ─── Marco Normativo ─────────────────────────────────────────────────────────
function buildNormativa(normativa: NormativaDoc): (Paragraph | Table)[] {
  const items: (Paragraph | Table)[] = [
    secHeading('I. MARCO NORMATIVO'),
    bodyPara(safeStr(normativa.descripcion)),
    ...gap(),
  ];

  if (Array.isArray(normativa.documentos)) {
    for (const doc of normativa.documentos) {
      items.push(
        new Paragraph({
          spacing: { before: 120, after: 60 },
          children: [
            new TextRun({
              text: `${doc.orden ?? ''}. ${safeStr(doc.titulo)}`,
              bold: true,
              size: 20,
              color: C.navy,
              font: 'Arial',
            }),
          ],
        })
      );
      if (Array.isArray(doc.articulos)) {
        for (const art of doc.articulos) {
          items.push(
            new Paragraph({
              bullet: { level: 0 },
              spacing: { before: 40, after: 40 },
              children: [new TextRun({ text: safeStr(art), size: 18, font: 'Arial', color: C.text })],
            })
          );
        }
      }
    }
  }

  items.push(new Paragraph({ children: [new PageBreak()] }));
  return items;
}

// ─── Diagnóstico ─────────────────────────────────────────────────────────────
function buildDiagnostico(
  diag: DiagnosticoGenerado,
  indic: IndicadoresAcademicos,
  foda: FodaData,
  categorias: Array<{ id?: string; nombre?: string }>
): (Paragraph | Table)[] {
  const items: (Paragraph | Table)[] = [secHeading('II. DIAGNÓSTICO')];

  // Presentación
  if (diag.presentacion) {
    items.push(subHeading('2.1 Presentación'));
    items.push(bodyPara(diag.presentacion));
    items.push(...gap());
  }

  // Contexto
  if (diag.contexto) {
    items.push(subHeading('2.2 Contexto Socioeducativo'));
    items.push(bodyPara(diag.contexto));
    items.push(...gap());
  }

  // Indicadores table
  items.push(subHeading('2.3 Indicadores Académicos'));
  items.push(
    tbl(
      [
        new TableRow({
          children: [
            tcH('Indicador'),
            tcH('Ciclo Anterior', { align: AlignmentType.CENTER }),
            tcH('Meta Ciclo Actual', { align: AlignmentType.CENTER }),
          ],
        }),
        new TableRow({
          children: [
            tc('Índice de Aprobación'),
            tc(`${indic.aprobacion_ant ?? '—'}%`, { align: AlignmentType.CENTER }),
            tc(`${indic.aprobacion_meta ?? '—'}%`, { align: AlignmentType.CENTER }),
          ],
        }),
        new TableRow({
          children: [
            tc('Índice de Reprobación', { fill: C.alt }),
            tc(`${indic.reprobacion_ant ?? '—'}%`, { align: AlignmentType.CENTER, fill: C.alt }),
            tc('—', { align: AlignmentType.CENTER, fill: C.alt }),
          ],
        }),
        new TableRow({
          children: [
            tc('Abandono Escolar'),
            tc(`${indic.abandono_ant ?? '—'}%`, { align: AlignmentType.CENTER }),
            tc(`${indic.abandono_meta ?? '—'}%`, { align: AlignmentType.CENTER }),
          ],
        }),
        new TableRow({
          children: [
            tc('Eficiencia Terminal', { fill: C.alt }),
            tc(`${indic.et_ant ?? '—'}%`, { align: AlignmentType.CENTER, fill: C.alt }),
            tc(`${indic.et_meta ?? '—'}%`, { align: AlignmentType.CENTER, fill: C.alt }),
          ],
        }),
        new TableRow({
          children: [
            tc('Matrícula Total'),
            tc(`${indic.matricula ?? '—'} alumnos`, { align: AlignmentType.CENTER, span: 2 }),
          ],
        }),
      ],
      [CONTENT / 2, CONTENT / 4, CONTENT / 4]
    )
  );

  if (diag.analisis_indicadores) {
    items.push(...gap());
    items.push(bodyPara(diag.analisis_indicadores));
  }

  // FODA table
  items.push(...gap());
  items.push(subHeading('2.4 Síntesis FODA'));
  items.push(
    tbl(
      [
        new TableRow({
          children: [
            tcH('FORTALEZAS', { align: AlignmentType.CENTER }),
            tcH('OPORTUNIDADES', { align: AlignmentType.CENTER }),
          ],
        }),
        new TableRow({
          children: [
            tc(safeStr(foda.fortalezas), { fill: '#E8F5E9' }),
            tc(safeStr(foda.oportunidades), { fill: '#E3F2FD' }),
          ],
        }),
        new TableRow({
          children: [
            tcH('DEBILIDADES', { align: AlignmentType.CENTER, fill: '#B71C1C' }),
            tcH('AMENAZAS', { align: AlignmentType.CENTER, fill: '#E65100' }),
          ],
        }),
        new TableRow({
          children: [
            tc(safeStr(foda.debilidades), { fill: '#FFEBEE' }),
            tc(safeStr(foda.amenazas), { fill: '#FFF3E0' }),
          ],
        }),
      ],
      [CONTENT / 2, CONTENT / 2]
    )
  );

  if (diag.sintesis_foda) {
    items.push(...gap());
    items.push(bodyPara(diag.sintesis_foda));
  }

  // Priorización
  items.push(...gap());
  items.push(subHeading('2.5 Priorización de Categorías'));
  if (diag.priorizacion) {
    items.push(bodyPara(diag.priorizacion));
  }

  if (Array.isArray(categorias) && categorias.length > 0) {
    items.push(...gap());
    items.push(
      tbl(
        [
          new TableRow({ children: [tcH('N°', { w: 800 }), tcH('Categoría Priorizada')] }),
          ...categorias.map(
            (cat, i) =>
              new TableRow({
                children: [
                  tc(String(i + 1), { w: 800, align: AlignmentType.CENTER, fill: i % 2 ? C.alt : C.white }),
                  tc(`Categoría ${cat.id ?? i + 1}: ${safeStr(cat.nombre)}`, { fill: i % 2 ? C.alt : C.white }),
                ],
              })
          ),
        ],
        [800, CONTENT - 800]
      )
    );
  }

  items.push(new Paragraph({ children: [new PageBreak()] }));
  return items;
}

// ─── Plan de Acción ──────────────────────────────────────────────────────────
function buildPlanAccion(plan: PlanAccion): (Paragraph | Table)[] {
  const items: (Paragraph | Table)[] = [secHeading('III. PLAN DE ACCIÓN')];

  const metas = plan.metas_institucionales ?? [];

  if (metas.length === 0) {
    items.push(bodyPara('No se han generado metas institucionales.'));
  }

  for (let i = 0; i < metas.length; i++) {
    const m = metas[i];
    items.push(subHeading(`Meta Institucional ${i + 1} — Categoría ${m.categoria ?? '?'}: ${m.nombre_categoria ?? ''}`));
    items.push(
      tbl(
        [
          new TableRow({
            children: [
              tcH('Campo', { w: CONTENT / 3 }),
              tcH('Contenido', { w: (CONTENT * 2) / 3 }),
            ],
          }),
          new TableRow({
            children: [tcSub('Tema'), tc(safeStr(m.tema))],
          }),
          new TableRow({
            children: [tcSub('Meta SMART', { fill: C.alt }), tc(safeStr(m.meta), { fill: C.alt })],
          }),
          new TableRow({
            children: [tcSub('Estrategia'), tc(safeStr(m.estrategia))],
          }),
          new TableRow({
            children: [tcSub('Línea Base', { fill: C.alt }), tc(safeStr(m.linea_base), { fill: C.alt })],
          }),
          new TableRow({
            children: [tcSub('Personal Designado'), tc(safeStr(m.personal_designado))],
          }),
          new TableRow({
            children: [tcSub('Entregable', { fill: C.alt }), tc(safeStr(m.entregable), { fill: C.alt })],
          }),
          new TableRow({
            children: [
              tcSub('Período'),
              tc(`${safeStr(m.periodo_inicio)} — ${safeStr(m.periodo_fin)}`),
            ],
          }),
          new TableRow({
            children: [tcSub('Diagnóstico-Meta', { fill: C.alt }), tc(safeStr(m.diagnostico_meta), { fill: C.alt })],
          }),
        ],
        [CONTENT / 3, (CONTENT * 2) / 3]
      )
    );
    items.push(...gap());
  }

  items.push(new Paragraph({ children: [new PageBreak()] }));
  return items;
}

// ─── Metas Personales ────────────────────────────────────────────────────────
function buildMetasPersonales(plan: PlanAccion): (Paragraph | Table)[] {
  const items: (Paragraph | Table)[] = [secHeading('IV. METAS INDIVIDUALES DEL PERSONAL')];

  const personal = plan.metas_personales ?? [];

  if (personal.length === 0) {
    items.push(bodyPara('No se han generado metas individuales.'));
    items.push(new Paragraph({ children: [new PageBreak()] }));
    return items;
  }

  items.push(
    tbl(
      [
        new TableRow({
          children: [
            tcH('Nombre'),
            tcH('Cargo'),
            tcH('Meta Individual'),
            tcH('Entregable'),
            tcH('Período'),
          ],
        }),
        ...personal.map(
          (mp, i) =>
            new TableRow({
              children: [
                tc(safeStr(mp.nombre), { fill: i % 2 ? C.alt : C.white }),
                tc(safeStr(mp.cargo), { fill: i % 2 ? C.alt : C.white }),
                tc(safeStr(mp.meta_individual), { fill: i % 2 ? C.alt : C.white }),
                tc(safeStr(mp.entregable), { fill: i % 2 ? C.alt : C.white }),
                tc(safeStr(mp.periodo), { fill: i % 2 ? C.alt : C.white }),
              ],
            })
        ),
      ],
      [
        Math.floor(CONTENT * 0.18),
        Math.floor(CONTENT * 0.15),
        Math.floor(CONTENT * 0.29),
        Math.floor(CONTENT * 0.25),
        Math.floor(CONTENT * 0.13),
      ]
    )
  );

  items.push(new Paragraph({ children: [new PageBreak()] }));
  return items;
}

// ─── Control de Revisiones ───────────────────────────────────────────────────
function buildControlRevisiones(p: PmcProject): (Paragraph | Table)[] {
  return [
    secHeading('V. CONTROL DE REVISIONES Y APROBACIÓN'),
    bodyPara(
      'El presente Plan de Mejora Continua fue elaborado con la participación del personal directivo, docente y administrativo del plantel, y queda sujeto a revisión periódica conforme al calendario establecido.'
    ),
    ...gap(),
    tbl(
      [
        new TableRow({
          children: [
            tcH('Rol'),
            tcH('Nombre'),
            tcH('Firma'),
            tcH('Fecha'),
          ],
        }),
        new TableRow({
          children: [
            tcSub('Director(a)'),
            tc(safeStr(p.director_name)),
            tc(''),
            tc(''),
          ],
        }),
        new TableRow({
          children: [
            tcSub('Supervisor(a)', { fill: C.alt }),
            tc(safeStr(p.supervisor_name), { fill: C.alt }),
            tc('', { fill: C.alt }),
            tc('', { fill: C.alt }),
          ],
        }),
        new TableRow({
          children: [
            tcSub('Representante Sindical'),
            tc(''),
            tc(''),
            tc(''),
          ],
        }),
        new TableRow({
          children: [
            tcSub('Representante de Padres', { fill: C.alt }),
            tc('', { fill: C.alt }),
            tc('', { fill: C.alt }),
            tc('', { fill: C.alt }),
          ],
        }),
      ],
      [
        Math.floor(CONTENT * 0.25),
        Math.floor(CONTENT * 0.35),
        Math.floor(CONTENT * 0.2),
        Math.floor(CONTENT * 0.2),
      ]
    ),
    ...gap(2),
  ];
}

// ─── Main Generator ───────────────────────────────────────────────────────────
export async function generatePmcDocx(project: PmcProject): Promise<Buffer> {
  const normativa = parseJson<NormativaDoc>(project.normativa);
  const diag = parseJson<DiagnosticoGenerado>(project.diagnostico_generado);
  const indic = parseJson<IndicadoresAcademicos>(project.indicadores_academicos);
  const foda = parseJson<FodaData>(project.foda);
  const plan = parseJson<PlanAccion>(project.plan_accion);
  const categorias = parseJson<Array<{ id?: string; nombre?: string }>>(project.categorias_priorizadas);
  const categoriasArr = Array.isArray(categorias) ? categorias : [];

  const children: (Paragraph | Table)[] = [
    ...buildCoverPage(project),
    ...buildNormativa(normativa),
    ...buildDiagnostico(diag, indic, foda, categoriasArr),
    ...buildPlanAccion(plan),
    ...buildMetasPersonales(plan),
    ...buildControlRevisiones(project),
  ];

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 20, color: C.text },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: MARGIN,
              right: MARGIN,
              bottom: MARGIN,
              left: MARGIN,
            },
          },
        },
        children,
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

// ─── Informe Template Generator ───────────────────────────────────────────────
export async function generatePmcInformeDocx(
  project: PmcProject,
  tipo: 'parcial' | 'final'
): Promise<Buffer> {
  const plan = parseJson<PlanAccion>(project.plan_accion);
  const metas = plan.metas_institucionales ?? [];
  const personal = plan.metas_personales ?? [];

  const titulo =
    tipo === 'parcial'
      ? 'INFORME PARCIAL DE AVANCE PMC 2025-2026'
      : 'INFORME FINAL DE AVANCE PMC 2025-2026';

  const periodo =
    tipo === 'parcial' ? '1er Semestre (agosto 2025 – enero 2026)' : 'Ciclo completo (agosto 2025 – junio 2026)';

  const today = new Date().toLocaleDateString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const children: (Paragraph | Table)[] = [
    // Header
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40 },
      children: [
        new TextRun({
          text: 'GOBIERNO DEL ESTADO DE PUEBLA — DBEPA',
          bold: true,
          size: 20,
          color: C.navy,
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 80 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 12, color: C.navy },
        bottom: { style: BorderStyle.SINGLE, size: 12, color: C.navy },
      },
      children: [
        new TextRun({
          text: titulo,
          bold: true,
          size: 32,
          color: C.navy,
          font: 'Arial',
        }),
      ],
    }),
    ...gap(),
    // School info table
    tbl(
      [
        new TableRow({
          children: [tcH('DATOS DEL PLANTEL', { span: 2 })],
        }),
        new TableRow({
          children: [tcSub('Plantel'), tc(safeStr(project.school_name))],
        }),
        new TableRow({
          children: [tcSub('CCT'), tc(safeStr(project.school_cct))],
        }),
        new TableRow({
          children: [tcSub('Director(a)'), tc(safeStr(project.director_name))],
        }),
        new TableRow({
          children: [tcSub('Ciclo Escolar'), tc(safeStr(project.ciclo_escolar) || '2025-2026')],
        }),
        new TableRow({
          children: [tcSub('Período del Informe'), tc(periodo)],
        }),
        new TableRow({
          children: [tcSub('Fecha de elaboración'), tc(today)],
        }),
      ],
      [CONTENT / 3, (CONTENT * 2) / 3]
    ),
    ...gap(),
    // Instructions note
    new Paragraph({
      spacing: { before: 100, after: 100 },
      border: {
        left: { style: BorderStyle.SINGLE, size: 16, color: C.accent, space: 4 },
      },
      children: [
        new TextRun({
          text: 'Instrucciones: Complete este formato con información real. Las evidencias deben ser documentos analíticos verificables.',
          size: 18,
          italics: true,
          color: C.muted,
          font: 'Arial',
        }),
      ],
    }),
    ...gap(),
    // Metas institucionales
    secHeading('I. AVANCE DE METAS INSTITUCIONALES'),
  ];

  for (let i = 0; i < metas.length; i++) {
    const m = metas[i];
    children.push(
      subHeading(
        `Meta ${i + 1} — Categoría ${m.categoria ?? '?'}: ${m.nombre_categoria ?? ''}`
      )
    );
    children.push(
      tbl(
        [
          new TableRow({
            children: [tcH('Meta SMART', { w: CONTENT / 4 }), tc(safeStr(m.meta), { w: (CONTENT * 3) / 4 })],
          }),
          new TableRow({
            children: [
              tcSub('Avance logrado', { w: CONTENT / 4 }),
              tc('', { w: (CONTENT * 3) / 4 }),
            ],
          }),
          new TableRow({
            children: [
              tcSub('Evidencia documental', { fill: C.alt, w: CONTENT / 4 }),
              tc('', { fill: C.alt, w: (CONTENT * 3) / 4 }),
            ],
          }),
          new TableRow({
            children: [
              tcSub('Observaciones', { w: CONTENT / 4 }),
              tc('', { w: (CONTENT * 3) / 4 }),
            ],
          }),
        ],
        [CONTENT / 4, (CONTENT * 3) / 4]
      )
    );
    children.push(...gap());
  }

  // Metas personales
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(secHeading('II. AVANCE DE METAS INDIVIDUALES DEL PERSONAL'));

  if (personal.length > 0) {
    children.push(
      tbl(
        [
          new TableRow({
            children: [
              tcH('Nombre'),
              tcH('Cargo'),
              tcH('Meta Individual'),
              tcH('Avance'),
              tcH('Evidencia'),
            ],
          }),
          ...personal.map(
            (mp, i) =>
              new TableRow({
                children: [
                  tc(safeStr(mp.nombre), { fill: i % 2 ? C.alt : C.white }),
                  tc(safeStr(mp.cargo), { fill: i % 2 ? C.alt : C.white }),
                  tc(safeStr(mp.meta_individual), { fill: i % 2 ? C.alt : C.white }),
                  tc('', { fill: i % 2 ? C.alt : C.white }),
                  tc('', { fill: i % 2 ? C.alt : C.white }),
                ],
              })
          ),
        ],
        [
          Math.floor(CONTENT * 0.18),
          Math.floor(CONTENT * 0.15),
          Math.floor(CONTENT * 0.27),
          Math.floor(CONTENT * 0.2),
          Math.floor(CONTENT * 0.2),
        ]
      )
    );
  } else {
    children.push(bodyPara('No hay metas individuales registradas.'));
  }

  // Signature section
  children.push(...gap(2));
  children.push(secHeading('III. FIRMAS DE VALIDACIÓN'));
  children.push(
    tbl(
      [
        new TableRow({
          children: [tcH('Rol'), tcH('Nombre'), tcH('Firma'), tcH('Fecha')],
        }),
        new TableRow({
          children: [tcSub('Director(a)'), tc(safeStr(project.director_name)), tc(''), tc('')],
        }),
        new TableRow({
          children: [
            tcSub('Supervisor(a)', { fill: C.alt }),
            tc(safeStr(project.supervisor_name), { fill: C.alt }),
            tc('', { fill: C.alt }),
            tc('', { fill: C.alt }),
          ],
        }),
        new TableRow({
          children: [tcSub('Autoridad Escolar'), tc(''), tc(''), tc('')],
        }),
      ],
      [
        Math.floor(CONTENT * 0.25),
        Math.floor(CONTENT * 0.35),
        Math.floor(CONTENT * 0.2),
        Math.floor(CONTENT * 0.2),
      ]
    )
  );

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 20, color: C.text },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: MARGIN,
              right: MARGIN,
              bottom: MARGIN,
              left: MARGIN,
            },
          },
        },
        children,
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
