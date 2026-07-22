/**
 * Generador del PIPS 2026-2027 — Zona Escolar 004, BGE Puebla
 * Ejecutar: node scratch/generate-pips-zona004.mjs
 * Produce: scratch/PIPS_Zona004_2026-2027_COMPLETO.docx
 */

import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, PageBreak,
  Header, Footer, PageNumberElement, ShadingType, VerticalAlign,
  convertMillimetersToTwip
} from 'docx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, 'PIPS_Zona004_2026-2027_COMPLETO.docx');

// ─── PALETA DE COLORES ────────────────────────────────────────────────────────
const NAVY   = '1F3864';
const BLUE   = '2E74B5';
const LBLUE  = 'D6E4F0';
const GRAY   = 'F2F2F2';
const WHITE  = 'FFFFFF';
const GREEN  = '1E7E34';

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const pt = (n) => n * 2; // half-points
const mm = (n) => convertMillimetersToTwip(n);

function bold(text, size = 22, color = '000000') {
  return new TextRun({ text, bold: true, size: pt(size), color, font: 'Arial' });
}
function normal(text, size = 22, color = '000000') {
  return new TextRun({ text, size: pt(size), color, font: 'Arial' });
}
function italic(text, size = 22, color = '000000') {
  return new TextRun({ text, italics: true, size: pt(size), color, font: 'Arial' });
}

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: NAVY, space: 1 } },
    children: [new TextRun({ text, bold: true, size: pt(14), color: NAVY, font: 'Arial' })],
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, size: pt(13), color: NAVY, font: 'Arial' })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BLUE } },
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 160, after: 60 },
    children: [new TextRun({ text, bold: true, size: pt(12), color: BLUE, font: 'Arial' })],
  });
}

function p(text, size = 11, align = AlignmentType.JUSTIFIED, spacing = { before: 60, after: 60 }) {
  return new Paragraph({
    alignment: align,
    spacing,
    children: [normal(text, size)],
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    bullet: { level },
    spacing: { before: 40, after: 40 },
    children: [normal(text, 11)],
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function cell(text, bgColor = WHITE, bold_ = false, width = null, align = VerticalAlign.CENTER, colspan = 1) {
  const lines = String(text).split('\n');
  const textRuns = [];
  lines.forEach((line, idx) => {
    textRuns.push(bold_ ? bold(line, 10) : normal(line, 10));
    if (idx < lines.length - 1) {
      textRuns.push(new TextRun({ break: 1 }));
    }
  });

  const opts = {
    verticalAlign: align,
    shading: { fill: bgColor, type: ShadingType.CLEAR },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' },
    },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 40 },
        children: textRuns,
      }),
    ],
  };
  if (width) opts.width = { size: width, type: WidthType.DXA };
  if (colspan > 1) opts.columnSpan = colspan;
  return new TableCell(opts);
}

