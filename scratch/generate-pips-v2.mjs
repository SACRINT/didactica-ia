/**
 * Generador PIPS v2 — Zona Escolar 004, BGE Puebla
 * Usa ÚNICAMENTE los patrones del PMC que funcionan correctamente.
 * Sin: Header, Footer, PageNumberElement, bullet:{level}, styles block, shading en Párrafos.
 * Ejecutar: node scratch/generate-pips-v2.mjs
 */

import {
  Document, Packer, Paragraph, TextRun,
  Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageBreak, HeadingLevel,
  convertMillimetersToTwip,
} from 'docx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, 'PIPS_Zona004_v2.docx');

// ─── PALETA ──────────────────────────────────────────────────────────────────
const NAVY  = '1F3864';
const BLUE  = '2E74B5';
const LBLUE = 'D6E4F0';
const GRAY  = 'F2F2F2';
const WHITE = 'FFFFFF';
const TEXT  = '1A1A1A';

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const pt = (n) => n * 2;
const mm = (n) => convertMillimetersToTwip(n);

const CELL_MARGINS = { top: 80, bottom: 80, left: 140, right: 140 };

function bdr(color = 'AAAAAA') {
  const b = { style: BorderStyle.SINGLE, size: 4, color };
  return { top: b, bottom: b, left: b, right: b };
}

// ─── TextRun helpers ─────────────────────────────────────────────────────────
function runBold(text, size = 11, color = TEXT) {
  return new TextRun({ text: String(text ?? ''), bold: true, size: pt(size), color, font: 'Arial' });
}
function runNorm(text, size = 11, color = TEXT) {
  return new TextRun({ text: String(text ?? ''), size: pt(size), color, font: 'Arial' });
}
function runItal(text, size = 11, color = TEXT) {
  return new TextRun({ text: String(text ?? ''), italics: true, size: pt(size), color, font: 'Arial' });
}

// ─── Paragraph helpers ───────────────────────────────────────────────────────
/** Título de sección (H1) — sin HeadingLevel para evitar w:shd en w:pPr */
function h1(text) {
  return new Paragraph({
    spacing: { before: 400, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: NAVY, space: 1 } },
    children: [runBold(text, 14, NAVY)],
  });
}

/** Subtítulo (H2) — sin HeadingLevel para evitar w:shd en w:pPr */
function h2(text) {
  return new Paragraph({
    spacing: { before: 240, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BLUE, space: 1 } },
    children: [runBold(text, 12, NAVY)],
  });
}

/** Sub-subtítulo (H3) */
function h3(text) {
  return new Paragraph({
    spacing: { before: 160, after: 60 },
    children: [runBold(text, 11, BLUE)],
  });
}

/** Párrafo de cuerpo */
function p(text, align = AlignmentType.JUSTIFIED) {
  return new Paragraph({
    alignment: align,
    spacing: { before: 60, after: 60 },
    children: [runNorm(text, 11)],
  });
}

/**
 * "Bullet" sin numeración automática — usa prefijo "•"
 * Esto evita el uso de numbering.xml que puede corromper el docx
 */
function bullet(text) {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    indent: { left: 360, hanging: 200 },
    children: [runNorm('•  ' + text, 11)],
  });
}

/** Salto de página */
function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

/** Párrafo vacío para espacio */
function gap() {
  return new Paragraph({ spacing: { before: 120 } });
}

// ─── TableCell helper ────────────────────────────────────────────────────────
function tc(text, opts = {}) {
  const {
    w, span = 1, bold = false,
    fill = WHITE, color = TEXT,
    size = 10, align = AlignmentType.CENTER,
    valign = VerticalAlign.CENTER,
  } = opts;

  // Maneja saltos de línea dentro de la celda
  const lines = String(text ?? '').split('\n');
  const runs = [];
  lines.forEach((line, idx) => {
    runs.push(bold
      ? new TextRun({ text: line, bold: true, size: pt(size), color, font: 'Arial' })
      : new TextRun({ text: line, size: pt(size), color, font: 'Arial' })
    );
    if (idx < lines.length - 1) runs.push(new TextRun({ break: 1 }));
  });

  // Construimos la celda SIN la propiedad shading (causa w:shd en w:pPr que corrompe Word)
  const cellOpts = {
    columnSpan: span,
    width: w ? { size: w, type: WidthType.DXA } : undefined,
    borders: bdr(),
    margins: CELL_MARGINS,
    verticalAlign: valign,
    children: [
      new Paragraph({
        alignment: align,
        spacing: { before: 40, after: 40 },
        children: runs,
      }),
    ],
  };
  // Solo añadimos shading cuando el fondo es explícitamente no-blanco
  // Usamos ShadingType.SOLID con color auto — formato compatible con Word
  if (fill !== WHITE) {
    cellOpts.shading = { fill, type: ShadingType.SOLID, color: 'auto' };
  }
  return new TableCell(cellOpts);
}

function tcH(text, opts = {}) {
  return tc(text, { bold: true, fill: NAVY, color: WHITE, size: 10, ...opts });
}
function tcS(text, opts = {}) {
  return tc(text, { bold: true, fill: LBLUE, color: NAVY, size: 10, ...opts });
}

// ─── Tabla helper ────────────────────────────────────────────────────────────
function table(rows, colWidths) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: colWidths,
    rows,
  });
}

function simpleTable(headers, rows, colWidths) {
  const hRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => tcH(h, colWidths ? { w: colWidths[i] } : {})),
  });
  const dRows = rows.map((row, ri) =>
    new TableRow({
      children: row.map((c, i) =>
        tc(c, {
          fill: ri % 2 === 0 ? WHITE : GRAY,
          align: AlignmentType.LEFT,
          ...(colWidths ? { w: colWidths[i] } : {}),
        })
      ),
    })
  );
  return table([hRow, ...dRows], colWidths ?? []);
}

