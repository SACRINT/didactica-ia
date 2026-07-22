import fs from 'fs';
import path from 'path';

const rootDir = 'c:\\Secuencias_Didacticas';
const destBase = path.join(rootDir, 'didactica-ia', 'documentos_referencia');

const folders = {
  normativas: path.join(destBase, '[01] Normativas_y_Modelos_Educativos'),
  programas: path.join(destBase, '[02] Programas_de_Estudio'),
  evaluacion: path.join(destBase, '[03] Guias_de_Evaluacion_y_Retroalimentacion'),
  planeaciones: path.join(destBase, '[04] Ejemplos_de_Planeaciones'),
  proyectos: path.join(destBase, '[05] Proyectos_PAEC_y_PMC'),
  credenciales: path.join(destBase, '[06] Credenciales_y_Notas_Personales')
};

// Ensure folders exist
Object.values(folders).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// File classifications
const filesToMove = [
  // [01] Normativas_y_Modelos_Educativos
  { name: '2025_1_BN_MODELO EDUCATIVO 2025 MCCMS.pdf', type: 'normativas' },
  { name: 'De la evaluación tradicional a la formativa BG 2026-2027.pptx', type: 'normativas' },
  { name: 'Diseño de la Planeacion Bachillerato General 26-27.pptx', type: 'normativas' },
  { name: 'La Planeacion Bachillerato General 26-27 CTXT.pptx', type: 'normativas' },
  { name: 'MAPA CURRICULAR FIRMADO.pdf', type: 'normativas' },
  { name: 'MAPA CURRICULAR TECNOLOGICOS.pdf', type: 'normativas' },
  { name: '05 ORIENTACIONES ESPECÍFICAS DEL PROGRAMA CAMBIO DE CATEGORÍA VF210625 CON IMAGEN.pdf', type: 'normativas' },
  { name: 'Taller Planeacion Didactica Puebla Cartografia Social.docx', type: 'normativas' },

  // [02] Programas_de_Estudio
  { name: 'Area_de_la_Salud_2024.pdf', type: 'programas' },
  { name: 'ASIGNATURAS Y PROPOSITOS FORMATIVOS 1ER-2DO SEMESTRE.docx', type: 'programas' },
  { name: 'Curriculum Ampliado', type: 'programas', isDir: true },
  { name: 'Curriculum Fundamental', type: 'programas', isDir: true },
  { name: 'Curriculum Laboral BGE 2023', type: 'programas', isDir: true },
  { name: 'Documentos de consulta', type: 'programas', isDir: true },

  // [03] Guias_de_Evaluacion_y_Retroalimentacion
  { name: '03 Lista de cotejo Plan de Clase 1-2_SEM.pdf', type: 'evaluacion' },
  { name: '04 ANEXO 12 CC 1-2.pdf', type: 'evaluacion' },
  { name: 'Guía de Retroalimentación Secuencia Didáctica FormaciónLoboral 2026-2027.pdf', type: 'evaluacion' },
  { name: 'Revisión Secuencia Didáctica Formación Loboral 2026-2027.pdf', type: 'evaluacion' },
  { name: 'S1 Guía Retro S2_Secuencia Didáctica 26 27.pdf', type: 'evaluacion' },
  { name: 'Secuencia Didáctica Componente Laboral Bachillerato General 26-27.pptx', type: 'evaluacion' },

  // [04] Ejemplos_de_Planeaciones
  { name: 'Planeacion_Didactica_UAC1_Salud_2026-2027.docx', type: 'planeaciones' },
  { name: 'Planeacion_Didactica_UAC1_Salud_2026-2027.pdf', type: 'planeaciones' },
  { name: 'Planeacion_Didactica_UAC2_Salud_2026-2027.docx', type: 'planeaciones' },
  { name: 'Planeacion_Ejemplo_UAC1_Salud_3erSemestre_Puebla_2026-2027.docx', type: 'planeaciones' },
  { name: 'Planeacion_Ejemplo_UAC1_Salud_3erSemestre_Puebla_2026-2027.pdf', type: 'planeaciones' },
  { name: 'Planeacion_Ejemplo_UAC2_Salud_3erSemestre_Puebla_2026-2027.docx', type: 'planeaciones' },
  { name: 'Planeacion_Pensamiento_Matemático_I_1Semestre_2026-2027.docx', type: 'planeaciones' },
  { name: 'S1 y S2  Planeación Didáctica BG CF y CA 26 27.pdf', type: 'planeaciones' },
  { name: 'S123 Planeación Didáctica.pdf', type: 'planeaciones' },
  { name: 'Secuencia Didactica Sistemas_Electricos UAC1 3er Semestre.docx', type: 'planeaciones' },
  { name: 'Instrumentos y Materiales Secuencia Didactica Sistemas_Electricos UAC1 3er Semestre.docx', type: 'planeaciones' },

  // [05] Proyectos_PAEC_y_PMC
  { name: 'DATOS PAEC-PEC', type: 'proyectos', isDir: true },
  { name: 'ORIENTACIONES PMC 2025-2026', type: 'proyectos', isDir: true },
  { name: 'PMC Zona004', type: 'proyectos', isDir: true },
  { name: 'PAEC-PEC_2025-2026_21EBH0200X_HÉROES DE LA PATRIA(1er y 2do SEM).pdf', type: 'proyectos' },
  { name: 'PMC_2025-2026_21EBH0200X_HÉROES DE LA PATRIA.pdf', type: 'proyectos' },

  // [06] Credenciales_y_Notas_Personales
  { name: 'API Key del Calude.docx', type: 'credenciales' },
  { name: 'Clave de API DidácticaIA.docx', type: 'credenciales' },
  { name: 'Clave de API GOogle IA Studio.txt', type: 'credenciales' },
  { name: 'Conversacion con Claude.docx', type: 'credenciales' }
];

filesToMove.forEach(item => {
  const sourcePath = path.join(rootDir, item.name);
  const destPath = path.join(folders[item.type], item.name);

  if (fs.existsSync(sourcePath)) {
    try {
      fs.renameSync(sourcePath, destPath);
      console.log(`Moved: ${item.name} -> ${item.type}`);
    } catch (e) {
      console.error(`Error moving ${item.name}: ${e.message}`);
    }
  } else {
    console.log(`Not found: ${item.name}`);
  }
});

console.log('Organization completed successfully!');
