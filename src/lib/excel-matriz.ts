import * as XLSX from 'xlsx';

export interface CargaImportada {
  semestre: number;
  grupoId: string;
  grupoNombre: string;
  uacName: string;
  horasSemanales: number;
  docenteTextoExcel: string;
  personalId?: string;
  docenteNombreMatch?: string;
  confianza: 'EXACTA' | 'MEDIA' | 'NO_ENCONTRADO' | 'VACIO';
  valido: boolean;
}

export interface ResultadoParseoMatriz {
  cargas: CargaImportada[];
  resumen: {
    totalAsignaciones: number;
    asignadasConExito: number;
    requierenRevision: number;
    vacios: number;
  };
  gruposDetectados: string[];
}

function limpiarTexto(texto: string): string {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .trim()
    .toUpperCase();
}

/**
 * Normaliza nombres de grupos como "1A", "1° A", "1-A", "GRUPO 1 A" a una forma canónica: "1° A"
 */
function normalizarNombreGrupo(raw: string): string {
  const t = limpiarTexto(raw).replace(/\s+/g, ' ');
  // Capturar números 1 a 6 y letra A a J
  const match = t.match(/([1-6])[\s°º\-_]*([A-J])/i);
  if (match) {
    return `${match[1]}° ${match[2].toUpperCase()}`;
  }
  return t;
}

/**
 * Coincidencia difusa de materias
 */
function coincideMateria(textoExcel: string, uacNombreOficial: string, uacTipo?: string): boolean {
  const normExcel = limpiarTexto(textoExcel);
  const normOficial = limpiarTexto(uacNombreOficial);

  if (normExcel === normOficial) return true;

  // Atajos comunes y abreviaturas
  if (normExcel.includes('CNEYT') && normOficial.includes('CIENCIAS NATURALES')) {
    if (normExcel.includes('III') && normOficial.includes('III')) return true;
    if (normExcel.includes('IV') && normOficial.includes('IV')) return true;
    if (normExcel.includes('II') && normOficial.includes('II')) return true;
    if (normExcel.includes('I') && !normExcel.includes('II') && !normExcel.includes('III') && !normOficial.includes('II') && !normOficial.includes('III')) return true;
    if (!normExcel.includes('II') && !normExcel.includes('III') && !normExcel.includes('IV')) return true;
  }

  if (normExcel.includes('PFYH') && normOficial.includes('HUMANIDADES')) {
    if (normExcel.includes('III') && normOficial.includes('III')) return true;
    if (normExcel.includes('IV') && normOficial.includes('IV')) return true;
    if (normExcel.includes('II') && normOficial.includes('II')) return true;
    if (normExcel.includes('1') || normExcel.includes('I')) return true;
  }

  if (normExcel.includes('PENSAMIENTO MATEMATICO') && normOficial.includes('PENSAMIENTO MATEMATICO')) {
    if (normExcel.includes('III') && normOficial.includes('III')) return true;
    if (normExcel.includes('IV') && normOficial.includes('IV')) return true;
    if (normExcel.includes('II') && normOficial.includes('II')) return true;
    if (normExcel.includes('I') && !normExcel.includes('II') && !normExcel.includes('III') && !normOficial.includes('II') && !normOficial.includes('III')) return true;
  }

  if ((normExcel.includes('LENGUAJE Y COMUNICACION') || normExcel.includes('LENGUA Y COMUNICACION')) &&
      (normOficial.includes('LENGUAJE Y COMUNICACION') || normOficial.includes('LENGUA Y COMUNICACION'))) {
    if (normExcel.includes('III') && normOficial.includes('III')) return true;
    if (normExcel.includes('IV') && normOficial.includes('IV')) return true;
    if (normExcel.includes('II') && normOficial.includes('II')) return true;
    if (normExcel.includes('I') && !normExcel.includes('II') && !normExcel.includes('III')) return true;
  }

  if (normExcel.includes('INGLES') && normOficial.includes('INGLES')) {
    if (normExcel.includes('III') && normOficial.includes('III')) return true;
    if (normExcel.includes('IV') && normOficial.includes('IV')) return true;
    if (normExcel.includes('II') && normOficial.includes('II')) return true;
    if (normExcel.includes('I') && !normExcel.includes('II') && !normExcel.includes('III')) return true;
  }

  if (normExcel.includes('CULTURA DIGITAL') && normOficial.includes('CULTURA DIGITAL')) {
    if (normExcel.includes('II') && normOficial.includes('II')) return true;
    if (!normExcel.includes('II')) return true;
  }

  if (normExcel.includes('CIENCIAS SOCIALES') && normOficial.includes('CIENCIAS SOCIALES')) {
    if (normExcel.includes('II') && normOficial.includes('II')) return true;
    if (!normExcel.includes('II')) return true;
  }

  if (normExcel.includes('ACTIVIDADES FISICAS') && normOficial.includes('ACTIVIDADES FISICAS')) return true;
  if (normExcel.includes('ENERGIA EN LOS PROCESOS') && normOficial.includes('ENERGIA')) return true;
  if (normExcel.includes('CONCIENCIA HISTORICA') && normOficial.includes('CONCIENCIA HISTORICA')) return true;
  if (normExcel.includes('HABILIDADES DEL PENSAMIENTO') && normOficial.includes('HABILIDADES DEL PENSAMIENTO')) return true;
  if (normExcel.includes('TALLER DE CIENCIAS') && normOficial.includes('TALLER DE CIENCIAS')) return true;
  if (normExcel.includes('EDUCACION PARA LA SALUD') && normOficial.includes('SALUD')) return true;
  if (normExcel.includes('PRACTICA Y COLABORACION') && normOficial.includes('PRACTICA')) return true;

  // Formación Laboral
  if (normExcel.includes('LABORAL') && uacTipo?.includes('LABORAL')) {
    if (normExcel.includes('\"A\"') || normExcel.includes(' A') || normExcel.endsWith('A')) {
      if (uacTipo === 'LABORAL_A') return true;
    }
    if (normExcel.includes('\"B\"') || normExcel.includes(' B') || normExcel.endsWith('B')) {
      if (uacTipo === 'LABORAL_B') return true;
    }
    return true;
  }

  // FFE Optativas
  if (normExcel.includes('OPTATIVA') || normExcel.includes('EXTENDIDA')) {
    if (uacTipo?.includes('FFE')) return true;
  }

  // Comparación por contención de palabras clave
  const palabrasExcel = normExcel.split(/\s+/).filter(p => p.length > 3);
  const palabrasOficial = normOficial.split(/\s+/).filter(p => p.length > 3);
  const coincidencias = palabrasExcel.filter(p => palabrasOficial.includes(p));

  if (palabrasOficial.length > 0 && coincidencias.length / palabrasOficial.length >= 0.5) {
    return true;
  }

  return false;
}