// ─── DATOS ───────────────────────────────────────────────────────────────────
const planteles = [
  { no:  1, cct: '21EBH0088T', nombre: 'Alfonso de la Madrid Vidaurreta',  localidad: 'Venustiano Carranza', municipio: 'Venustiano Carranza', h: 105, m: 118, t: 223 },
  { no:  2, cct: '21EBH0186U', nombre: 'Aquiles Serdán',                   localidad: 'Pantepec',            municipio: 'Pantepec',            h: 70,  m: 82,  t: 152 },
  { no:  3, cct: '21EBH0903N', nombre: 'Benito Juárez García',             localidad: 'San Bartolo',         municipio: 'Francisco Z. Mena',   h: 14,  m: 12,  t: 26  },
  { no:  4, cct: '21EBH0464F', nombre: 'David Alfaro Siqueiros',           localidad: 'Huitzilac',           municipio: 'Jalpan',              h: 33,  m: 27,  t: 60  },
  { no:  5, cct: '21EBH0789L', nombre: 'David Alfaro Siqueiros',           localidad: 'Jaltocan',            municipio: 'Jalpan',              h: 25,  m: 17,  t: 42  },
  { no:  6, cct: '21EBH0708K', nombre: 'Diego Rivera',                     localidad: 'Ejido Cañada Colotla',municipio: 'Francisco Z. Mena',   h: 36,  m: 28,  t: 64  },
  { no:  7, cct: '21EBH0608L', nombre: 'Emiliano Zapata',                  localidad: 'San Diego',           municipio: 'Pantepec',            h: 36,  m: 45,  t: 81  },
  { no:  8, cct: '21EBH0620G', nombre: 'Jaime Sabines',                    localidad: 'Agua Linda',          municipio: 'Jalpan',              h: 23,  m: 19,  t: 42  },
  { no:  9, cct: '21EBH0681U', nombre: 'José Ignacio Gregorio Comonfort',  localidad: 'Palma Real',          municipio: 'Venustiano Carranza', h: 25,  m: 20,  t: 45  },
  { no: 10, cct: '21EBH0201W', nombre: 'José Vasconcelos',                 localidad: 'Lázaro Cárdenas',    municipio: 'Venustiano Carranza', h: 250, m: 235, t: 485 },
  { no: 11, cct: '21EBH0799S', nombre: 'Juan Aldama',                      localidad: 'Nuevo Zoquiapan',    municipio: 'Pantepec',            h: 24,  m: 29,  t: 53  },
  { no: 12, cct: '21EBH0704O', nombre: 'Luis Donaldo Colosio Murrieta',    localidad: 'La Ceiba Chica',     municipio: 'Jalpan',              h: 21,  m: 14,  t: 35  },
  { no: 13, cct: '21EBH0214Z', nombre: 'Mecapalapa',                       localidad: 'Mecapalapa',          municipio: 'Pantepec',            h: 108, m: 124, t: 232 },
  { no: 14, cct: '21EBH0465E', nombre: 'Moisés Sáenz Garza',               localidad: 'Tecomate',            municipio: 'Francisco Z. Mena',   h: 45,  m: 41,  t: 86  },
  { no: 15, cct: '21EBH0130S', nombre: 'Reyes García Olivares',            localidad: 'Francisco Z. Mena',  municipio: 'Francisco Z. Mena',   h: 76,  m: 72,  t: 148 },
  { no: 16, cct: '21ECT0017T', nombre: 'Tecnológico Francisco Z. Mena',    localidad: 'Francisco Z. Mena',  municipio: 'Francisco Z. Mena',   h: 92,  m: 105, t: 197 },
  { no: 17, cct: '21EBH0682T', nombre: 'Vicente Suárez Ferrer',            localidad: 'Coyolito',            municipio: 'Venustiano Carranza', h: 30,  m: 20,  t: 50  },
];

const totalT = planteles.reduce((s, p) => s + p.t, 0);
const totalH = planteles.reduce((s, p) => s + p.h, 0);
const totalM = planteles.reduce((s, p) => s + p.m, 0);

