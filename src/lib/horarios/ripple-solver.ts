export interface CeldaHorario {
  id?: string;
  diaSemana: number; // 1..5
  periodo: number;   // 1..numHorasPorDia
  grupoId: string;
  docenteId: string;
  asignaturaId?: string;
  aulaId?: string;
  esBloqueado?: boolean;
  grupo?: any;
  docente?: any;
  asignatura?: any;
  aula?: any;
  [key: string]: any;
}

function isSlotLibreBloqueadoParaCelda(
  dia: number,
  periodo: number,
  celda: CeldaHorario,
  slotsLibresBloqueados: Set<string>
): boolean {
  if (!slotsLibresBloqueados || slotsLibresBloqueados.size === 0) return false;
  const keyGrp = `${dia}_${periodo}_${celda.grupoId}`;
  const keyDoc = `${dia}_${periodo}_${celda.docenteId}`;
  const keyAula = celda.aulaId ? `${dia}_${periodo}_${celda.aulaId}` : null;

  return (
    slotsLibresBloqueados.has(keyGrp) ||
    slotsLibresBloqueados.has(keyDoc) ||
    (keyAula !== null && slotsLibresBloqueados.has(keyAula))
  );
}

export function reacomodarHorarioConRipple(
  celdasOriginales: CeldaHorario[],
  celdaAMover: CeldaHorario,
  targetDia: number,
  targetPeriodo: number,
  numHorasPorDia: number = 6,
  slotsLibresBloqueados: Set<string> = new Set()
): { success: boolean; celdasActualizadas?: CeldaHorario[]; numMovidas?: number; error?: string } {
  if (!celdaAMover) {
    return { success: false, error: "No se especificó la celda a mover." };
  }

  if (celdaAMover.esBloqueado) {
    return { success: false, error: "🔒 Esta celda está fijada con candado. Desbloquéela antes de moverla." };
  }

  if (celdaAMover.diaSemana === targetDia && celdaAMover.periodo === targetPeriodo) {
    return { success: true, celdasActualizadas: celdasOriginales, numMovidas: 0 };
  }

  if (isSlotLibreBloqueadoParaCelda(targetDia, targetPeriodo, celdaAMover, slotsLibresBloqueados)) {
    return { success: false, error: "🔒 La casilla destino o el horario del docente/grupo está fijado como hora libre." };
  }

  const celdasCopy: CeldaHorario[] = celdasOriginales.map((c) => ({ ...c }));

  const targetIndex = celdasCopy.findIndex(
    (c) =>
      (c.id && c.id === celdaAMover.id) ||
      (c.diaSemana === celdaAMover.diaSemana &&
        c.periodo === celdaAMover.periodo &&
        c.grupoId === celdaAMover.grupoId &&
        c.docenteId === celdaAMover.docenteId)
  );

  if (targetIndex === -1) {
    return { success: false, error: "No se encontró la celda seleccionada en la matriz." };
  }

  celdasCopy[targetIndex].diaSemana = targetDia;
  celdasCopy[targetIndex].periodo = targetPeriodo;

  const isFixed = (idx: number) => idx === targetIndex || Boolean(celdasCopy[idx].esBloqueado);

  for (let i = 0; i < celdasCopy.length; i++) {
    if (!isFixed(i)) continue;
    const c1 = celdasCopy[i];

    if (isSlotLibreBloqueadoParaCelda(c1.diaSemana, c1.periodo, c1, slotsLibresBloqueados)) {
      return { success: false, error: `🔒 Colisión con slot bloqueado en la celda fijada (Día ${c1.diaSemana}, P${c1.periodo}).` };
    }

    for (let j = i + 1; j < celdasCopy.length; j++) {
      if (!isFixed(j)) continue;
      const c2 = celdasCopy[j];

      if (c1.diaSemana === c2.diaSemana && c1.periodo === c2.periodo) {
        if (c1.grupoId === c2.grupoId) {
          return { success: false, error: `Colisión de Grupo insalvable entre celdas fijas en (Día ${c1.diaSemana}, P${c1.periodo}).` };
        }
        if (c1.docenteId === c2.docenteId) {
          return { success: false, error: `Colisión de Docente insalvable entre celdas fijas en (Día ${c1.diaSemana}, P${c1.periodo}).` };
        }
      }
    }
  }

  const findCollisions = (state: CeldaHorario[]) => {
    const conflicts: { index: number; reason: string }[] = [];

    for (let i = 0; i < state.length; i++) {
      const c1 = state[i];

      if (isSlotLibreBloqueadoParaCelda(c1.diaSemana, c1.periodo, c1, slotsLibresBloqueados)) {
        conflicts.push({ index: i, reason: "SLOT_LIBRE_BLOQUEADO" });
        continue;
      }

      for (let j = 0; j < state.length; j++) {
        if (i === j) continue;
        const c2 = state[j];

        if (c1.diaSemana === c2.diaSemana && c1.periodo === c2.periodo) {
          if (c1.grupoId === c2.grupoId || c1.docenteId === c2.docenteId) {
            conflicts.push({ index: i, reason: "EMPALME" });
            break;
          }
        }
      }
    }
    return conflicts;
  };

  const isSlotValidForCelda = (
    c: CeldaHorario,
    d: number,
    p: number,
    state: CeldaHorario[],
    ignoreIndex: number
  ) => {
    if (isSlotLibreBloqueadoParaCelda(d, p, c, slotsLibresBloqueados)) return false;

    for (let i = 0; i < state.length; i++) {
      if (i === ignoreIndex) continue;
      const other = state[i];

      if (other.diaSemana === d && other.periodo === p) {
        if (other.grupoId === c.grupoId || other.docenteId === c.docenteId) {
          return false;
        }
      }
    }
    return true;
  };

  let maxAttempts = 150;
  let currentAttempt = 0;

  while (currentAttempt < maxAttempts) {
    currentAttempt++;
    const conflicts = findCollisions(celdasCopy);

    if (conflicts.length === 0) {
      let numMovidas = 0;
      for (let i = 0; i < celdasCopy.length; i++) {
        if (
          celdasCopy[i].diaSemana !== celdasOriginales[i].diaSemana ||
          celdasCopy[i].periodo !== celdasOriginales[i].periodo
        ) {
          numMovidas++;
        }
      }

      return {
        success: true,
        celdasActualizadas: celdasCopy,
        numMovidas,
      };
    }

    const firstConflict = conflicts.find((conf) => !isFixed(conf.index));

    if (!firstConflict) {
      return {
        success: false,
        error: "Conflicto insalvable entre celdas fijadas con candado.",
      };
    }

    const conflictIdx = firstConflict.index;
    const celdaEnConflicto = celdasCopy[conflictIdx];

    let foundNewSpot = false;

    for (let dia = 1; dia <= 5; dia++) {
      for (let p = 1; p <= numHorasPorDia; p++) {
        if (isSlotValidForCelda(celdaEnConflicto, dia, p, celdasCopy, conflictIdx)) {
          celdasCopy[conflictIdx].diaSemana = dia;
          celdasCopy[conflictIdx].periodo = p;
          foundNewSpot = true;
          break;
        }
      }
      if (foundNewSpot) break;
    }

    if (!foundNewSpot) {
      let bestDia = -1;
      let bestP = -1;
      let minConflictsInCandidate = Infinity;

      for (let dia = 1; dia <= 5; dia++) {
        for (let p = 1; p <= numHorasPorDia; p++) {
          if (isSlotLibreBloqueadoParaCelda(dia, p, celdaEnConflicto, slotsLibresBloqueados)) {
            continue;
          }

          let score = 0;
          for (let i = 0; i < celdasCopy.length; i++) {
            if (i === conflictIdx) continue;
            const other = celdasCopy[i];
            if (other.diaSemana === dia && other.periodo === p) {
              if (isFixed(i)) {
                score += 100; // Penalizar fuertemente empalmarse con fija
              } else {
                score += 1;
              }
            }
          }

          if (score < minConflictsInCandidate) {
            minConflictsInCandidate = score;
            bestDia = dia;
            bestP = p;
          }
        }
      }

      if (bestDia !== -1 && bestP !== -1) {
        celdasCopy[conflictIdx].diaSemana = bestDia;
        celdasCopy[conflictIdx].periodo = bestP;
      } else {
        return {
          success: false,
          error: `No hay espacio disponible para la materia de ${celdaEnConflicto.docente?.nombreCompleto || "Docente"} en el grupo.`,
        };
      }
    }
  }

  return {
    success: false,
    error: "No se pudo encontrar una combinación libre sin colisiones tras el desplazamiento en cascada.",
  };
}