/**
 * Busca al docente más coincidente en el catálogo de personal
 */
function buscarDocenteCoincidente(
  textoDocente: string,
  docentesDisponibles: any[]
): { personalId?: string; docenteNombreMatch?: string; confianza: 'EXACTA' | 'MEDIA' | 'NO_ENCONTRADO' | 'VACIO' } {
  const t = limpiarTexto(textoDocente);
  if (!t || t === '- SIN ASIGNAR -' || t === 'SIN ASIGNAR' || t === '-' || t === 'VACANTE' || t === 'POR ASIGNAR') {
    return { confianza: 'VACIO' };
  }

  // 1. Coincidencia exacta de nombre completo
  for (const d of docentesDisponibles) {
    const nomCompleto = limpiarTexto(`${d.nombre || ''} ${d.apellidoPaterno || ''} ${d.apellidoMaterno || ''}`);
    const nomInvertido = limpiarTexto(`${d.apellidoPaterno || ''} ${d.apellidoMaterno || ''} ${d.nombre || ''}`);
    if (t === nomCompleto || t === nomInvertido) {
      return {
        personalId: d.id,
        docenteNombreMatch: `${d.nombre} ${d.apellidoPaterno} ${d.apellidoMaterno || ''}`.trim(),
        confianza: 'EXACTA',
      };
    }
  }

  // 2. Coincidencia de nombre de pila exacto (ej. "JOSE ALAIN", "ROSELIA", "HUMBERTA")
  for (const d of docentesDisponibles) {
    const nomPila = limpiarTexto(d.nombre || '');
    if (nomPila && (t === nomPila || nomPila === t)) {
      return {
        personalId: d.id,
        docenteNombreMatch: `${d.nombre} ${d.apellidoPaterno} ${d.apellidoMaterno || ''}`.trim(),
        confianza: 'EXACTA',
      };
    }
  }

  // 3. Coincidencia por apellidos (ej. "HERNANDEZ CRUZ", "MARTINEZ LUNA")
  for (const d of docentesDisponibles) {
    const aps = limpiarTexto(`${d.apellidoPaterno || ''} ${d.apellidoMaterno || ''}`);
    if (aps && t === aps) {
      return {
        personalId: d.id,
        docenteNombreMatch: `${d.nombre} ${d.apellidoPaterno} ${d.apellidoMaterno || ''}`.trim(),
        confianza: 'EXACTA',
      };
    }
  }

  // 4. Coincidencia parcial o por palabras clave (ej: "ADRIAN" dentro de "HERNANDEZ CRUZ ADRIAN" o "FLORES HUMBERTA")
  const palabrasTexto = t.split(/\s+/).filter(p => p.length > 2);
  let mejorCandidato: any = null;
  let maxPuntos = 0;

  for (const d of docentesDisponibles) {
    const textoDocenteDB = limpiarTexto(`${d.nombre || ''} ${d.apellidoPaterno || ''} ${d.apellidoMaterno || ''}`);
    let puntos = 0;
    for (const pal of palabrasTexto) {
      if (textoDocenteDB.includes(pal)) {
        puntos += 1;
      }
    }
    if (puntos > maxPuntos) {
      maxPuntos = puntos;
      mejorCandidato = d;
    }
  }

  if (mejorCandidato && maxPuntos >= 1) {
    return {
      personalId: mejorCandidato.id,
      docenteNombreMatch: `${mejorCandidato.nombre} ${mejorCandidato.apellidoPaterno} ${mejorCandidato.apellidoMaterno || ''}`.trim(),
      confianza: maxPuntos >= 2 ? 'EXACTA' : 'MEDIA',
    };
  }

  return {
    confianza: 'NO_ENCONTRADO',
  };
}