// ─── DOCUMENTO ───────────────────────────────────────────────────────────────
const doc = new Document({
  creator: 'DidácticaIA — Zona Escolar 004 BGE',
  title: 'Plan de Intervención Pedagógica de Supervisión 2026-2027',
  sections: [{
    properties: {
      page: {
        margin: { top: mm(25), bottom: mm(25), left: mm(25), right: mm(25) },
      },
    },
    children: [

      // ══ PORTADA ══════════════════════════════════════════════════════════
      gap(),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [runBold('SECRETARÍA DE EDUCACIÓN PÚBLICA', 12, NAVY)] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [runBold('SUBSECRETARÍA DE EDUCACIÓN OBLIGATORIA', 12, NAVY)] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [runBold('DIRECCIÓN GENERAL DE EDUCACIÓN BÁSICA SEGUNDO NIVEL', 12, NAVY)] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [runBold('DIRECCIÓN DE BACHILLERATOS ESTATALES Y PREPARATORIA ABIERTA', 12, NAVY)] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 120 }, children: [runBold('PLAN DE INTERVENCIÓN PEDAGÓGICA DE SUPERVISIÓN', 18, NAVY)] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [runBold('CICLO ESCOLAR 2026 – 2027', 14, BLUE)] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 80 }, children: [runBold('Zona Escolar 004', 13, NAVY)] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [runNorm('Clave: 21FMS0020X', 11)] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [runNorm('Bachillerato General Estatal | Modalidad Escolarizada', 11)] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [runNorm('17 planteles | 4 municipios | 2,210 alumnos', 11)] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 160, after: 60 }, children: [runBold('Supervisor: ', 11), runNorm('Ing. Alejandro Escamilla Martínez', 11)] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [runBold('Elaborado por ATP: ', 11), runNorm('Ing. Samuel Cruz Interial', 11)] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [runBold('Equipo ATP: ', 11), runNorm('Imelda Hernández García, Víctor Manuel Sáenz Cuellar, Lilia Castillo Leyva', 11)] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [runBold('Sede: ', 11), runNorm('Lázaro Cárdenas, Venustiano Carranza, Puebla', 11)] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 60 }, children: [runItal('"Una supervisión cercana, crítica y transformadora al servicio de la comunidad escolar."', 11, BLUE)] }),

      pageBreak(),

      // ══ 1. DATOS GENERALES ═══════════════════════════════════════════════
      h1('1. DATOS GENERALES DE LA SUPERVISIÓN'),
      simpleTable(
        ['Campo', 'Información'],
        [
          ['Clave de la Zona Escolar', '21FMS0020X'],
          ['Nombre de la Zona Escolar', 'Zona Escolar 004'],
          ['Nombre del Supervisor', 'Ing. Alejandro Escamilla Martínez'],
          ['Entidad Federativa', 'Puebla'],
          ['Municipio sede', 'Venustiano Carranza (Lázaro Cárdenas)'],
          ['Municipios que atiende', 'Venustiano Carranza, Francisco Z. Mena, Pantepec, Jalpan'],
          ['Número de Planteles', '17'],
          ['Tipo de Subsistema', 'Bachillerato General Estatal (BGE)'],
          ['Modalidad', 'Escolarizada'],
          ['Matrícula total', `${totalT.toLocaleString()} alumnos (${totalH} H / ${totalM} M)`],
          ['Personal ATP', 'Ing. Samuel Cruz Interial, Imelda Hernández García, Víctor Manuel Sáenz Cuellar, Lilia Castillo Leyva'],
          ['Ciclo escolar', '2026 – 2027'],
        ],
        [3000, 6500],
      ),

      pageBreak(),

      // ══ 2. PRESENTACIÓN DEL SUPERVISOR ══════════════════════════════════
      h1('2. PRESENTACIÓN DEL SUPERVISOR ESCOLAR'),
      p('El Ing. Alejandro Escamilla Martínez, Supervisor de la Zona Escolar 004 de Bachilleratos Generales del Estado de Puebla, es egresado de la Universidad Veracruzana, donde obtuvo el título de Ingeniero Mecánico Electricista en marzo de 1998. Su formación académica y experiencia profesional lo han consolidado como líder educativo comprometido con la mejora continua de los procesos pedagógicos.'),
      p('Desde el año 2015, mediante oficio emitido por la Subsecretaría de Educación Obligatoria y la Dirección de Bachilleratos Estatales y Preparatoria Abierta (DBEPA), se le asignó la responsabilidad de encabezar la Supervisión Escolar de la Zona 004, actualmente integrada por 17 bachilleratos generales distribuidos en cuatro municipios de la sierra norte de Puebla: Venustiano Carranza, Francisco Z. Mena, Pantepec y Jalpan.'),
      p('Bajo su liderazgo, la zona ha impulsado de manera sostenida el fortalecimiento de la función pedagógica, la formación docente, el acompañamiento técnico a directivos y la implementación de los principios de la Nueva Escuela Mexicana (NEM). El supervisor cuenta con el apoyo de cuatro Asesores Técnico Pedagógicos (ATP) que colaboran en las acciones de planeación, seguimiento y evaluación del presente Plan de Intervención Pedagógica.'),

      pageBreak(),

      // ══ 3. PROPÓSITO DEL DOCUMENTO ══════════════════════════════════════
      h1('3. PROPÓSITO DEL DOCUMENTO'),
      p('El presente Plan de Intervención Pedagógica de Supervisión (PIPS) 2026-2027 de la Zona Escolar 004 tiene como propósito establecer una ruta estratégica y articulada de acompañamiento, seguimiento y mejora de los procesos educativos en los 17 planteles que conforman la zona escolar.'),
      p('El PIPS constituye una herramienta de gestión pedagógica que orienta las acciones de la supervisión hacia la atención de problemáticas detectadas mediante el diagnóstico realizado a partir de los Planes de Mejora Continua (PMC) y los Programas Aula, Escuela y Comunidad (PAEC) de cada plantel. Su elaboración responde al mandato de la Dirección de Bachilleratos Estatales y Preparatoria Abierta (DBEPA) en el marco del Plan Anual de Trabajo ciclo 2026-2027.'),
      p('Las acciones contenidas en este plan se diseñaron con base en tres ejes prioritarios identificados en el ciclo anterior: (1) la calidad técnico-pedagógica de la planeación didáctica y los documentos PAEC-PEC, (2) el fortalecimiento de la función directiva y la gestión escolar, y (3) la atención a la deserción escolar y el rezago académico en los planteles de menor matrícula.'),

      pageBreak(),

      // ══ 4. ALINEACIÓN NEM Y NORMATIVA ═══════════════════════════════════
      h1('4. ALINEACIÓN CON LA NUEVA ESCUELA MEXICANA Y FUNDAMENTACIÓN NORMATIVA'),
      h2('4.1 Alineación con la Nueva Escuela Mexicana (NEM)'),
      p('El presente PIPS se fundamenta en los principios filosóficos, pedagógicos y éticos de la Nueva Escuela Mexicana (NEM), que orienta la educación media superior hacia una formación humanista, crítica e integral. En congruencia con estos principios, las acciones de supervisión priorizan:'),
      bullet('La educación como derecho universal, con énfasis en equidad, inclusión y excelencia educativa para todos los estudiantes de la zona.'),
      bullet('El rol transformador de la supervisión como agente de cambio pedagógico, garante de condiciones adecuadas de enseñanza y aprendizaje.'),
      bullet('La corresponsabilidad de la comunidad escolar en la mejora continua.'),
      bullet('La contextualización curricular mediante el Marco Curricular Común de la EMS (MCCEMS) y el Programa Aula, Escuela y Comunidad (PAEC).'),

      h2('4.2 Fundamentación Normativa'),
      bullet('Constitución Política de los Estados Unidos Mexicanos, Artículo 3.º'),
      bullet('Ley General de Educación (2019) y sus reformas vigentes'),
      bullet('Ley de Educación del Estado de Puebla'),
      bullet('Acuerdos Secretariales SEP vigentes (Acuerdo 33/12/22, Acuerdo 14/08/23)'),
      bullet('Marco Curricular Común de la Educación Media Superior (MCCEMS) 2022-2025'),
      bullet('Programa Sectorial de Educación 2020-2024'),
      bullet('Plan Nacional de Desarrollo 2019-2024 / 2025-2030'),
      bullet('Lineamientos DBEPA para Bachillerato General 2026-2027'),
      bullet('Plan Anual de Trabajo DBEPA ciclo escolar 2026-2027'),

      pageBreak(),

      // ══ 5. REFLEXIÓN PIPS 2025-2026 ══════════════════════════════════════
      h1('5. REFLEXIÓN DEL PIPS 2025-2026'),
      h2('5.1 Descripción del PIPS anterior'),
      p('Durante el ciclo escolar 2025-2026, la Zona Escolar 004 elaboró su Plan de Intervención Pedagógica de Supervisión y lo entregó a la DBEPA en el periodo establecido (octubre 2025). El plan abordó tres problemáticas centrales: (1) la calidad de la planeación didáctica, (2) la articulación de los documentos PAEC-PEC con el currículo, y (3) el fortalecimiento del liderazgo directivo.'),

      h2('5.2 Fortalezas identificadas del ciclo 2025-2026'),
      bullet('La totalidad de los 17 planteles entregaron su documento PAEC-PEC en ambos semestres del ciclo escolar.'),
      bullet('Se consolidó un sistema de revisión técnica de planeaciones didácticas en tres momentos de evaluación por semestre.'),
      bullet('Los planteles de mayor matrícula (José Vasconcelos, Alfonso de la Madrid, Mecapalapa) presentaron documentos PAEC-PEC con diagnósticos comunitarios robustos.'),
      bullet('El equipo de 4 ATPs logró cubrir la totalidad de la zona con visitas técnicas por primera vez.'),
      bullet('Se elaboró y entregó la primera versión del PIPS de la zona, cumpliendo con el requisito normativo de la DBEPA.'),

      h2('5.3 Áreas de oportunidad detectadas del ciclo 2025-2026'),
      bullet('La alineación curricular en los documentos PAEC-PEC presentó errores en el 64.7% de los planteles revisados.'),
      bullet('El Comité del Plantel en los documentos PAEC-PEC fue incompleto en el 47.1% de los casos.'),
      bullet('El Plan Operativo de los PAEC-PEC describía actividades desde una perspectiva administrativa, sin detallar la estrategia didáctica específica del alumno.'),
      bullet('Tres planteles presentaron documentos con deficiencias estructurales graves (ausencia de diagnóstico, congruencia débil entre problemática y proyecto).'),
      bullet('El PIPS 2025-2026 careció de metas medibles con indicadores específicos por objetivo.'),

      h2('5.4 Compromisos de mejora para 2026-2027'),
      bullet('Fortalecer la formación de directivos y docentes en el uso técnico-correcto del MCCEMS para la elaboración del PAEC-PEC 2026-2027.'),
      bullet('Establecer metas con indicadores cuantitativos medibles para cada objetivo del PIPS 2026-2027.'),
      bullet('Elaborar un PIPS 2026-2027 con diagnóstico basado en datos reales, objetivos alcanzables y cronograma articulado al PAT DBEPA.'),
      bullet('Diseñar y aplicar instrumentos formales para el seguimiento y evaluación de las acciones del PIPS.'),

      pageBreak(),

      // ══ 6. DIAGNÓSTICO ═══════════════════════════════════════════════════
      h1('6. DIAGNÓSTICO DE LA ZONA ESCOLAR 2026-2027'),
      h2('6.1 Contexto geográfico y socioeducativo'),
      p('La Zona Escolar 004 de Bachilleratos Generales atiende a comunidades ubicadas en la sierra norte de Puebla, en cuatro municipios: Venustiano Carranza, Francisco Z. Mena, Pantepec y Jalpan. Se trata de una región predominantemente rural, con presencia de comunidades totonacas y mestizas, altos índices de marginación social y económica, y condiciones geográficas que dificultan el acceso regular de estudiantes y docentes a los planteles.'),
      p('Las comunidades de la sierra norte presentan características que impactan directamente en los procesos educativos: baja escolaridad promedio de los padres de familia, presencia de violencia intrafamiliar y de género, problemáticas relacionadas con el consumo de sustancias en jóvenes, y limitaciones de conectividad e infraestructura tecnológica en planteles rurales.'),

      h2('6.2 Matrícula y estadística de la zona'),
      simpleTable(
        ['No.', 'CCT', 'Plantel', 'Localidad', 'Municipio', 'H', 'M', 'Total'],
        planteles.map(p => [
          String(p.no), p.cct, p.nombre, p.localidad, p.municipio,
          String(p.h), String(p.m), String(p.t)
        ]),
        [380, 1300, 2100, 1200, 1400, 380, 380, 480],
      ),
      gap(),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 60 },
        children: [runBold(`TOTAL ZONA: ${totalH} hombres + ${totalM} mujeres = ${totalT} alumnos`, 11, NAVY)],
      }),

      h2('6.3 Personal de la zona escolar'),
      simpleTable(
        ['Categoría', 'Número de personas'],
        [
          ['Responsables de Plantel (Directivos)', '17'],
          ['Docentes', '96'],
          ['Personal Administrativo', '23'],
          ['Personal de Apoyo', '1'],
          ['Con permiso sin goce de sueldo', '2'],
          ['TOTAL', '139'],
        ],
        [6000, 3500],
      ),

      h2('6.4 Problemáticas pedagógicas detectadas en el ciclo 2025-2026'),
      h3('Problemática 1 (Alta prioridad): Errores de alineación curricular en los documentos PAEC-PEC'),
      p('El 64.7% de los planteles (11 de 17) presentaron errores técnicos en la alineación curricular de sus documentos PAEC-PEC 2025-2026. Los errores más frecuentes fueron: (a) uso de "Progresiones de Aprendizaje" para asignaturas de 1.º y 2.º semestre, donde la normativa MCCEMS 2025 establece el uso de "Propósitos Formativos"; (b) vinculación de UAC a semestres incorrectos.'),

      h3('Problemática 2 (Alta prioridad): Integración incompleta del Comité del Plantel en el PAEC-PEC'),
      p('El 47.1% de los planteles (8 de 17) no evidenciaron la conformación formal del Comité del Plantel con las figuras mínimas obligatorias requeridas por la rúbrica PAEC-PEC 2025: Responsable de Plantel, 2 docentes, 2 estudiantes y 1 padre/madre de familia.'),

      h3('Problemática 3 (Media-alta prioridad): Bajo aprovechamiento académico y rezago en habilidades básicas'),
      p('Los diagnósticos comunitarios de los planteles identifican de forma recurrente el bajo aprovechamiento académico como problemática central, especialmente en áreas de pensamiento matemático y comunicación. Planteles como Mecapalapa (232 alumnos), José Vasconcelos (485 alumnos) y Alfonso de la Madrid (223 alumnos) reportaron indicadores de deserción de 10 a 30%.'),

      h3('Problemática 4 (Media prioridad): Deserción escolar asociada a factores socioeconómicos'),
      p('Los planteles de la zona reportaron factores de riesgo asociados a la deserción escolar: migración familiar y laboral, trabajo infantil y juvenil, embarazo adolescente, y condiciones de violencia intrafamiliar. Planteles pequeños como Benito Juárez García (26 alumnos) y Luis Donaldo Colosio (35 alumnos) son especialmente vulnerables a la pérdida de matrícula.'),

      h3('Problemática 5 (Media prioridad): Insuficiencia de personal docente y perfiles fuera de área'),
      p('Al menos 5 planteles de la zona operan con plantillas docentes reducidas, donde un mismo docente atiende varias UAC fuera de su perfil de formación. La Zona 004 tiene 96 docentes para 2,210 alumnos (ratio de 1:23 aprox.), pero la distribución desigual genera cargas asimétricas.'),

      h3('Problemática 6 (Media prioridad): Limitaciones de infraestructura y conectividad'),
      p('La mayoría de los planteles en municipios de Jalpan y Pantepec operan con infraestructura básica, sin acceso estable a internet, con equipos tecnológicos insuficientes o inexistentes. Esta situación limita la implementación plena de las estrategias pedagógicas del MCCEMS.'),

      pageBreak(),

      // ══ 7. OBJETIVOS Y METAS ═════════════════════════════════════════════
      h1('7. OBJETIVOS Y METAS DEL PIPS 2026-2027'),
      h2('7.1 Objetivo General'),
      p('Fortalecer la calidad pedagógica de los 17 planteles de la Zona Escolar 004 mediante el acompañamiento técnico-pedagógico sistemático, la formación continua de directivos y docentes en el MCCEMS, y el seguimiento oportuno a indicadores de permanencia escolar, con el propósito de garantizar el derecho de los 2,210 estudiantes a una educación media superior integral, inclusiva y de excelencia, alineada a los principios de la Nueva Escuela Mexicana.'),

      h2('7.2 Objetivos Específicos y Metas'),
      h3('Objetivo 1: Mejorar la calidad técnico-pedagógica de los documentos PAEC-PEC 2026-2027'),
      simpleTable(
        ['Meta', 'Indicador', 'Responsable', 'Fecha'],
        [
          ['90% de planteles con alineación curricular correcta (Propósitos/Progresiones según semestre)', '% documentos sin errores', 'Supervisor + ATP', 'Oct 2026 y Feb 2027'],
          ['100% de planteles con Comité de las 5 figuras obligatorias', '% comités completos', 'ATP', 'Oct 2026'],
          ['85% de planes operativos con estrategia didáctica específica', '% planes con estrategia pedagógica', 'ATP', 'Nov 2026 y Mar 2027'],
        ],
        [3500, 2500, 1800, 1700],
      ),

      h3('Objetivo 2: Fortalecer la función directiva y el liderazgo pedagógico'),
      simpleTable(
        ['Meta', 'Indicador', 'Responsable', 'Fecha'],
        [
          ['Capacitar al 100% de los 17 directivos en MCCEMS 2025 y PAEC-PEC 2026', 'Lista de asistencia', 'Supervisor', 'Agosto 2026'],
          ['100% de directivos con PMC actualizado y diagnóstico en indicadores reales', '% PMC con indicadores verificables', 'Supervisor + ATP', 'Sep 2026'],
          ['Al menos 2 visitas de acompañamiento por plantel durante el ciclo', 'Bitácora de visitas', 'Supervisor + ATP', 'Jun 2027'],
        ],
        [3500, 2500, 1800, 1700],
      ),

      h3('Objetivo 3: Reducir la deserción escolar y mejorar el aprovechamiento académico'),
      simpleTable(
        ['Meta', 'Indicador', 'Responsable', 'Fecha'],
        [
          ['Reducir la deserción en al menos un 5% respecto al ciclo 2025-2026', 'Variación en matrícula (Forma 911)', 'Directivos + Supervisor', 'Jul 2027'],
          ['80% de estudiantes en riesgo con tutoría de seguimiento', '% alumnos con tutoría activa', 'Docentes + Directivos', 'Cada corte'],
          ['1 proyecto de lectura y matemáticas en los 5 planteles con mayor rezago', '% planteles prioritarios con proyecto', 'ATP', 'Ene 2027'],
        ],
        [3500, 2500, 1800, 1700],
      ),

      h3('Objetivo 4: Promover metodologías activas y planeación didáctica contextualizada'),
      simpleTable(
        ['Meta', 'Indicador', 'Responsable', 'Fecha'],
        [
          ['90% de docentes con planeaciones en los 3 momentos de evaluación', '% docentes con planeación validada', 'ATP', 'Cada corte'],
          ['80% de planeaciones revisadas con al menos 1 metodología activa (ABP, casos)', '% planeaciones con metodología activa', 'ATP', 'Cada revisión'],
          ['2 sesiones de formación docente en metodologías activas durante el ciclo', 'Listas de asistencia y productos', 'Supervisor + ATP', 'Semestres A y B'],
        ],
        [3500, 2500, 1800, 1700],
      ),

      pageBreak(),

      // ══ 8. CRONOGRAMA ════════════════════════════════════════════════════
      h1('8. CRONOGRAMA DE IMPLEMENTACIÓN 2026-2027'),
      p('Las acciones se organizan en dos semestres (A: agosto-enero, B: febrero-julio), alineadas al Plan Anual de Trabajo DBEPA 2026-2027.'),
      bullet('Entrega del PIPS a DBEPA: Del 6 al 10 de octubre de 2026'),
      bullet('Avance del PIPS: Del 9 al 13 de febrero de 2027'),
      bullet('Reporte de resultados del PIP: Del 29 de junio al 2 de julio de 2027'),
      bullet('Reporte final del PIPS: Del 12 al 15 de julio de 2027'),

      gap(),
      new Paragraph({ spacing: { before: 120, after: 60 }, children: [runBold('SEMESTRE A (Agosto 2026 – Enero 2027)', 11, NAVY)] }),
      simpleTable(
        ['Actividad', 'Objetivo', 'Responsable', 'Mes', 'Indicador'],
        [
          ['Reunión de instalación de Comités PAEC-PEC 2026', 'Obj. 1', 'Supervisor + ATP', 'Ago 2026', '100% comités instalados'],
          ['Capacitación a directivos: MCCEMS 2025 y PAEC-PEC 2026', 'Obj. 1 y 2', 'Supervisor + ATP', 'Ago 2026', '17 directivos capacitados'],
          ['Revisión 1.ª PAEC-PEC (fase planeación)', 'Obj. 1', 'ATP', 'Sep-Oct 2026', '100% planteles revisados'],
          ['Entrega del PIPS 2026-2027 a DBEPA', 'Todos', 'Supervisor', '6-10 Oct 2026', 'Acuse DBEPA'],
          ['1.er informe visita administrativa', 'Obj. 2', 'Supervisor', 'Oct 2026', 'Acuse recibido'],
          ['Taller de formación docente: Metodologías activas', 'Obj. 4', 'ATP', 'Oct-Nov 2026', '80% docentes asistentes'],
          ['Revisión planeaciones didácticas (1.er corte)', 'Obj. 4', 'ATP', 'Oct-Nov 2026', '% planeaciones validadas'],
          ['Seguimiento a casos de riesgo de deserción', 'Obj. 3', 'Directivos + ATP', 'Nov-Dic 2026', 'N° alumnos recuperados'],
          ['Revisión 2.ª PAEC-PEC (fase implementación)', 'Obj. 1', 'ATP', 'Nov-Dic 2026', '% avance documentos'],
          ['Presentación de proyectos PEC (Sem. A)', 'Obj. 1', 'Supervisor + ATP', 'Dic-Ene 2027', '100% planteles presentan'],
        ],
        [2800, 1100, 1500, 1100, 1800],
      ),

      gap(),
      new Paragraph({ spacing: { before: 120, after: 60 }, children: [runBold('SEMESTRE B (Febrero 2027 – Julio 2027)', 11, NAVY)] }),
      simpleTable(
        ['Actividad', 'Objetivo', 'Responsable', 'Mes', 'Indicador'],
        [
          ['Entrega avance del PIPS a DBEPA', 'Todos', 'Supervisor', '9-13 Feb 2027', 'Acuse DBEPA'],
          ['Taller 2: Evaluación formativa y rúbricas', 'Obj. 4', 'ATP', 'Feb 2027', '% docentes que aplican rúbricas'],
          ['2.º informe visita administrativa', 'Obj. 2', 'Supervisor', 'Ene-Feb 2027', 'Acuse recibido'],
          ['Revisión planeaciones 2.º corte + retroalimentación', 'Obj. 4', 'ATP', 'Mar 2027', '% planeaciones mejoradas'],
          ['Seguimiento proyecto lectura y matemáticas', 'Obj. 3', 'ATP', 'Mar-Abr 2027', '% planteles con proyecto activo'],
          ['3.er informe visita administrativa', 'Obj. 2', 'Supervisor', 'Abr 2027', 'Acuse recibido'],
          ['Revisión 3.ª PAEC-PEC (fase difusión y evaluación)', 'Obj. 1', 'ATP', 'May 2027', '% documentos completados'],
          ['Encuentro académico de directivos y ATPs', 'Obj. 2', 'Supervisor', 'May 2027', 'Acta de sesión'],
          ['Presentación de proyectos PEC (Sem. B)', 'Obj. 1', 'Supervisor + ATP', 'Jun 2027', '100% planteles presentan'],
          ['4.º informe visita administrativa', 'Obj. 2', 'Supervisor', 'Jun 2027', 'Acuse recibido'],
          ['Reporte de resultados del PIP a DBEPA', 'Todos', 'Supervisor', '29 Jun-2 Jul 2027', 'Entrega confirmada'],
          ['Entrega reporte final PIPS a DBEPA', 'Todos', 'Supervisor', '12-15 Jul 2027', 'Acuse DBEPA'],
        ],
        [2800, 1100, 1500, 1100, 1800],
      ),

      pageBreak(),

      // ══ 9. RECURSOS ══════════════════════════════════════════════════════
      h1('9. RECURSOS'),
      simpleTable(
        ['Tipo de recurso', 'Descripción'],
        [
          ['Humanos', 'Supervisor escolar, 4 ATPs, 17 directivos, 96 docentes, personal de apoyo institucional (DBEPA)'],
          ['Materiales impresos', 'Guía PAEC 2.ª edición, MCCEMS 2025, lineamientos DBEPA, rúbricas, listas de cotejo, formatos de visita'],
          ['Tecnológicos', 'Laptops del equipo ATP, proyector para capacitaciones, correo institucional, Google Drive'],
          ['Plataformas', 'Formularios Office 365 (DBEPA), Google Forms, plataforma DidácticaIA'],
          ['Infraestructura', 'Sede de la supervisión (Lázaro Cárdenas), instalaciones de planteles, transporte para visitas'],
          ['Apoyo externo', 'Programas federales (Beca Benito Juárez), municipios, organizaciones comunitarias'],
        ],
        [2800, 6700],
      ),

      pageBreak(),

      // ══ 10. SEGUIMIENTO ══════════════════════════════════════════════════
      h1('10. MÉTODOS DE SEGUIMIENTO Y OBSERVACIÓN DEL CAMBIO'),
      h2('10.1 Instrumentos de recolección'),
      simpleTable(
        ['Instrumento', 'Uso', 'Frecuencia', 'Responsable'],
        [
          ['Bitácora del supervisor/ATP', 'Registro cualitativo de observaciones por plantel', 'Cada visita', 'Supervisor + ATPs'],
          ['Lista de cotejo PAEC-PEC', 'Revisión técnica de documentos PAEC', '3 momentos/semestre', 'ATPs'],
          ['Lista de cotejo de planeaciones', 'Verificación de planeaciones didácticas', '3 cortes/semestre', 'ATPs'],
          ['Cuestionario a directivos', 'Percepción de avance y necesidades por plantel', 'Inicio y fin de ciclo', 'Supervisor'],
          ['Guía de observación de clase', 'Evaluación de la práctica docente in situ', 'Al menos 1/plantel/ciclo', 'Supervisor + ATPs'],
          ['Rúbrica de presentación PEC', 'Evaluación del proyecto escolar comunitario', 'Fin de cada semestre', 'Supervisor + ATPs'],
          ['Registro de matrícula', 'Control de altas, bajas y permanencia', 'Mensual', 'Directivos'],
        ],
        [2200, 2800, 1800, 1700],
      ),

      pageBreak(),

      // ══ 11. EVALUACIÓN DEL PLAN ══════════════════════════════════════════
      h1('11. EVALUACIÓN DEL PLAN'),
      simpleTable(
        ['Objetivo', 'Indicador de éxito', 'Meta cuantitativa', 'Instrumento'],
        [
          ['Obj. 1 — Calidad PAEC-PEC', '% documentos sin errores de alineación curricular', '≥ 90% de planteles', 'Lista de cotejo PAEC'],
          ['Obj. 1 — Comités', '% comités con las 5 figuras obligatorias', '100% de planteles', 'Revisión documental'],
          ['Obj. 2 — Directivos', '% directivos capacitados en MCCEMS/PAEC', '100%', 'Lista de asistencia'],
          ['Obj. 2 — Visitas', 'No. de visitas realizadas vs. planeadas', '≥ 2/plantel/ciclo', 'Bitácora + informes'],
          ['Obj. 3 — Deserción', 'Variación % matrícula inicio vs. fin de ciclo', 'Reducción ≥ 5%', 'Forma 911'],
          ['Obj. 3 — Tutorías', '% alumnos en riesgo con tutoría activa', '≥ 80%', 'Expedientes alumnos'],
          ['Obj. 4 — Planeaciones', '% docentes con planeación validada por corte', '≥ 90%', 'Lista de cotejo'],
          ['Obj. 4 — Met. activas', '% planeaciones con metodología activa', '≥ 80%', 'Rúbrica de planeación'],
        ],
        [2000, 2800, 1500, 2200],
      ),

      pageBreak(),

      // ══ 12. EVIDENCIAS ═══════════════════════════════════════════════════
      h1('12. EVIDENCIAS ESPERADAS DEL PLAN'),
      simpleTable(
        ['Tipo de evidencia', 'Descripción', 'Resguardo'],
        [
          ['Fotografías', 'Registro visual de capacitaciones, visitas y presentación de proyectos PEC', 'Google Drive Supervisión 004'],
          ['Listas de asistencia', 'Control de participación en capacitaciones y talleres', 'Expediente físico + digital'],
          ['Bitácoras de visita', 'Registros cualitativos de cada visita de acompañamiento', 'Expediente por plantel'],
          ['Documentos PAEC-PEC revisados', 'Copias con retroalimentaciones escritas por ATP', 'Carpeta por plantel'],
          ['Actas de CAPEMS', 'Productos del trabajo colegiado de directivos y docentes', 'Expediente institucional'],
          ['Informes de visita administrativa', 'Documentos formales remitidos a DBEPA (4 por ciclo)', 'Formularios DBEPA'],
          ['Planeaciones didácticas revisadas', 'Evidencia de seguimiento docente', 'Expediente por plantel'],
          ['Reportes al DBEPA', 'Avance (Feb 2027), Resultados (Jun-Jul 2027), Final (Jul 2027)', 'Formularios + copias'],
        ],
        [2000, 4200, 3300],
      ),

      pageBreak(),

      // ══ 13. REFERENCIAS ══════════════════════════════════════════════════
      h1('13. REFERENCIAS'),
      p('Las siguientes referencias se presentan conforme al formato APA 7.ª edición:'),
      new Paragraph({ spacing: { before: 100, after: 40 }, indent: { left: 720, hanging: 720 }, children: [runNorm('Secretaría de Educación Pública. (2022). Marco Curricular Común de la Educación Media Superior. SEP. https://www.gob.mx/sep')] }),
      new Paragraph({ spacing: { before: 40, after: 40 }, indent: { left: 720, hanging: 720 }, children: [runNorm('Secretaría de Educación Pública. (2025). Programa Aula, Escuela y Comunidad (PAEC) — 2.ª Edición. SEP-SEMS.')] }),
      new Paragraph({ spacing: { before: 40, after: 40 }, indent: { left: 720, hanging: 720 }, children: [runNorm('Dirección de Bachilleratos Estatales y Preparatoria Abierta. (2025). Guía para la elaboración del PIPS ciclo 2025-2026. SEP Puebla.')] }),
      new Paragraph({ spacing: { before: 40, after: 40 }, indent: { left: 720, hanging: 720 }, children: [runNorm('Dirección de Bachilleratos Estatales y Preparatoria Abierta. (2026). Plan Anual de Trabajo ciclo escolar 2026-2027. SEP Puebla.')] }),
      new Paragraph({ spacing: { before: 40, after: 40 }, indent: { left: 720, hanging: 720 }, children: [runNorm('INEGI. (2020). Censo de Población y Vivienda 2020. https://www.inegi.org.mx')] }),
      new Paragraph({ spacing: { before: 40, after: 40 }, indent: { left: 720, hanging: 720 }, children: [runNorm('CONEVAL. (2020). Medición de la pobreza municipal en México 2020. https://www.coneval.org.mx')] }),
      new Paragraph({ spacing: { before: 40, after: 40 }, indent: { left: 720, hanging: 720 }, children: [runNorm('Subsecretaría de Educación Obligatoria. (2022). Ley General de Educación. Diario Oficial de la Federación.')] }),

      pageBreak(),

      // ══ 14. VALIDACIÓN Y FIRMAS ══════════════════════════════════════════
      h1('14. VALIDACIÓN Y FIRMAS'),
      gap(),
      gap(),
      gap(),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: [3000, 3300, 3300],
        rows: [
          new TableRow({
            children: [
              tcH('Elaboró', { w: 3000 }),
              tcH('Revisó', { w: 3300 }),
              tcH('Autorizó', { w: 3300 }),
            ],
          }),
          new TableRow({
            children: [
              tc('', { w: 3000, size: 10 }),
              tc('', { w: 3300, size: 10 }),
              tc('', { w: 3300, size: 10 }),
            ],
          }),
          new TableRow({
            children: [
              (() => {
                const lines = [
                  '_________________________________',
                  'Ing. Samuel Cruz Interial',
                  'A.T.P. Zona Escolar 004',
                  '21FMS0020X',
                ];
                const runs = [];
                lines.forEach((l, i) => {
                  runs.push(new TextRun({ text: l, size: pt(10), font: 'Arial' }));
                  if (i < lines.length - 1) runs.push(new TextRun({ break: 1 }));
                });
                return new TableCell({
                  width: { size: 3000, type: WidthType.DXA },
                  borders: bdr(),
                  margins: CELL_MARGINS,
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 }, children: runs })],
                });
              })(),
              (() => {
                const lines = [
                  '_________________________________',
                  'Ing. Alejandro Escamilla Martínez',
                  'Supervisor Zona Escolar 004',
                  '21FMS0020X',
                ];
                const runs = [];
                lines.forEach((l, i) => {
                  runs.push(new TextRun({ text: l, size: pt(10), font: 'Arial' }));
                  if (i < lines.length - 1) runs.push(new TextRun({ break: 1 }));
                });
                return new TableCell({
                  width: { size: 3300, type: WidthType.DXA },
                  borders: bdr(),
                  margins: CELL_MARGINS,
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 }, children: runs })],
                });
              })(),
              (() => {
                const lines = [
                  '_________________________________',
                  'Dirección de Bachilleratos Estatales',
                  'y Preparatoria Abierta (DBEPA)',
                  'Secretaría de Educación Puebla',
                ];
                const runs = [];
                lines.forEach((l, i) => {
                  runs.push(new TextRun({ text: l, size: pt(10), font: 'Arial' }));
                  if (i < lines.length - 1) runs.push(new TextRun({ break: 1 }));
                });
                return new TableCell({
                  width: { size: 3300, type: WidthType.DXA },
                  borders: bdr(),
                  margins: CELL_MARGINS,
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 }, children: runs })],
                });
              })(),
            ],
          }),
        ],
      }),

    ],
  }],
});

// ─── GUARDAR ─────────────────────────────────────────────────────────────────
const buf = await Packer.toBuffer(doc);
fs.writeFileSync(outPath, buf);
console.log(`\n✅ PIPS v2 generado: ${outPath}`);
console.log(`   Tamaño: ${(buf.length / 1024).toFixed(1)} KB\n`);
