/**
 * exportador.ts — Motor de Exportación Oficial Rediseñado
 * DidactecaIA · Bachilleratos Generales · Puebla, México (Zona Escolar 004)
 *
 * Formatos soportados:
 * 1. PDF Oficial (jsPDF + autoTable) — Landscape A4, membrete institucional, firmas de 3 columnas.
 * 2. Word Editable (.docx) — Portrait A4, tablas editables, paleta pastel institucional.
 * 3. Excel Estilizado (.xlsx) — ExcelJS con celdas pastel, congelación de paneles y membrete.
 * 4. Imagen WhatsApp / Redes Sociales (html-to-image) — Formato Cuadrado (1:1) o Story (9:16) con estética Neón.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { toPng } from "html-to-image";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  AlignmentType,
  ShadingType,
  BorderStyle
} from "docx";
import { getSubjectColors } from "./subject-colors";

export interface FilaExportacion {
  encabezado: string;
  subtitulo?: string;
  celdas: {
    [diaPeriodo: string]: {
      materia: string;
      docente?: string;
      grupo?: string;
      aula?: string;
      colorBg?: string;
    } | string;
  };
}

export interface DatosExportacionHorario {
  nombreEscuela: string;
  cct: string;
  zonaEscolar?: string;
  cicloEscolar?: string;
  tipoVista: "GRUPO" | "DOCENTE" | "AULA" | "SUMARIO" | "PAQUETE_DOCENTES" | "PAQUETE_GRUPOS";
  tituloTabla: string;
  dias: string[];
  periodos: string[];
  filas: FilaExportacion[];
}

export interface DatosSumario {
  nombreEscuela: string;
  cct: string;
  dias: string[];
  numHorasPorDia: number;
  entidades: {
    id: string;
    etiqueta: string;
  }[];
  obtenerCelda: (entidadId: string, dia: number, periodo: number) => { texto: string } | null;
}

// Helpers de Color Hex a RGB para jsPDF
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return [r, g, b];
}

// Helper para compatibilidad de hash color
export function getHashColor(texto: string): string {
  return getSubjectColors(texto).pastelBgHex;
}

// =========================================================================
// 1. EXPORTACIÓN A PDF OFICIAL FORMAL (Landscape A4)
// =========================================================================
export function exportarHorarioPDF(datos: DatosExportacionHorario) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  const totalFilas = datos.filas.length;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const NAVY_RGB: [number, number, number] = [30, 58, 138]; // #1E3A8A
  const GOLD_RGB: [number, number, number] = [201, 162, 39]; // #C9A227
  const BORDER_RGB: [number, number, number] = [226, 232, 240]; // #E2E8F0

  datos.filas.forEach((fila, idxFila) => {
    if (idxFila > 0) {
      doc.addPage();
    }

    // ── 1. Membrete Institucional Oficial Zona 004 ──
    // Placeholders de Escudos Oficiales (Puebla y SEP)
    doc.setDrawColor(...BORDER_RGB);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 8, 18, 18, 2, 2, "FD");
    doc.roundedRect(pageWidth - 32, 8, 18, 18, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text("SEP", 23, 18, { align: "center" });
    doc.text("PUEBLA", pageWidth - 23, 18, { align: "center" });

    // Jerarquía de Texto Oficial Centrado
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY_RGB);
    doc.setFontSize(10.5);
    doc.text("GOBIERNO DEL ESTADO DE PUEBLA", pageWidth / 2, 11, { align: "center" });

    doc.setFontSize(8.5);
    doc.text("SECRETARÍA DE EDUCACIÓN PÚBLICA", pageWidth / 2, 15.5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(7.5);
    doc.text("SUBSECRETARÍA DE EDUCACIÓN MEDIA SUPERIOR Y SUPERIOR", pageWidth / 2, 19.5, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.text("DIRECCIÓN DE BACHILLERATOS GENERALES", pageWidth / 2, 23.5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.text(`SUPERVISIÓN ESCOLAR ZONA ${datos.zonaEscolar || "004"}`, pageWidth / 2, 27, { align: "center" });

    // ── 2. Doble Línea Institucional (Azul Marino 1.2pt + Dorado 0.4pt) ──
    doc.setDrawColor(...NAVY_RGB);
    doc.setLineWidth(1.0);
    doc.line(14, 30, pageWidth - 14, 30);
    doc.setDrawColor(...GOLD_RGB);
    doc.setLineWidth(0.4);
    doc.line(14, 31.5, pageWidth - 14, 31.5);

    // ── 3. Banda de Título Oficial ──
    doc.setFillColor(...NAVY_RGB);
    doc.rect(14, 34, pageWidth - 28, 7.5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`HORARIO OFICIAL DE CLASES — CICLO ESCOLAR ${datos.cicloEscolar || "2026-2027"}`, pageWidth / 2, 39, { align: "center" });

    // ── 4. Barra de Metadatos Ejecutiva ──
    doc.setFillColor(241, 245, 249); // #F1F5F9
    doc.setDrawColor(...BORDER_RGB);
    doc.setLineWidth(0.3);
    doc.roundedRect(14, 43, pageWidth - 28, 12, 1.5, 1.5, "FD");

    // Lado Izquierdo: Plantel y CCT
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Plantel:", 18, 47.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY_RGB);
    doc.text(datos.nombreEscuela.toUpperCase(), 30, 47.5);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("C.C.T.:", 18, 52);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(datos.cct.toUpperCase(), 28, 52);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Zona:", 58, 52);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(datos.zonaEscolar || "004", 67, 52);

    // Lado Derecho: Entidad y Carga
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...NAVY_RGB);
    doc.text(`${fila.encabezado.toUpperCase()} ${fila.subtitulo ? " • " + fila.subtitulo : ""}`, pageWidth - 18, 48, { align: "right" });

    let totalHorasFila = 0;
    const asignaturasContadas = new Set<string>();
    for (let d = 1; d <= 5; d++) {
      for (let p = 0; p < datos.periodos.length; p++) {
        const val = fila.celdas[`${d}_${p + 1}`];
        if (val && val !== "Libre") {
          totalHorasFila++;
          if (typeof val !== "string" && val.materia) asignaturasContadas.add(val.materia);
        }
      }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(22, 101, 52); // Verde institucional
    doc.text(`Carga Total: ${totalHorasFila} hrs/semana (${asignaturasContadas.size} materias)`, pageWidth - 18, 52.5, { align: "right" });

    // ── 5. Construcción de Tabla y Sombra Simulada ──
    const head = [["PERIODO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES"]];
    const body: any[][] = [];
    const materiasGrid: (string | null)[][] = [];

    for (let p = 0; p < datos.periodos.length; p++) {
      const rowText: string[] = [`Hora ${p + 1}`];
      const rowMat: (string | null)[] = [null];

      for (let d = 1; d <= 5; d++) {
        const key = `${d}_${p + 1}`;
        const val = fila.celdas[key];

        if (!val) {
          rowText.push("Libre");
          rowMat.push(null);
        } else if (typeof val === "string") {
          rowText.push(val);
          rowMat.push(val !== "Libre" ? val : null);
        } else {
          const lineas: string[] = [];
          if (val.materia) lineas.push(val.materia);
          if (val.docente && !fila.encabezado.startsWith("DOCENTE")) lineas.push(`Prof. ${val.docente}`);
          if (val.grupo && !fila.encabezado.startsWith("GRUPO")) lineas.push(`Gpo: ${val.grupo}`);
          if (val.aula) lineas.push(`[${val.aula}]`);
          rowText.push(lineas.join("\n"));
          rowMat.push(val.materia || null);
        }
      }
      body.push(rowText);
      materiasGrid.push(rowMat);
    }

    // Efecto de sombra sutil (rectángulo gris claro desfasado 1.2mm)
    const tableStartY = 57;
    doc.setFillColor(226, 232, 240); // #E2E8F0
    doc.roundedRect(15.2, tableStartY + 1.2, pageWidth - 28, 88, 2, 2, "F");

    autoTable(doc, {
      startY: tableStartY,
      head: head,
      body: body,
      theme: "grid",
      styles: {
        fontSize: 7.5,
        cellPadding: 2.2,
        halign: "center",
        valign: "middle",
        lineColor: [226, 232, 240],
        lineWidth: 0.2
      },
      headStyles: {
        fillColor: [...NAVY_RGB],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8.5,
        halign: "center",
        cellPadding: 2.8
      },
      columnStyles: {
        0: { cellWidth: 24, fontStyle: "bold", fillColor: [241, 245, 249], textColor: [...NAVY_RGB] },
        1: { cellWidth: 49 },
        2: { cellWidth: 49 },
        3: { cellWidth: 49 },
        4: { cellWidth: 49 },
        5: { cellWidth: 49 }
      },
      didParseCell: function(data) {
        if (data.section === "body" && data.column.index > 0) {
          const matNombre = materiasGrid[data.row.index]?.[data.column.index];
          if (matNombre) {
            const colors = getSubjectColors(matNombre);
            data.cell.styles.fillColor = hexToRgb(colors.pastelBgHex);
            data.cell.styles.textColor = hexToRgb(colors.pastelTextHex);
            data.cell.styles.fontStyle = "bold";
          } else {
            data.cell.styles.fillColor = [248, 250, 252]; // #F8FAFC
            data.cell.styles.textColor = [148, 163, 184]; // #94A3B8
          }
        }
      },
      margin: { left: 14, right: 14 }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 148;

    // ── 6. Bloque Formal de Firmas Institucionales (3 Columnas) ──
    const yFirmas = Math.min(182, Math.max(finalY + 8, 156));
    const colWidth = (pageWidth - 28) / 3;

    const rolesFirmas = [
      {
        titulo: fila.encabezado.startsWith("DOCENTE") ? "DOCENTE DE LA ASIGNATURA" : "ASESOR / TITULAR DE GRUPO",
        subtitulo: "Nombre y Firma"
      },
      {
        titulo: "DIRECCIÓN DEL PLANTEL",
        subtitulo: "Sello y Firma Oficial"
      },
      {
        titulo: `SUPERVISIÓN ESCOLAR ZONA ${datos.zonaEscolar || "004"}`,
        subtitulo: "Vo. Bo. Supervisión Escolar"
      }
    ];

    rolesFirmas.forEach((rf, i) => {
      const x = 14 + i * colWidth;
      const boxW = 28;
      const boxH = 14;

      // Caja punteada para sello oficial
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      doc.setLineDashPattern([1, 1], 0);
      doc.rect(x + (colWidth / 2) - (boxW / 2), yFirmas, boxW, boxH);
      doc.setLineDashPattern([], 0);

      // Línea sólida de firma
      doc.setDrawColor(51, 65, 85);
      doc.setLineWidth(0.4);
      doc.line(x + 10, yFirmas + 18, x + colWidth - 10, yFirmas + 18);

      // Texto de firmas
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...NAVY_RGB);
      doc.text(rf.titulo, x + (colWidth / 2), yFirmas + 22, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      doc.text(rf.subtitulo, x + (colWidth / 2), yFirmas + 25.5, { align: "center" });
    });

    // ── 7. Pie de Página con Trazabilidad y Paginación ──
    const pageNum = idxFila + 1;
    doc.setDrawColor(...NAVY_RGB);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 11, pageWidth - 14, pageHeight - 11);

    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `DidactecaIA • Sistema Inteligente de Horarios Escolares MCCEMS  |  Generado: ${new Date().toLocaleDateString("es-MX")}`,
      14,
      pageHeight - 6.5
    );
    doc.text(
      `Documento Oficial de Horarios  |  Hoja ${pageNum} de ${totalFilas}`,
      pageWidth - 14,
      pageHeight - 6.5,
      { align: "right" }
    );
  });

  const fileName = `Horario_Oficial_${datos.cct}_${datos.tipoVista}.pdf`;
  doc.save(fileName);
}

// =========================================================================
// 2. EXPORTACIÓN A WORD (.DOCX) — Formato editable formal (Portrait A4)
// =========================================================================
export async function exportarHorarioDOCX(datos: DatosExportacionHorario) {
  const NAVY = "1E3A8A";
  const BORDER = "E2E8F0";

  const sections = datos.filas.map((fila) => {
    const children: any[] = [];

    // 1. Membrete Institucional Vertical
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 20 },
        children: [
          new TextRun({
            text: "GOBIERNO DEL ESTADO DE PUEBLA",
            bold: true,
            size: 20,
            color: NAVY,
            font: "Helvetica"
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 20 },
        children: [
          new TextRun({
            text: "SECRETARÍA DE EDUCACIÓN PÚBLICA",
            bold: true,
            size: 18,
            color: NAVY,
            font: "Helvetica"
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 20 },
        children: [
          new TextRun({
            text: "SUBSECRETARÍA DE EDUCACIÓN MEDIA SUPERIOR Y SUPERIOR",
            size: 15,
            color: "475569",
            font: "Helvetica"
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 20 },
        children: [
          new TextRun({
            text: "DIRECCIÓN DE BACHILLERATOS GENERALES",
            bold: true,
            size: 17,
            color: "1e293b",
            font: "Helvetica"
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: `SUPERVISIÓN ESCOLAR ZONA ${datos.zonaEscolar || "004"}`,
            size: 16,
            color: "1e293b",
            font: "Helvetica"
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: NAVY } },
        spacing: { after: 80 },
        children: []
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: `PLANTEL: ${datos.nombreEscuela.toUpperCase()}   •   CCT: ${datos.cct.toUpperCase()}`,
            bold: true,
            size: 18,
            color: "0f172a",
            font: "Helvetica"
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: `${fila.encabezado.toUpperCase()} ${fila.subtitulo ? " - " + fila.subtitulo : ""} • CICLO ESCOLAR ${datos.cicloEscolar || "2026-2027"}`,
            bold: true,
            size: 18,
            color: NAVY,
            font: "Helvetica"
          })
        ]
      })
    );

    // 2. Cabecera de la tabla
    const headerCells = ["Periodo", ...datos.dias].map(
      (d) =>
        new TableCell({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: d.toUpperCase(), bold: true, size: 16, color: "FFFFFF" })]
            })
          ],
          shading: { type: ShadingType.CLEAR, fill: NAVY },
          width: { size: d === "Periodo" ? 1400 : 1700, type: WidthType.DXA }
        })
    );
    const headerRow = new TableRow({ children: headerCells, tableHeader: true });

    // 3. Filas de la tabla con colores pastel
    const bodyRows: TableRow[] = [];
    for (let p = 0; p < datos.periodos.length; p++) {
      const cells: TableCell[] = [
        new TableCell({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: `Hora ${p + 1}`, bold: true, size: 15, color: NAVY })]
            })
          ],
          shading: { type: ShadingType.CLEAR, fill: "F1F5F9" },
          width: { size: 1400, type: WidthType.DXA }
        })
      ];

      for (let d = 1; d <= datos.dias.length; d++) {
        const key = `${d}_${p + 1}`;
        const val = fila.celdas[key];
        let matNombre = "";
        let lineasDetalle: string[] = [];

        if (!val || val === "Libre") {
          matNombre = "Libre";
        } else if (typeof val === "string") {
          matNombre = val;
        } else {
          matNombre = val.materia || "Libre";
          if (val.docente && !fila.encabezado.startsWith("DOCENTE")) lineasDetalle.push(`Prof. ${val.docente}`);
          if (val.grupo && !fila.encabezado.startsWith("GRUPO")) lineasDetalle.push(`Gpo: ${val.grupo}`);
          if (val.aula) lineasDetalle.push(`[${val.aula}]`);
        }

        const isFree = matNombre === "Libre";
        const colors = getSubjectColors(matNombre);

        const parrafos: Paragraph[] = [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: matNombre,
                bold: !isFree,
                size: 14,
                color: isFree ? "94A3B8" : colors.pastelText
              })
            ]
          })
        ];

        for (const det of lineasDetalle) {
          parrafos.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: det, size: 12, color: colors.pastelText })]
            })
          );
        }

        cells.push(
          new TableCell({
            children: parrafos,
            shading: { type: ShadingType.CLEAR, fill: colors.pastelBg },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
              left: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
              right: { style: BorderStyle.SINGLE, size: 4, color: BORDER }
            },
            width: { size: 1700, type: WidthType.DXA }
          })
        );
      }
      bodyRows.push(new TableRow({ children: cells }));
    }

    const tabla = new Table({
      rows: [headerRow, ...bodyRows],
      width: { size: 9900, type: WidthType.DXA }
    });

    // 4. Tabla de Firmas en 3 Columnas
    const rolesFirmas = [
      fila.encabezado.startsWith("DOCENTE") ? "Docente de la Asignatura" : "Asesor / Titular de Grupo",
      "Dirección del Plantel",
      `Supervisión Escolar Zona ${datos.zonaEscolar || "004"}`
    ];

    const tablaFirmas = new Table({
      width: { size: 9900, type: WidthType.DXA },
      columnWidths: [3300, 3300, 3300],
      rows: [
        new TableRow({
          children: rolesFirmas.map(() =>
            new TableCell({
              width: { size: 3300, type: WidthType.DXA },
              borders: { top: { style: BorderStyle.SINGLE, size: 6, color: "334155" } },
              children: [
                new Paragraph({ text: "", spacing: { after: 120 } })
              ]
            })
          )
        }),
        new TableRow({
          children: rolesFirmas.map(
            (role) =>
              new TableCell({
                width: { size: 3300, type: WidthType.DXA },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: role, bold: true, size: 14, color: NAVY })]
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: "Sello y Firma Oficial", size: 12, color: "64748b" })]
                  })
                ]
              })
          )
        })
      ]
    });

    children.push(
      tabla,
      new Paragraph({ spacing: { before: 180, after: 180 }, children: [] }),
      tablaFirmas
    );

    return {
      properties: {
        page: {
          margin: { top: 720, bottom: 720, left: 720, right: 720 }
        }
      },
      children
    };
  });

  const doc = new Document({ sections });
  const buffer = await Packer.toBlob(doc);
  const url = URL.createObjectURL(buffer);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Horario_Oficial_${datos.cct}_${datos.tipoVista}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

// =========================================================================
// 3. EXPORTACIÓN A EXCEL (.XLSX) — Migrado a ExcelJS con estilos nativos
// =========================================================================
export async function exportarHorarioExcel(datos: DatosExportacionHorario) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "DidactecaIA";
  wb.created = new Date();

  for (const fila of datos.filas) {
    const sheetName = fila.encabezado.replace(/[\\/?*:[\]]/g, "_").slice(0, 30);
    const ws = wb.addWorksheet(sheetName, {
      views: [{ state: "frozen", ySplit: 6 }]
    });

    // 1. Membrete Institucional en Filas 1 a 4
    ws.mergeCells("A1:F1");
    const cellA1 = ws.getCell("A1");
    cellA1.value = "GOBIERNO DEL ESTADO DE PUEBLA · SECRETARÍA DE EDUCACIÓN PÚBLICA";
    cellA1.font = { bold: true, size: 11, color: { argb: "FF1E3A8A" } };
    cellA1.alignment = { horizontal: "center", vertical: "middle" };

    ws.mergeCells("A2:F2");
    const cellA2 = ws.getCell("A2");
    cellA2.value = `SUBSECRETARÍA DE EDUCACIÓN MEDIA SUPERIOR Y SUPERIOR · SUPERVISIÓN ESCOLAR ZONA ${datos.zonaEscolar || "004"}`;
    cellA2.font = { bold: true, size: 10, color: { argb: "FF1E3A8A" } };
    cellA2.alignment = { horizontal: "center", vertical: "middle" };

    ws.mergeCells("A3:F3");
    const cellA3 = ws.getCell("A3");
    cellA3.value = `PLANTEL: ${datos.nombreEscuela.toUpperCase()}   C.C.T.: ${datos.cct.toUpperCase()}   CICLO ESCOLAR: ${datos.cicloEscolar || "2026-2027"}`;
    cellA3.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    cellA3.font = { bold: true, size: 9, color: { argb: "FF334155" } };
    cellA3.alignment = { horizontal: "center", vertical: "middle" };

    ws.mergeCells("A4:F4");
    const cellA4 = ws.getCell("A4");
    cellA4.value = `${fila.encabezado.toUpperCase()} ${fila.subtitulo ? " - " + fila.subtitulo : ""}`;
    cellA4.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
    cellA4.font = { bold: true, size: 10, color: { argb: "FF1E3A8A" } };
    cellA4.alignment = { horizontal: "center", vertical: "middle" };

    // Fila 5: Espacio
    ws.getRow(5).height = 8;

    // Fila 6: Encabezados de Columna
    const headerRow = ws.getRow(6);
    headerRow.values = ["Periodo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "FF334155" } },
        bottom: { style: "medium", color: { argb: "FF1E3A8A" } },
        left: { style: "thin", color: { argb: "FF334155" } },
        right: { style: "thin", color: { argb: "FF334155" } }
      };
    });

    // Filas 7+: Contenido de Horario
    datos.periodos.forEach((_, pIdx) => {
      const rowNum = 7 + pIdx;
      const row = ws.getRow(rowNum);
      row.height = 36;

      const pCell = row.getCell(1);
      pCell.value = `Hora ${pIdx + 1}`;
      pCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
      pCell.font = { bold: true, color: { argb: "FF1E3A8A" }, size: 9 };
      pCell.alignment = { horizontal: "center", vertical: "middle" };
      pCell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } }
      };

      for (let d = 1; d <= 5; d++) {
        const cell = row.getCell(d + 1);
        const key = `${d}_${pIdx + 1}`;
        const val = fila.celdas[key];

        if (!val || val === "Libre") {
          cell.value = "Libre";
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
          cell.font = { italic: true, color: { argb: "FF94A3B8" }, size: 8.5 };
          cell.alignment = { horizontal: "center", vertical: "middle" };
        } else if (typeof val === "string") {
          const colors = getSubjectColors(val);
          cell.value = val;
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${colors.pastelBg}` } };
          cell.font = { bold: true, color: { argb: `FF${colors.pastelText}` }, size: 9 };
          cell.alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
        } else {
          const colors = getSubjectColors(val.materia);
          const lineas: string[] = [val.materia];
          if (val.docente && !fila.encabezado.startsWith("DOCENTE")) lineas.push(`Prof. ${val.docente}`);
          if (val.grupo && !fila.encabezado.startsWith("GRUPO")) lineas.push(`Gpo: ${val.grupo}`);
          if (val.aula) lineas.push(`[${val.aula}]`);

          cell.value = lineas.join("\n");
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${colors.pastelBg}` } };
          cell.font = { bold: true, color: { argb: `FF${colors.pastelText}` }, size: 8.5 };
          cell.alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
        }

        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } }
        };
      }
    });

    // Ajuste de Anchos de Columna
    ws.columns = [
      { width: 14 },
      { width: 26 },
      { width: 26 },
      { width: 26 },
      { width: 26 },
      { width: 26 }
    ];
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Horario_${datos.cct}_${datos.tipoVista}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// Sumario Maestro / Grupo en Excel con ExcelJS
export async function exportarSumarioExcel(datos: DatosSumario, tipo: "DOCENTE" | "GRUPO") {
  const wb = new ExcelJS.Workbook();
  const { dias, numHorasPorDia } = datos;

  const ws = wb.addWorksheet(tipo === "DOCENTE" ? "Sumario Maestros" : "Sumario Grupos", {
    views: [{ state: "frozen", ySplit: 5, xSplit: 1 }]
  });

  const totalCols = 1 + (dias.length * numHorasPorDia);

  // Membrete
  ws.mergeCells(1, 1, 1, totalCols);
  const c1 = ws.getCell(1, 1);
  c1.value = `SECRETARÍA DE EDUCACIÓN PÚBLICA · SUPERVISIÓN ESCOLAR ZONA 004 · PLANTEL: ${datos.nombreEscuela.toUpperCase()} (${datos.cct})`;
  c1.font = { bold: true, size: 11, color: { argb: "FF1E3A8A" } };
  c1.alignment = { horizontal: "center" };

  ws.mergeCells(2, 1, 2, totalCols);
  const c2 = ws.getCell(2, 1);
  c2.value = `SUMARIO ${tipo === "DOCENTE" ? "MAESTRO OFICIAL" : "POR GRUPOS"} · HORARIO SEMANAL COMPLETO`;
  c2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  c2.font = { bold: true, size: 10, color: { argb: "FF334155" } };
  c2.alignment = { horizontal: "center" };

  // Encabezados
  const headerValues = [tipo === "DOCENTE" ? "Docente" : "Grupo"];
  for (let d = 0; d < dias.length; d++) {
    for (let h = 1; h <= numHorasPorDia; h++) {
      headerValues.push(`${dias[d].substring(0, 3)}/H${h}`);
    }
  }

  const headerRow = ws.getRow(4);
  headerRow.values = headerValues;
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  // Datos
  datos.entidades.forEach((entidad, idx) => {
    const row = ws.getRow(5 + idx);
    row.height = 28;
    const cellE = row.getCell(1);
    cellE.value = entidad.etiqueta;
    cellE.font = { bold: true, size: 9 };
    cellE.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };

    let colIdx = 2;
    for (let d = 1; d <= dias.length; d++) {
      for (let h = 1; h <= numHorasPorDia; h++) {
        const cell = row.getCell(colIdx++);
        const celda = datos.obtenerCelda(entidad.id, d, h);
        if (celda && celda.texto) {
          const colors = getSubjectColors(celda.texto);
          cell.value = celda.texto;
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${colors.pastelBg}` } };
          cell.font = { bold: true, color: { argb: `FF${colors.pastelText}` }, size: 8 };
        } else {
          cell.value = "—";
          cell.font = { color: { argb: "FF94A3B8" }, size: 8 };
        }
        cell.alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
      }
    }
  });

  // Auto anchos
  ws.columns = [
    { width: 30 },
    ...Array.from({ length: totalCols - 1 }, () => ({ width: 18 }))
  ];

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Sumario_${tipo === "DOCENTE" ? "Maestro" : "Grupos"}_${datos.cct}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// =========================================================================
// 4. EXPORTACIÓN A WHATSAPP / REDES SOCIALES — Tarjeta Gráfica Neón (1080x1080 / 1080x1920)
// =========================================================================
export async function exportarHorarioWhatsApp(
  datos: DatosExportacionHorario,
  formato: "square" | "story" = "square"
) {
  const isStory = formato === "story";
  const width = 1080;
  const height = isStory ? 1920 : 1080;

  const fila = datos.filas[0];
  if (!fila) return;

  // Crear contenedor HTML temporal fuera de pantalla
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  container.style.background = "#0B0B16";
  container.style.color = "#FFFFFF";
  container.style.fontFamily = "system-ui, -apple-system, sans-serif";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.justifyContent = "space-between";
  container.style.padding = isStory ? "80px 60px" : "50px 50px";
  container.style.boxSizing = "border-box";

  // Construir matriz de materias para la tarjeta
  const itemsHorario: any[] = [];
  for (let d = 1; d <= 5; d++) {
    for (let p = 1; p <= datos.periodos.length; p++) {
      const val = fila.celdas[`${d}_${p}`];
      if (val && val !== "Libre") {
        const mat = typeof val === "string" ? val : val.materia;
        const doc = typeof val === "object" ? val.docente : undefined;
        const gpo = typeof val === "object" ? val.grupo : undefined;
        const color = getSubjectColors(mat);
        itemsHorario.push({
          dia: datos.dias[d - 1],
          periodo: `H${p}`,
          materia: mat,
          docente: doc,
          grupo: gpo,
          color
        });
      }
    }
  }

  // Header del poster
  const headerHTML = `
    <div>
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #1E293B; padding-bottom: 16px; margin-bottom: 24px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px;">
            🎓
          </div>
          <div>
            <div style="font-size: 20px; font-weight: 800; color: #22D3EE; letter-spacing: 2px; text-transform: uppercase; text-shadow: 0 0 12px rgba(34, 211, 238, 0.4);">
              ${datos.nombreEscuela}
            </div>
            <div style="font-size: 14px; color: #94A3B8; font-weight: 600;">
              CCT: ${datos.cct} • Ciclo ${datos.cicloEscolar || "2026-2027"}
            </div>
          </div>
        </div>
        <div style="background: rgba(34, 211, 238, 0.15); border: 1px solid #22D3EE; color: #22D3EE; padding: 6px 18px; border-radius: 30px; font-weight: 800; font-size: 15px;">
          ZONA ${datos.zonaEscolar || "004"}
        </div>
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
        <div>
          <h1 style="font-size: ${isStory ? "38px" : "32px"}; font-weight: 900; margin: 0; color: #FFFFFF; letter-spacing: -0.5px;">
            ${fila.encabezado}
          </h1>
          <p style="font-size: 16px; color: #A3E635; margin: 6px 0 0; font-weight: 700;">
            ${datos.tituloTabla} • Horario Oficial
          </p>
        </div>
      </div>
    </div>
  `;

  // Matriz de Horario estilo Neón
  let gridHTML = `<div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; flex: 1; margin-bottom: 24px;">`;
  for (let d = 1; d <= 5; d++) {
    const diaNombre = datos.dias[d - 1];
    gridHTML += `
      <div style="background: rgba(18, 18, 31, 0.9); border: 1px solid #1E293B; border-radius: 12px; padding: 12px 8px; display: flex; flex-direction: column; gap: 8px;">
        <div style="text-align: center; font-size: 14px; font-weight: 800; color: #F472B6; text-transform: uppercase; padding-bottom: 6px; border-bottom: 1px solid #334155; text-shadow: 0 0 8px rgba(244, 114, 182, 0.5);">
          ${diaNombre}
        </div>
    `;

    for (let p = 1; p <= datos.periodos.length; p++) {
      const val = fila.celdas[`${d}_${p}`];
      if (!val || val === "Libre") {
        gridHTML += `
          <div style="background: rgba(15, 23, 42, 0.4); border-radius: 8px; padding: 8px 4px; text-align: center; border: 1px dashed #334155;">
            <div style="font-size: 10px; color: #475569; font-weight: 700;">H${p}</div>
            <div style="font-size: 11px; color: #64748B; font-style: italic;">Libre</div>
          </div>
        `;
      } else {
        const mat = typeof val === "string" ? val : val.materia;
        const colors = getSubjectColors(mat);
        gridHTML += `
          <div style="background: rgba(15, 23, 42, 0.9); border-radius: 8px; padding: 8px 6px; border-left: 3px solid ${colors.neon}; box-shadow: 0 2px 10px rgba(0,0,0,0.5);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
              <span style="font-size: 10px; font-weight: 800; color: #94A3B8;">H${p}</span>
              <span style="background: ${colors.neon}; color: #0B0B16; font-size: 9px; font-weight: 900; padding: 1px 4px; border-radius: 3px;">Activo</span>
            </div>
            <div style="font-size: 11.5px; font-weight: 800; color: ${colors.neon}; line-height: 1.2; text-shadow: 0 0 10px ${colors.neonGlow}; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
              ${mat}
            </div>
          </div>
        `;
      }
    }
    gridHTML += `</div>`;
  }
  gridHTML += `</div>`;

  // Footer Neón
  const footerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #1E293B; padding-top: 16px;">
      <div style="font-size: 13px; color: #64748B; font-weight: 600;">
        ⚡ Generado con DidactecaIA • Sistema Inteligente de Horarios
      </div>
      <div style="background: #1E293B; color: #A3E635; font-size: 13px; font-weight: 800; padding: 6px 14px; border-radius: 20px; border: 1px solid #334155;">
        📱 Válido para WhatsApp & Redes
      </div>
    </div>
  `;

  container.innerHTML = headerHTML + gridHTML + footerHTML;
  document.body.appendChild(container);

  try {
    if (document.fonts) {
      await document.fonts.ready;
    }
    const dataUrl = await toPng(container, {
      width,
      height,
      pixelRatio: 1
    });

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `Horario_WhatsApp_${datos.cct}_${fila.encabezado.replace(/\s+/g, "_")}.png`;
    a.click();
  } finally {
    document.body.removeChild(container);
  }
}