/**
 * Parsea un archivo Excel / CSV con formato de Matriz por Semestre
 */
export async function parsearExcelMatriz(
  file: File,
  gruposActivos: any[],
  getUACsGrupoFn: (grupo: any) => any[],
  personalDocente: any[]
): Promise<ResultadoParseoMatriz> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const cargasResultado: CargaImportada[] = [];
  const gruposDetectadosSet = new Set<string>();

  // Recorrer todas las hojas de cálculo del libro
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    // Convertir hoja a matriz 2D
    const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!data || data.length === 0) continue;

    // Buscar filas de encabezado con columnas de grupos (ej. "1° A", "1A", "2A", "3A", etc.)
    for (let r = 0; r < data.length; r++) {
      const fila = data[r];
      if (!fila || fila.length === 0) continue;

      // Buscar si esta fila es un encabezado de grupos
      const columnasGrupos: { colIdx: number; grupo: any }[] = [];

      for (let c = 0; c < fila.length; c++) {
        const celda = String(fila[c] || '').trim();
        if (!celda) continue;

        const grupoNormalizado = normalizarNombreGrupo(celda);
        const grupoEncontrado = gruposActivos.find(
          g => normalizarNombreGrupo(g.nombre) === grupoNormalizado ||
               limpiarTexto(g.nombre) === limpiarTexto(celda) ||
               g.nombre.replace(/\s+/g, '').toUpperCase() === celda.replace(/\s+/g, '').toUpperCase()
        );

        if (grupoEncontrado) {
          columnasGrupos.push({ colIdx: c, grupo: grupoEncontrado });
          gruposDetectadosSet.add(grupoEncontrado.nombre);
        }
      }

      // Si encontramos columnas de grupos en esta fila, procesar las filas de materias siguientes
      if (columnasGrupos.length > 0) {
        for (let mRow = r + 1; mRow < data.length; mRow++) {
          const filaMateria = data[mRow];
          if (!filaMateria || filaMateria.length === 0) continue;

          // Si nos topamos con otra fila que parece encabezado de grupos o título de semestre, detener este bloque
          const esNuevoEncabezado = filaMateria.some(cel => {
            const str = String(cel || '').trim();
            return str.match(/^[1-6][°º\-_]?[A-J]$/i);
          });
          if (esNuevoEncabezado) {
            break;
          }

          const textoMateria = String(filaMateria[0] || filaMateria[1] || '').trim();
          if (!textoMateria || textoMateria.toUpperCase().includes('MATERIA') || textoMateria.toUpperCase().includes('UAC')) {
            continue;
          }

          // Para cada grupo detectado en este bloque
          for (const { colIdx, grupo } of columnasGrupos) {
            const uacsGrupo = getUACsGrupoFn(grupo);
            // Encontrar qué UAC corresponde a esta fila
            const uacMatch = uacsGrupo.find(u => coincideMateria(textoMateria, u.uacName, u.tipo));

            const textoDocente = String(filaMateria[colIdx] || '').trim();
            if (!textoDocente) continue;

            const uacFinalName = uacMatch ? uacMatch.uacName : textoMateria;
            const horasSemanales = uacMatch ? Number(uacMatch.horasSemanales || 3) : 3;

            const resultadoMatch = buscarDocenteCoincidente(textoDocente, personalDocente);

            cargasResultado.push({
              semestre: grupo.semestre,
              grupoId: grupo.id,
              grupoNombre: grupo.nombre,
              uacName: uacFinalName,
              horasSemanales,
              docenteTextoExcel: textoDocente,
              personalId: resultadoMatch.personalId,
              docenteNombreMatch: resultadoMatch.docenteNombreMatch,
              confianza: resultadoMatch.confianza,
              valido: resultadoMatch.confianza === 'EXACTA' || resultadoMatch.confianza === 'MEDIA',
            });
          }
        }
      }
    }
  }

  // Si no encontró por estructura de tabla por columnas, intentar formato plano de lista
  if (cargasResultado.length === 0) {
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

    for (const row of rows) {
      const gNombreRaw = row['Grupo'] || row['GRUPO'] || row['grupo'] || '';
      const uacRaw = row['Materia'] || row['MATERIA'] || row['Asignatura'] || row['UAC'] || '';
      const docRaw = row['Docente'] || row['DOCENTE'] || row['Maestro'] || row['Profesor'] || '';

      if (!gNombreRaw || !uacRaw) continue;

      const grupoNormalizado = normalizarNombreGrupo(gNombreRaw);
      const grupo = gruposActivos.find(g => normalizarNombreGrupo(g.nombre) === grupoNormalizado);
      if (!grupo) continue;

      gruposDetectadosSet.add(grupo.nombre);
      const uacsGrupo = getUACsGrupoFn(grupo);
      const uacMatch = uacsGrupo.find(u => coincideMateria(uacRaw, u.uacName, u.tipo));

      const uacFinalName = uacMatch ? uacMatch.uacName : uacRaw;
      const horasSemanales = uacMatch ? Number(uacMatch.horasSemanales || 3) : 3;
      const resultadoMatch = buscarDocenteCoincidente(docRaw, personalDocente);

      cargasResultado.push({
        semestre: grupo.semestre,
        grupoId: grupo.id,
        grupoNombre: grupo.nombre,
        uacName: uacFinalName,
        horasSemanales,
        docenteTextoExcel: docRaw,
        personalId: resultadoMatch.personalId,
        docenteNombreMatch: resultadoMatch.docenteNombreMatch,
        confianza: resultadoMatch.confianza,
        valido: resultadoMatch.confianza === 'EXACTA' || resultadoMatch.confianza === 'MEDIA',
      });
    }
  }

  // Deduplicar cargas por clave única grupoId + uacName
  const cargasMap = new Map<string, CargaImportada>();
  for (const c of cargasResultado) {
    const key = `${c.grupoId}___${c.uacName}`;
    cargasMap.set(key, c);
  }
  const cargasDeduplicadas = Array.from(cargasMap.values());

  const asignadasConExito = cargasDeduplicadas.filter(c => c.confianza === 'EXACTA' || c.confianza === 'MEDIA').length;
  const requierenRevision = cargasDeduplicadas.filter(c => c.confianza === 'NO_ENCONTRADO').length;
  const vacios = cargasDeduplicadas.filter(c => c.confianza === 'VACIO').length;

  return {
    cargas: cargasDeduplicadas,
    resumen: {
      totalAsignaciones: cargasDeduplicadas.length,
      asignadasConExito,
      requierenRevision,
      vacios,
    },
    gruposDetectados: Array.from(gruposDetectadosSet),
  };
}