function tableFromRows(headers, rows, colWidths) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) =>
      cell(h, NAVY, true, colWidths ? colWidths[i] : null)
    ),
  });
  const dataRows = rows.map((row) =>
    new TableRow({
      children: row.map((c, i) =>
        typeof c === 'string'
          ? cell(c, (rows.indexOf(row) % 2 === 0) ? WHITE : GRAY, false, colWidths ? colWidths[i] : null)
          : c
      ),
    })
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

// ─── DATOS DE LA ZONA ────────────────────────────────────────────────────────
const planteles = [
  { no: 1,  cct: '21EBH0088T', nombre: 'Alfonso de la Madrid Vidaurreta', localidad: 'Venustiano Carranza', municipio: 'Venustiano Carranza', h: 105, m: 118, t: 223 },
  { no: 2,  cct: '21EBH0186U', nombre: 'Aquiles Serdán',                  localidad: 'Pantepec',            municipio: 'Pantepec',            h: 70,  m: 82,  t: 152 },
  { no: 3,  cct: '21EBH0903N', nombre: 'Benito Juárez García',            localidad: 'San Bartolo',         municipio: 'Francisco Z. Mena',   h: 14,  m: 12,  t: 26  },
  { no: 4,  cct: '21EBH0464F', nombre: 'David Alfaro Siqueiros',          localidad: 'Huitzilac',           municipio: 'Jalpan',              h: 33,  m: 27,  t: 60  },
  { no: 5,  cct: '21EBH0789L', nombre: 'David Alfaro Siqueiros',          localidad: 'Jaltocan',            municipio: 'Jalpan',              h: 25,  m: 17,  t: 42  },
  { no: 6,  cct: '21EBH0708K', nombre: 'Diego Rivera',                    localidad: 'Ejido Cañada Colotla',municipio: 'Francisco Z. Mena',   h: 36,  m: 28,  t: 64  },
  { no: 7,  cct: '21EBH0608L', nombre: 'Emiliano Zapata',                 localidad: 'San Diego',           municipio: 'Pantepec',            h: 36,  m: 45,  t: 81  },
  { no: 8,  cct: '21EBH0620G', nombre: 'Jaime Sabines',                   localidad: 'Agua Linda',          municipio: 'Jalpan',              h: 23,  m: 19,  t: 42  },
  { no: 9,  cct: '21EBH0681U', nombre: 'José Ignacio Gregorio Comonfort', localidad: 'Palma Real',          municipio: 'Venustiano Carranza', h: 25,  m: 20,  t: 45  },
  { no: 10, cct: '21EBH0201W', nombre: 'José Vasconcelos',                localidad: 'Lázaro Cárdenas',    municipio: 'Venustiano Carranza', h: 250, m: 235, t: 485 },
  { no: 11, cct: '21EBH0799S', nombre: 'Juan Aldama',                     localidad: 'Nuevo Zoquiapan',    municipio: 'Pantepec',            h: 24,  m: 29,  t: 53  },
  { no: 12, cct: '21EBH0704O', nombre: 'Luis Donaldo Colosio Murrieta',   localidad: 'La Ceiba Chica',     municipio: 'Jalpan',              h: 21,  m: 14,  t: 35  },
  { no: 13, cct: '21EBH0214Z', nombre: 'Mecapalapa',                      localidad: 'Mecapalapa',          municipio: 'Pantepec',            h: 108, m: 124, t: 232 },
  { no: 14, cct: '21EBH0465E', nombre: 'Moisés Sáenz Garza',              localidad: 'Tecomate',            municipio: 'Francisco Z. Mena',   h: 45,  m: 41,  t: 86  },
  { no: 15, cct: '21EBH0130S', nombre: 'Reyes García Olivares',           localidad: 'Francisco Z. Mena',  municipio: 'Francisco Z. Mena',   h: 76,  m: 72,  t: 148 },
  { no: 16, cct: '21ECT0017T', nombre: 'Tecnológico Francisco Z. Mena',   localidad: 'Francisco Z. Mena',  municipio: 'Francisco Z. Mena',   h: 92,  m: 105, t: 197 },
  { no: 17, cct: '21EBH0682T', nombre: 'Vicente Suárez Ferrer',           localidad: 'Coyolito',            municipio: 'Venustiano Carranza', h: 30,  m: 20,  t: 50  },
];

const totalT = planteles.reduce((s, p) => s + p.t, 0);  // 2,210
const totalH = planteles.reduce((s, p) => s + p.h, 0);
const totalM = planteles.reduce((s, p) => s + p.m, 0);

// ─── DOCUMENTO ───────────────────────────────────────────────────────────────
const doc = new Document({
  creator: 'DidácticaIA — Zona Escolar 004 BGE',
  title: 'Plan de Intervención Pedagógica de Supervisión 2026-2027',
  sections: [
    {
      properties: {
        page: {
          margin: { top: mm(25), bottom: mm(25), left: mm(25), right: mm(25) },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [normal('SECRETARÍA DE EDUCACIÓN PÚBLICA | DBEPA | ZONA ESCOLAR 004 BGE | CICLO ESCOLAR 2026-2027', 9, '888888')],
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
                normal('PIPS 2026-2027 — Zona Escolar 004 — Ing. Alejandro Escamilla Martínez  |  Página ', 9, '888888'),
                new PageNumberElement(),
              ],
            }),
          ],
        }),
      },
      children: [

        // ══════════════════════════════════════════
        // PORTADA
        // ══════════════════════════════════════════
        new Paragraph({ spacing: { after: 400 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [bold('SECRETARÍA DE EDUCACIÓN PÚBLICA', 12, NAVY)],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [bold('SUBSECRETARÍA DE EDUCACIÓN OBLIGATORIA', 12, NAVY)],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [bold('DIRECCIÓN GENERAL DE EDUCACIÓN BÁSICA SEGUNDO NIVEL', 12, NAVY)],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          children: [bold('DIRECCIÓN DE BACHILLERATOS ESTATALES Y PREPARATORIA ABIERTA', 12, NAVY)],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 100 },
          children: [bold('PLAN DE INTERVENCIÓN PEDAGÓGICA DE SUPERVISIÓN', 18, NAVY)],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [bold('CICLO ESCOLAR 2026 – 2027', 14, BLUE)],
        }),
        new Paragraph({ spacing: { before: 200, after: 100 }, alignment: AlignmentType.CENTER,
          children: [bold('Zona Escolar 004', 13, NAVY)] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
          children: [normal('Clave: 21FMS0020X', 11)] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
          children: [normal('Bachillerato General Estatal | Modalidad Escolarizada', 11)] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
          children: [normal('17 planteles | 4 municipios | 2,210 alumnos', 11)] }),
        new Paragraph({ spacing: { before: 160, after: 60 }, alignment: AlignmentType.CENTER,
          children: [bold('Supervisor:', 11), normal(' Ing. Alejandro Escamilla Martínez', 11)] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
          children: [bold('Elaborado por ATP:', 11), normal(' Ing. Samuel Cruz Interial', 11)] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
          children: [bold('Equipo ATP:', 11), normal(' Imelda Hernández García, Víctor Manuel Sáenz Cuellar, Lilia Castillo Leyva', 11)] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 },
          children: [bold('Sede:', 11), normal(' Lázaro Cárdenas, Venustiano Carranza, Puebla', 11)] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
          children: [italic('"Una supervisión cercana, crítica y transformadora al servicio de la comunidad escolar."', 11, NAVY)] }),

        pageBreak(),

        // ══════════════════════════════════════════
        // SECCIÓN 1 — DATOS GENERALES
        // ══════════════════════════════════════════
        heading1('1. DATOS GENERALES DE LA SUPERVISIÓN'),

        tableFromRows(
          ['Elemento', 'Información'],
          [
            ['Clave de la Zona Escolar', '21FMS0020X'],
            ['Nombre de la Zona Escolar', 'Zona Escolar 004'],
            ['Nombre del Supervisor', 'Ing. Alejandro Escamilla Martínez'],
            ['Entidad Federativa', 'Puebla'],
            ['Municipio sede', 'Venustiano Carranza (Lázaro Cárdenas)'],
            ['Municipios que atiende', 'Venustiano Carranza, Francisco Z. Mena, Pantepec y Jalpan'],
            ['Número de Planteles', '17'],
            ['Tipo de Subsistema', 'Bachillerato General Estatal (BGE)'],
            ['Modalidad', 'Escolarizada'],
            ['Matrícula total', `${totalT.toLocaleString()} alumnos (${totalH} H / ${totalM} M)`],
            ['Personal ATP', '4 (Ing. Samuel Cruz Interial, Imelda Hernández García,\nVíctor Manuel Sáenz Cuellar, Lilia Castillo Leyva)'],
            ['Ciclo escolar', '2026 – 2027'],
          ],
          [3000, 6500],
        ),

        pageBreak(),

        // ══════════════════════════════════════════
        // SECCIÓN 2 — PRESENTACIÓN DEL SUPERVISOR
        // ══════════════════════════════════════════
        heading1('2. PRESENTACIÓN DEL SUPERVISOR ESCOLAR'),

        p('El Ing. Alejandro Escamilla Martínez, Supervisor de la Zona Escolar 004 de Bachilleratos Generales del Estado de Puebla, es egresado de la Universidad Veracruzana, donde obtuvo el título de Ingeniero Mecánico Electricista en marzo de 1998. Su formación académica y experiencia profesional lo han consolidado como líder educativo comprometido con la mejora continua de los procesos pedagógicos.'),
        p('Desde el año 2015, mediante oficio emitido por la Subsecretaría de Educación Obligatoria y la Dirección de Bachilleratos Estatales y Preparatoria Abierta (DBEPA), se le asignó la responsabilidad de encabezar la Supervisión Escolar de la Zona 004, actualmente integrada por 17 bachilleratos generales distribuidos en cuatro municipios de la sierra norte de Puebla: Venustiano Carranza, Francisco Z. Mena, Pantepec y Jalpan.'),
        p('Bajo su liderazgo, la zona ha impulsado de manera sostenida el fortalecimiento de la función pedagógica, la formación docente, el acompañamiento técnico a directivos y la implementación de los principios de la Nueva Escuela Mexicana (NEM). El supervisor cuenta con el apoyo de cuatro Asesores Técnico Pedagógicos (ATP) que colaboran en las acciones de planeación, seguimiento y evaluación del presente Plan de Intervención Pedagógica.'),

        pageBreak(),

        // ══════════════════════════════════════════
        // SECCIÓN 3 — PROPÓSITO DEL DOCUMENTO
        // ══════════════════════════════════════════
        heading1('3. PROPÓSITO DEL DOCUMENTO'),

        p('El presente Plan de Intervención Pedagógica de Supervisión (PIPS) 2026-2027 de la Zona Escolar 004 tiene como propósito establecer una ruta estratégica y articulada de acompañamiento, seguimiento y mejora de los procesos educativos en los 17 planteles que conforman la zona escolar.'),
        p('El PIPS constituye una herramienta de gestión pedagógica que orienta las acciones de la supervisión hacia la atención de problemáticas detectadas mediante el diagnóstico realizado a partir de los Planes de Mejora Continua (PMC) y los Programas Aula, Escuela y Comunidad (PAEC) de cada plantel. Su elaboración responde al mandato de la Dirección de Bachilleratos Estatales y Preparatoria Abierta (DBEPA) en el marco del Plan Anual de Trabajo ciclo 2026-2027.'),
        p('Las acciones contenidas en este plan se diseñaron con base en tres ejes prioritarios identificados en el ciclo anterior: (1) la calidad técnico-pedagógica de la planeación didáctica y los documentos PAEC-PEC, (2) el fortalecimiento de la función directiva y la gestión escolar, y (3) la atención a la deserción escolar y el rezago académico en los planteles de menor matrícula.'),

        pageBreak(),

        // ══════════════════════════════════════════
        // SECCIÓN 4 — ALINEACIÓN NEM Y NORMATIVA
        // ══════════════════════════════════════════
        heading1('4. ALINEACIÓN CON LA NUEVA ESCUELA MEXICANA Y FUNDAMENTACIÓN NORMATIVA'),

        heading2('4.1 Alineación con la Nueva Escuela Mexicana (NEM)'),
        p('El presente PIPS se fundamenta en los principios filosóficos, pedagógicos y éticos de la Nueva Escuela Mexicana (NEM), que orienta la educación media superior hacia una formación humanista, crítica e integral, centrada en el desarrollo pleno de los estudiantes como ciudadanos capaces de transformar su realidad. En congruencia con estos principios, las acciones de supervisión priorizan:'),
        bullet('La educación como derecho universal, con énfasis en equidad, inclusión y excelencia educativa para todos los estudiantes de la zona, independientemente de su contexto socioeconómico.'),
        bullet('El rol transformador de la supervisión como agente de cambio pedagógico, garante de condiciones adecuadas de enseñanza y aprendizaje.'),
        bullet('La corresponsabilidad de la comunidad escolar (supervisores, directivos, docentes, estudiantes, padres de familia) en la mejora continua.'),
        bullet('La contextualización curricular mediante el Marco Curricular Común de la Educación Media Superior (MCCEMS) y su implementación a través del Programa Aula, Escuela y Comunidad (PAEC).'),

        heading2('4.2 Fundamentación Normativa'),
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

        // ══════════════════════════════════════════
        // SECCIÓN 5 — REFLEXIÓN PIPS 2025-2026
        // ══════════════════════════════════════════
        heading1('5. REFLEXIÓN DEL PIPS 2025-2026'),

        heading2('5.1 Descripción del PIPS anterior'),
        p('Durante el ciclo escolar 2025-2026, la Zona Escolar 004 elaboró su Plan de Intervención Pedagógica de Supervisión y lo entregó a la DBEPA en el periodo establecido (octubre 2025). El plan abordó tres problemáticas centrales: (1) la calidad de la planeación didáctica, (2) la articulación de los documentos PAEC-PEC con el currículo, y (3) el fortalecimiento del liderazgo directivo.'),
        p('Las acciones implementadas incluyeron sesiones de capacitación para el uso del formato PAEC-PEC 2.ª edición, revisión técnica de las planeaciones didácticas en tres momentos por semestre, acompañamiento técnico-pedagógico a 17 planteles y la integración de retroalimentaciones escritas a cada director.'),

        heading2('5.2 Fortalezas identificadas del ciclo 2025-2026'),
        bullet('La totalidad de los 17 planteles entregaron su documento PAEC-PEC en ambos semestres del ciclo escolar, demostrando compromiso institucional con los procesos formativos.'),
        bullet('Se consolidó un sistema de revisión técnica de planeaciones didácticas en tres momentos de evaluación por semestre, con retroalimentación escrita individualizada por plantel.'),
        bullet('Los planteles de mayor matrícula (José Vasconcelos, Alfonso de la Madrid, Mecapalapa) presentaron documentos PAEC-PEC con diagnósticos comunitarios robustos, uso de metodología FODA y vinculación inicial con el MCCEMS.'),
        bullet('El equipo de 4 ATPs logró cubrir la totalidad de la zona con visitas técnicas, siendo la primera ocasión en que se realizó un seguimiento sistemático a todos los planteles durante un mismo ciclo escolar.'),
        bullet('Se elaboró y entregó la primera versión del PIPS de la zona, cumpliendo con el requisito normativo de la DBEPA.'),

        heading2('5.3 Áreas de oportunidad detectadas del ciclo 2025-2026'),
        bullet('La alineación curricular en los documentos PAEC-PEC presentó errores en el 64.7% de los planteles revisados: confusión entre "Propósitos Formativos" (1.º-2.º semestre) y "Progresiones de Aprendizaje" (3.º-6.º semestre), así como uso de UAC que no corresponden al semestre indicado.'),
        bullet('El Comité del Plantel en los documentos PAEC-PEC fue incompleto en el 47.1% de los casos: se omitieron las figuras obligatorias de estudiantes y padres de familia como integrantes formales.'),
        bullet('El Plan Operativo de los PAEC-PEC describía actividades desde una perspectiva administrativa (reuniones, oficios), sin detallar la estrategia didáctica específica del alumno, limitando la calidad pedagógica del documento.'),
        bullet('Tres planteles (Emiliano Zapata, Benito Juárez García, Diego Rivera) presentaron documentos con deficiencias estructurales graves (ausencia de diagnóstico, congruencia débil entre problemática y proyecto).'),
        bullet('El PIPS 2025-2026 de la zona quedó incompleto en la sección de diagnóstico (datos de indicadores en blanco) y careció de metas medibles con indicadores específicos por objetivo.'),
        bullet('No se recibió retroalimentación formal de la DBEPA sobre el PIPS entregado, lo que limitó el ajuste y mejora del plan durante el ciclo.'),

        heading2('5.4 Compromisos de mejora para 2026-2027'),
        bullet('Fortalecer la formación de directivos y docentes en el uso técnico-correcto del MCCEMS para la elaboración del PAEC-PEC 2026-2027.'),
        bullet('Establecer metas con indicadores cuantitativos medibles para cada objetivo del PIPS 2026-2027.'),
        bullet('Elaborar un PIPS 2026-2027 con diagnóstico basado en datos reales, objetivos alcanzables y cronograma articulado al Plan Anual de Trabajo DBEPA.'),
        bullet('Diseñar y aplicar instrumentos formales (listas de cotejo, rúbricas) para el seguimiento y evaluación de las acciones del PIPS.'),

        pageBreak(),

        // ══════════════════════════════════════════
        // SECCIÓN 6 — DIAGNÓSTICO 2026-2027
        // ══════════════════════════════════════════
        heading1('6. DIAGNÓSTICO DE LA ZONA ESCOLAR 2026-2027'),

        heading2('6.1 Contexto geográfico y socioeducativo'),
        p('La Zona Escolar 004 de Bachilleratos Generales atiende a comunidades ubicadas en la sierra norte de Puebla, en cuatro municipios: Venustiano Carranza, Francisco Z. Mena, Pantepec y Jalpan. Se trata de una región predominantemente rural, con presencia de comunidades totonacas y mestizas, altos índices de marginación social y económica, y condiciones geográficas que dificultan el acceso regular de estudiantes y docentes a los planteles.'),
        p('La economía de la región se sustenta principalmente en actividades agrícolas y ganaderas a pequeña escala, comercio informal y, en los centros urbanos más grandes como Lázaro Cárdenas, en servicios y pequeñas empresas. La migración laboral hacia ciudades como Ciudad de México, Poza Rica y el norte del país representa una causa importante de deserción escolar, particularmente en los grados superiores.'),
        p('Las comunidades de la sierra norte presentan características que impactan directamente en los procesos educativos: baja escolaridad promedio de los padres de familia, presencia de violencia intrafamiliar y de género, problemáticas relacionadas con el consumo de sustancias en jóvenes, y limitaciones de conectividad e infraestructura tecnológica en planteles rurales.'),

        heading2('6.2 Matrícula y estadística de la zona'),

        tableFromRows(
          ['No.', 'CCT', 'Plantel', 'Localidad', 'Municipio', 'H', 'M', 'Total'],
          planteles.map(p => [
            String(p.no), p.cct, p.nombre, p.localidad, p.municipio,
            String(p.h), String(p.m), String(p.t)
          ]),
          [400, 1400, 2000, 1200, 1400, 400, 400, 500],
        ),

        p(''),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { before: 60 },
          children: [bold(`TOTAL ZONA: ${totalH} hombres + ${totalM} mujeres = ${totalT} alumnos`, 11, NAVY)],
        }),

        heading2('6.3 Personal de la zona escolar'),
        p('La Zona Escolar 004 cuenta con un total de 137 trabajadores distribuidos en los 17 planteles, de los cuales 17 son Responsables de Plantel (directivos), 96 son docentes, 23 son personal administrativo y 1 corresponde a personal de apoyo técnico. Esta distribución refleja una plantilla docente ajustada a las necesidades de planteles pequeños, aunque varios bachilleratos operan con número reducido de docentes en relación con su matrícula.'),

        tableFromRows(
          ['Categoría', 'No. de personas'],
          [
            ['Responsables de Plantel (Directivos)', '17'],
            ['Docentes', '96'],
            ['Personal Administrativo', '23'],
            ['Personal de Apoyo', '1'],
            ['Con permiso sin goce de sueldo', '2'],
            ['TOTAL', '139'],
          ],
          [5000, 4500],
        ),

        heading2('6.4 Problemáticas pedagógicas detectadas en el ciclo 2025-2026'),
        p('El diagnóstico se construyó a partir del análisis sistemático de los documentos PAEC-PEC 2025-2026 de los 17 planteles, las revisiones técnicas realizadas por el equipo ATP, las visitas de supervisión administrativa y la observación directa de los procesos pedagógicos en los planteles. Se identificaron las siguientes problemáticas comunes, ordenadas por frecuencia e impacto:'),

        heading3('Problemática 1 (Alta prioridad): Errores de alineación curricular en los documentos PAEC-PEC'),
        p('El 64.7% de los planteles (11 de 17) presentaron errores técnicos en la alineación curricular de sus documentos PAEC-PEC 2025-2026. Los errores más frecuentes fueron: (a) uso de "Progresiones de Aprendizaje" para asignaturas de 1.º y 2.º semestre, donde la normativa MCCEMS 2025 establece el uso de "Propósitos Formativos"; (b) vinculación de UAC a semestres incorrectos (ej. Química en 3.º semestre o Ecosistemas en 5.º); y (c) estrategias didácticas con descripción administrativa en lugar de pedagógica.'),
        p('Planteles con errores críticos: Emiliano Zapata, Benito Juárez García, Diego Rivera, Alfonso de la Madrid, Mecapalapa, entre otros.'),

        heading3('Problemática 2 (Alta prioridad): Integración incompleta del Comité del Plantel en el PAEC-PEC'),
        p('El 47.1% de los planteles (8 de 17) no evidenciaron la conformación formal del Comité del Plantel con las figuras mínimas obligatorias requeridas por la rúbrica PAEC-PEC 2025: Responsable de Plantel, 2 docentes, 2 estudiantes y 1 padre/madre de familia. En la mayoría de los casos, la figura de estudiantes y padres de familia estuvo ausente del comité documentado.'),

        heading3('Problemática 3 (Media-alta prioridad): Bajo aprovechamiento académico y rezago en habilidades básicas'),
        p('Los diagnósticos comunitarios de los planteles identifican de forma recurrente el bajo aprovechamiento académico como problemática central, especialmente en áreas de pensamiento matemático y comunicación. Planteles como Mecapalapa (232 alumnos), José Vasconcelos (485 alumnos) y Alfonso de la Madrid (223 alumnos) reportaron indicadores de deserción de 10 a 30% y dificultades en comprensión lectora y resolución de problemas lógico-matemáticos.'),

        heading3('Problemática 4 (Media prioridad): Deserción escolar asociada a factores socioeconómicos'),
        p('Los planteles de la zona reportaron factores de riesgo asociados a la deserción escolar: migración familiar y laboral (particularmente en municipios de Jalpan y Pantepec), trabajo infantil y juvenil, embarazo adolescente, consumo de sustancias (detectado en José Vasconcelos y Moisés Sáenz), y condiciones de violencia intrafamiliar. Planteles pequeños como Benito Juárez García (26 alumnos), Luis Donaldo Colosio (35 alumnos) y Vicente Suárez Ferrer (50 alumnos) son especialmente vulnerables a la pérdida de matrícula.'),

        heading3('Problemática 5 (Media prioridad): Insuficiencia de personal docente y perfiles fuera de área'),
        p('Al menos 5 planteles de la zona operan con plantillas docentes reducidas, donde un mismo docente atiende varias UAC fuera de su perfil de formación. Esta situación afecta la calidad pedagógica, incrementa la carga administrativa y dificulta la elaboración de planeaciones didácticas de calidad. La Zona 004 tiene 96 docentes para 2,210 alumnos (ratio de 1:23 aprox.), pero la distribución desigual genera cargas asimétricas entre planteles grandes y pequeños.'),

        heading3('Problemática 6 (Media prioridad): Limitaciones de infraestructura y conectividad'),
        p('La mayoría de los planteles en municipios de Jalpan y Pantepec operan con infraestructura básica, sin acceso estable a internet, con equipos tecnológicos insuficientes o inexistentes, y algunos sin instalaciones propias. Esta situación limita la implementación plena de las estrategias pedagógicas del MCCEMS que dependen de herramientas digitales.'),

        pageBreak(),

        // ══════════════════════════════════════════
        // SECCIÓN 7 — OBJETIVOS Y METAS
        // ══════════════════════════════════════════
        heading1('7. OBJETIVOS Y METAS DEL PIPS 2026-2027'),

        heading2('7.1 Objetivo General'),
        p('Fortalecer la calidad pedagógica de los 17 planteles de la Zona Escolar 004 mediante el acompañamiento técnico-pedagógico sistemático, la formación continua de directivos y docentes en el MCCEMS, y el seguimiento oportuno a indicadores de permanencia escolar, con el propósito de garantizar el derecho de los 2,210 estudiantes a una educación media superior integral, inclusiva y de excelencia, alineada a los principios de la Nueva Escuela Mexicana.'),

        heading2('7.2 Objetivos Específicos y Metas'),

        heading3('Objetivo 1: Mejorar la calidad técnico-pedagógica de los documentos PAEC-PEC 2026-2027'),
        tableFromRows(
          ['Meta', 'Indicador', 'Responsable', 'Fecha de verificación'],
          [
            ['Lograr que el 90% de los planteles presenten el PAEC-PEC con alineación curricular correcta (Propósitos/Progresiones según semestre)', '% de documentos sin errores de alineación', 'Supervisor + ATP', 'Octubre 2026 y Febrero 2027'],
            ['Lograr que el 100% de los planteles evidencien la conformación del Comité con las 5 figuras obligatorias (director, 2 docentes, 2 estudiantes, 1 padre)', '% de comités completos documentados', 'ATP', 'Octubre 2026'],
            ['Lograr que el 85% de los planes operativos PAEC-PEC describan estrategias didácticas específicas (no solo administrativas)', '% de planes con estrategia pedagógica detallada', 'ATP', 'Noviembre 2026 y Marzo 2027'],
          ],
          [3500, 2500, 1800, 1700],
        ),

        heading3('Objetivo 2: Fortalecer la función directiva y el liderazgo pedagógico en los planteles'),
        tableFromRows(
          ['Meta', 'Indicador', 'Responsable', 'Fecha de verificación'],
          [
            ['Capacitar al 100% de los 17 directivos en el uso del MCCEMS 2025 y el nuevo formato PAEC-PEC 2026', 'Lista de asistencia a capacitación', 'Supervisor', 'Agosto 2026'],
            ['Lograr que el 100% de los directivos entreguen el PMC con datos actualizados y diagnóstico basado en indicadores reales', '% de PMC con indicadores verificables', 'Supervisor + ATP', 'Septiembre 2026'],
            ['Realizar al menos 2 visitas de acompañamiento pedagógico por plantel durante el ciclo 2026-2027', 'Bitácora de visitas y actas de retroalimentación', 'Supervisor + ATP', 'Junio 2027'],
          ],
          [3500, 2500, 1800, 1700],
        ),

        heading3('Objetivo 3: Reducir la deserción escolar y mejorar el aprovechamiento académico'),
        tableFromRows(
          ['Meta', 'Indicador', 'Responsable', 'Fecha de verificación'],
          [
            ['Reducir la deserción escolar de la zona en al menos un 5% respecto al ciclo 2025-2026', 'Variación en matrícula inicio vs. fin de ciclo (Forma 911)', 'Directivos + Supervisor', 'Julio 2027'],
            ['Lograr que el 80% de los estudiantes en riesgo académico detectados en diagnóstico inicial reciban tutoría de seguimiento', '% de estudiantes con programa de tutoría activo', 'Docentes + Directivos', 'Corte 1, 2 y 3'],
            ['Implementar al menos 1 proyecto de lectura y matemáticas en los 5 planteles con mayor rezago académico', '% de planteles prioritarios con proyecto implementado', 'ATP', 'Enero 2027'],
          ],
          [3500, 2500, 1800, 1700],
        ),

        heading3('Objetivo 4: Promover el uso de metodologías activas y la planeación didáctica contextualizada'),
        tableFromRows(
          ['Meta', 'Indicador', 'Responsable', 'Fecha de verificación'],
          [
            ['Lograr que el 90% de los docentes entreguen sus planeaciones didácticas en los 3 momentos de evaluación de cada semestre', '% de docentes con planeación entregada y validada', 'ATP', 'Cada corte semestral'],
            ['Lograr que el 80% de las planeaciones revisadas incorporen al menos 1 metodología activa (ABP, casos, simulación)', '% de planeaciones con metodología activa documentada', 'ATP', 'Cada revisión semestral'],
            ['Realizar 2 sesiones de formación docente en metodologías activas y MCCEMS durante el ciclo', 'Listas de asistencia y productos de formación', 'Supervisor + ATP', 'Semestres A y B'],
          ],
          [3500, 2500, 1800, 1700],
        ),

        pageBreak(),

        // ══════════════════════════════════════════
        // SECCIÓN 8 — CRONOGRAMA
        // ══════════════════════════════════════════
        heading1('8. CRONOGRAMA DE IMPLEMENTACIÓN 2026-2027'),

        p('Las acciones se organizan en dos semestres (A: agosto-enero, B: febrero-julio), alineadas al Plan Anual de Trabajo DBEPA 2026-2027. Las fechas de entrega obligatoria se integran en el cronograma:'),
        bullet('Entrega del PIPS a DBEPA: Del 6 al 10 de octubre de 2026'),
        bullet('Avance del PIPS: Del 9 al 13 de febrero de 2027'),
        bullet('Reporte de resultados del PIP: Del 29 de junio al 2 de julio de 2027'),
        bullet('Reporte final del PIPS: Del 12 al 15 de julio de 2027'),

        new Paragraph({ spacing: { before: 120, after: 60 }, children: [bold('SEMESTRE A (Agosto 2026 – Enero 2027)', 11, NAVY)] }),
        tableFromRows(
          ['Actividad', 'Objetivo que atiende', 'Responsable', 'Mes', 'Recursos', 'Indicador'],
          [
            ['Reunión de instalación de Comités PAEC-PEC 2026', 'Obj. 1', 'Supervisor+ATP', 'Ago 2026', 'Guía PAEC 2.ª ed.', '100% comités instalados'],
            ['Capacitación a directivos: MCCEMS 2025 y PAEC-PEC 2026', 'Obj. 1 y 2', 'Supervisor+ATP', 'Ago 2026', 'MCCEMS, cañón, laptop', '17 directivos capacitados'],
            ['Entrega cronograma visitas administrativas', 'Obj. 2', 'Supervisor', 'Ago 2026', 'Formato DBEPA', 'Acuse de recibido'],
            ['Revisión 1.ª PAEC-PEC (fase planeación)', 'Obj. 1', 'ATP', 'Sep-Oct 2026', 'Rúbrica PAEC 2025', '100% planteles revisados'],
            ['Entrega del PIPS 2026-2027 a DBEPA', 'Todos', 'Supervisor', '6-10 Oct 2026', 'PIPS digital', 'Acuse DBEPA'],
            ['1.er informe visita administrativa', 'Obj. 2', 'Supervisor', 'Oct 2026', 'Formato DBEPA', 'Acuse recibido'],
            ['Taller de formación docente: Metodologías activas', 'Obj. 4', 'ATP', 'Oct-Nov 2026', 'Guías NEM, laptop', '80% docentes asistentes'],
            ['Revisión planeaciones didácticas (1.er corte)', 'Obj. 4', 'ATP', 'Oct-Nov 2026', 'Lista de cotejo', '% planeaciones validadas'],
            ['Entrega evidencias cultura de paz / socioemocional', 'Apoyo', 'Supervisor', '17 Oct 2026', 'Formulario DBEPA', 'Evidencia enviada'],
            ['Seguimiento a casos de riesgo de deserción', 'Obj. 3', 'Directivos+ATP', 'Nov-Dic 2026', 'Expedientes alumnos', 'Nº de alumnos recuperados'],
            ['Revisión 2.ª PAEC-PEC (fase implementación)', 'Obj. 1', 'ATP', 'Nov-Dic 2026', 'Rúbrica PAEC 2025', '% avance documentos'],
            ['Presentación de proyectos PEC (Sem. A)', 'Obj. 1', 'Supervisor+ATP', 'Dic-Ene 2027', 'Guía evaluación PEC', '100% planteles presentan'],
          ],
          [2500, 1300, 1400, 1000, 1600, 1700],
        ),

        new Paragraph({ spacing: { before: 120, after: 60 }, children: [bold('SEMESTRE B (Febrero 2027 – Julio 2027)', 11, NAVY)] }),
        tableFromRows(
          ['Actividad', 'Objetivo que atiende', 'Responsable', 'Mes', 'Recursos', 'Indicador'],
          [
            ['Entrega avance del PIPS a DBEPA', 'Todos', 'Supervisor', '9-13 Feb 2027', 'PIPS digital', 'Acuse DBEPA'],
            ['Taller 2: Evaluación formativa y rúbricas', 'Obj. 4', 'ATP', 'Feb 2027', 'Rúbricas, laptop', '% docentes que aplican rúbricas'],
            ['2.º informe visita administrativa', 'Obj. 2', 'Supervisor', 'Ene-Feb 2027', 'Formato DBEPA', 'Acuse recibido'],
            ['Revisión planeaciones 2.º corte + retroalimentación', 'Obj. 4', 'ATP', 'Mar 2027', 'Lista de cotejo', '% planeaciones mejoradas'],
            ['Seguimiento proyecto lectura y matemáticas', 'Obj. 3', 'ATP', 'Mar-Abr 2027', 'Material didáctico', '% planteles con proyecto activo'],
            ['3.er informe visita administrativa', 'Obj. 2', 'Supervisor', 'Abr 2027', 'Formato DBEPA', 'Acuse recibido'],
            ['Revisión 3.ª PAEC-PEC (fase difusión y evaluación)', 'Obj. 1', 'ATP', 'May 2027', 'Rúbrica PAEC 2025', '% documentos completados'],
            ['Entrega evidencias socioemocionales (3.ª)', 'Apoyo', 'Supervisor', 'May-Jun 2027', 'Formulario DBEPA', 'Evidencia enviada'],
            ['Encuentro académico de directivos y ATPs', 'Obj. 2', 'Supervisor', 'May 2027', 'Salón, presentaciones', 'Acta de sesión'],
            ['Presentación de proyectos PEC (Sem. B)', 'Obj. 1', 'Supervisor+ATP', 'Jun 2027', 'Guía evaluación PEC', '100% planteles presentan'],
            ['4.º informe visita administrativa', 'Obj. 2', 'Supervisor', 'Jun 2027', 'Formato DBEPA', 'Acuse recibido'],
            ['Reporte de resultados del PIP a DBEPA', 'Todos', 'Supervisor', '29 Jun-2 Jul 2027', 'Formulario DBEPA', 'Entrega confirmada'],
            ['Análisis de indicadores finales y elaboración reporte final PIPS', 'Todos', 'Supervisor+ATP', 'Jul 2027', 'Datos zona, bitácora', 'Reporte final elaborado'],
            ['Entrega reporte final PIPS a DBEPA', 'Todos', 'Supervisor', '12-15 Jul 2027', 'PIPS digital', 'Acuse DBEPA'],
          ],
          [2500, 1300, 1400, 1000, 1600, 1700],
        ),

        pageBreak(),

        // ══════════════════════════════════════════
        // SECCIÓN 9 — MÉTODOS DE SEGUIMIENTO
        // ══════════════════════════════════════════
        heading1('9. MÉTODOS DE SEGUIMIENTO Y OBSERVACIÓN DEL CAMBIO'),

        heading2('9.1 Fuentes de información'),
        p('Para el seguimiento y evaluación de las acciones del PIPS se utilizarán las siguientes fuentes de información, buscando la triangulación de perspectivas:'),
        bullet('Documentos PAEC-PEC de cada plantel (revisiones en 3 momentos por semestre)'),
        bullet('Planeaciones didácticas y secuencias de aprendizaje de los docentes'),
        bullet('Bitácora del supervisor y de los ATPs (registros cualitativos de visitas)'),
        bullet('Informes de visita administrativa (4 por ciclo escolar)'),
        bullet('Actas y productos de los Consejos Académicos de Planteles (CAPEMS)'),
        bullet('Cuestionarios de percepción a directivos y docentes'),
        bullet('Datos estadísticos de matrícula, asistencia y aprovechamiento (Forma 911)'),
        bullet('Productos de los talleres y capacitaciones (listas de asistencia, trabajos)'),

        heading2('9.2 Instrumentos de recolección'),
        tableFromRows(
          ['Instrumento', 'Uso', 'Frecuencia', 'Responsable'],
          [
            ['Bitácora del supervisor/ATP', 'Registro cualitativo de observaciones por plantel', 'Continua (cada visita)', 'Supervisor + ATPs'],
            ['Lista de cotejo PAEC-PEC', 'Revisión técnica de documentos PAEC', '3 momentos/semestre', 'ATPs'],
            ['Lista de cotejo de planeaciones', 'Verificación de planeaciones didácticas', '3 cortes/semestre', 'ATPs'],
            ['Cuestionario a directivos', 'Percepción de avance y necesidades por plantel', 'Inicio y fin de ciclo', 'Supervisor'],
            ['Guía de observación de clase', 'Evaluación de la práctica docente in situ', 'Al menos 1/plantel/ciclo', 'Supervisor + ATPs'],
            ['Rúbrica de presentación PEC', 'Evaluación del proyecto escolar comunitario', 'Al fin de cada semestre', 'Supervisor + ATPs'],
            ['Registro de matrícula', 'Control de altas, bajas y permanencia', 'Mensual', 'Directivos'],
          ],
          [2200, 2500, 1800, 1500],
        ),

        heading2('9.3 Análisis de la información'),
        p('La información recabada se analizará con un enfoque mixto: (a) análisis cuantitativo de porcentajes de cumplimiento de metas, asistencia a capacitaciones, y variación de indicadores académicos; y (b) análisis cualitativo de las bitácoras de visita, productos de reflexión docente y actas de directivos. Los resultados serán socializados en reunión mensual del equipo de supervisión y retroalimentados a cada plantel de forma individual.'),

        pageBreak(),

        // ══════════════════════════════════════════
        // SECCIÓN 10 — RECURSOS
        // ══════════════════════════════════════════
        heading1('10. RECURSOS'),

        tableFromRows(
          ['Tipo de recurso', 'Descripción'],
          [
            ['Humanos', 'Supervisor escolar, 4 ATPs, 17 directivos, 96 docentes, personal de apoyo institucional (DBEPA)'],
            ['Materiales impresos', 'Guía PAEC 2.ª edición, MCCEMS 2025, lineamientos DBEPA, rúbricas, listas de cotejo, formatos de visita'],
            ['Tecnológicos', 'Laptops del equipo ATP, proyector para capacitaciones, correo institucional, Google Drive para respaldo de documentos'],
            ['Plataformas', 'Formularios Office 365 (DBEPA), Google Forms, plataforma DidácticaIA (planeaciones y revisión de PAEC-PMC)'],
            ['Infraestructura', 'Sede de la supervisión (Lázaro Cárdenas), instalaciones de planteles para capacitaciones, transporte para visitas'],
            ['Apoyo externo', 'Programas federales (Beca Benito Juárez), municipios, organizaciones comunitarias, IMSS/ISSSTE (salud)'],
          ],
          [2500, 7000],
        ),

        pageBreak(),

        // ══════════════════════════════════════════
        // SECCIÓN 11 — EVALUACIÓN DEL PLAN
        // ══════════════════════════════════════════
        heading1('11. EVALUACIÓN DEL PLAN'),

        heading2('11.1 Indicadores de éxito por objetivo'),
        tableFromRows(
          ['Objetivo', 'Indicador de éxito', 'Meta cuantitativa', 'Instrumento'],
          [
            ['Obj. 1 — Calidad PAEC-PEC', '% de documentos sin errores de alineación curricular', '≥ 90% de planteles', 'Lista de cotejo PAEC'],
            ['Obj. 1 — Comités', '% de comités con las 5 figuras obligatorias', '100% de planteles', 'Revisión documental'],
            ['Obj. 2 — Directivos', '% de directivos capacitados en MCCEMS/PAEC', '100%', 'Lista de asistencia'],
            ['Obj. 2 — Visitas', 'No. de visitas realizadas vs. planeadas por plantel', '≥ 2/plantel/ciclo', 'Bitácora + informes'],
            ['Obj. 3 — Deserción', 'Variación % matrícula inicio vs. fin de ciclo', 'Reducción ≥ 5%', 'Forma 911'],
            ['Obj. 3 — Tutorías', '% de alumnos en riesgo con plan de tutoría activo', '≥ 80%', 'Expedientes alumnos'],
            ['Obj. 4 — Planeaciones', '% de docentes con planeación validada por corte', '≥ 90%', 'Lista de cotejo'],
            ['Obj. 4 — Met. activas', '% de planeaciones con metodología activa', '≥ 80%', 'Rúbrica de planeación'],
          ],
          [2000, 2500, 1500, 2000],
        ),

        heading2('11.2 Herramientas de evaluación del plan'),
        bullet('Reportes trimestrales de avance elaborados por el equipo ATP'),
        bullet('Revisión colegiada con directivos en encuentro académico semestral'),
        bullet('Comparación de diagnóstico inicial vs. indicadores de cierre de ciclo'),
        bullet('Encuestas de percepción a docentes y directivos al inicio y fin de ciclo'),
        bullet('Evaluación de los productos de las capacitaciones y talleres'),
        bullet('Análisis comparativo de documentos PAEC-PEC del ciclo anterior vs. actual'),

        pageBreak(),

        // ══════════════════════════════════════════
        // SECCIÓN 12 — EVIDENCIAS Y CIERRE
        // ══════════════════════════════════════════
        heading1('12. EVIDENCIAS ESPERADAS DEL PLAN'),

        tableFromRows(
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
          [2000, 4000, 3500],
        ),

        pageBreak(),

        // ══════════════════════════════════════════
        // SECCIÓN 13 — REFERENCIAS
        // ══════════════════════════════════════════
        heading1('13. REFERENCIAS'),

        p('Las siguientes referencias se presentan conforme al formato APA 7.ª edición:'),
        new Paragraph({ spacing: { before: 100, after: 40 }, children: [normal('Secretaría de Educación Pública. (2022). Marco Curricular Común de la Educación Media Superior. SEP. https://www.gob.mx/sep', 11)], indent: { left: 720, hanging: 720 } }),
        new Paragraph({ spacing: { before: 40, after: 40 }, children: [normal('Secretaría de Educación Pública. (2025). Programa Aula, Escuela y Comunidad (PAEC) — 2.ª Edición. SEP-SEMS. https://educacionmediasuperior.sep.gob.mx', 11)], indent: { left: 720, hanging: 720 } }),
        new Paragraph({ spacing: { before: 40, after: 40 }, children: [normal('Dirección de Bachilleratos Estatales y Preparatoria Abierta. (2025). Guía para la elaboración del Plan de Intervención Pedagógica de Supervisión Escolar ciclo escolar 2025-2026. SEP Puebla.', 11)], indent: { left: 720, hanging: 720 } }),
        new Paragraph({ spacing: { before: 40, after: 40 }, children: [normal('Dirección de Bachilleratos Estatales y Preparatoria Abierta. (2026). Plan Anual de Trabajo ciclo escolar 2026-2027. SEP Puebla.', 11)], indent: { left: 720, hanging: 720 } }),
        new Paragraph({ spacing: { before: 40, after: 40 }, children: [normal('INEGI. (2020). Censo de Población y Vivienda 2020. Instituto Nacional de Estadística y Geografía. https://www.inegi.org.mx', 11)], indent: { left: 720, hanging: 720 } }),
        new Paragraph({ spacing: { before: 40, after: 40 }, children: [normal('CONEVAL. (2020). Medición de la pobreza municipal en México 2020. Consejo Nacional de Evaluación de la Política de Desarrollo Social. https://www.coneval.org.mx', 11)], indent: { left: 720, hanging: 720 } }),
        new Paragraph({ spacing: { before: 40, after: 40 }, children: [normal('Subsecretaría de Educación Obligatoria. (2022). Ley General de Educación. Diario Oficial de la Federación. https://www.dof.gob.mx', 11)], indent: { left: 720, hanging: 720 } }),
        new Paragraph({ spacing: { before: 300 } }),
        
        // FIRMAS
        heading1('14. VALIDACIÓN Y FIRMAS'),
        new Paragraph({ spacing: { before: 200 } }),

        tableFromRows(
          ['Elaboró', 'Revisó', 'Autorizó'],
          [
            ['\n\n\n\n_________________________________\nIng. Samuel Cruz Interial\nA.T.P. Zona Escolar 004\n21FMS0020X',
             '\n\n\n\n_________________________________\nIng. Alejandro Escamilla Martínez\nSupervisor Zona Escolar 004\n21FMS0020X',
             '\n\n\n\n_________________________________\nDirección de Bachilleratos Estatales\ny Preparatoria Abierta (DBEPA)\nSecretaría de Educación Puebla'],
          ],
          [3000, 3200, 3300],
        ),

      ],
    },
  ],
});

// ─── GUARDAR ──────────────────────────────────────────────────────────────────
const buf = await Packer.toBuffer(doc);
fs.writeFileSync(outPath, buf);
console.log(`\n✅ PIPS generado: ${outPath}`);
console.log(`   Tamaño: ${(buf.length / 1024).toFixed(1)} KB\n`);