/**
 * Genera y descarga un archivo Excel (.xlsx) con el formato de Matriz por Semestre
 * adaptado exactamente a los grupos y materias del plantel
 */
export function descargarPlantillaMatrizDocente(
  grupos: any[],
  periodoActivo: 'A' | 'B',
  getUACsGrupoFn: (grupo: any) => any[],
  docentesDisponibles: any[] = []
) {
  const wb = XLSX.utils.book_new();

  const semestres = periodoActivo === 'A' ? [1, 3, 5] : [2, 4, 6];
  const filasExcel: any[][] = [];

  // Título principal
  filasExcel.push([`MATRIZ DE ASIGNACIÓN DOCENTE POR GRUPO - PERÍODO ${periodoActivo === 'A' ? 'A (1º, 3º, 5º)' : 'B (2º, 4º, 6º)'}`]);
  filasExcel.push(['Instrucciones: En cada columna de grupo, escriba el nombre o apellidos del docente que impartirá la materia.']);
  filasExcel.push([]);

  for (const sem of semestres) {
    const gruposSem = grupos.filter(g => g.semestre === sem);
    if (gruposSem.length === 0) continue;

    // Encabezado del semestre
    const headerFila = ['Materia (UAC)', 'Horas'];
    gruposSem.forEach(g => {
      headerFila.push(g.nombre);
    });

    filasExcel.push([`--- ${sem}° SEMESTRE ---`]);
    filasExcel.push(headerFila);

    // Obtener las materias del primer grupo como referencia base
    const uacsBase = getUACsGrupoFn(gruposSem[0]);

    uacsBase.forEach((uac, uacIdx) => {
      const filaMateria: any[] = [uac.uacName, `${uac.horasSemanales || 3}h`];

      gruposSem.forEach((g) => {
        const uacsG = getUACsGrupoFn(g);
        const uacG = uacsG[uacIdx] || uac;
        filaMateria.push('');
      });

      filasExcel.push(filaMateria);
    });

    filasExcel.push([]); // Espacio entre semestres
  }

  // Hoja 1: Matriz de Cargas
  const ws = XLSX.utils.aoa_to_sheet(filasExcel);
  ws['!cols'] = [
    { wch: 45 }, // Materia
    { wch: 8 },  // Horas
    { wch: 25 }, // Grupo A
    { wch: 25 }, // Grupo B
    { wch: 25 }, // Grupo C
    { wch: 25 }, // Grupo D
    { wch: 25 }, // Grupo E
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Matriz_Horarios');

  // Hoja 2: Directorio de Personal de la Escuela
  if (docentesDisponibles.length > 0) {
    const filasDocentes: any[][] = [
      ['DIRECTORIO DE PERSONAL DE LA ESCUELA'],
      ['Copie y pegue estos nombres en la hoja "Matriz_Horarios" para asegurar coincidencia exacta:'],
      [],
      ['Nombre Completo', 'Cargo', 'Horas Base', 'Email'],
    ];

    docentesDisponibles.forEach((d) => {
      filasDocentes.push([
        `${d.apellidoPaterno || ''} ${d.apellidoMaterno || ''} ${d.nombre || ''}`.trim(),
        d.cargo || 'DOCENTE',
        `${d.horasAsignadas ?? d.horas_base ?? 20} hrs`,
        d.email || '',
      ]);
    });

    const wsDoc = XLSX.utils.aoa_to_sheet(filasDocentes);
    wsDoc['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 12 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsDoc, 'Docentes_Plantel');
  }

  XLSX.writeFile(wb, `Plantilla_Matriz_Horarios_${periodoActivo}.xlsx`);
}
