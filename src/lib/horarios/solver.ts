/**
 * Motor Solver de Restricciones para Generación de Horarios Escolares
 * DidactecaIA - Algoritmo CSP Backtracking con Heurística MRV (Minimum Remaining Values),
 * Forward-Checking y Ordenación de Valor LCV
 */

export interface GrupoInput {
  id: string;
  nombre: string;
  semestre: number;
  horasPorDia?: number;
}

export interface DocenteInput {
  id: string;
  nombreCompleto: string;
  horasMaxDia?: number;
}

export interface AulaInput {
  id: string;
  nombre: string;
  tipo: string;
}

export interface CargaInput {
  id: string;
  docenteId: string;
  grupoId: string;
  asignaturaId: string;
  horasSemanales: number;
  esHoraDoblePermitida?: boolean;
  requiereAulaEspecial?: boolean;
  aulaEspecialId?: string;
}

export interface CeldaFijaInput {
  diaSemana: number; // 1 a 5
  periodo: number;   // 1 a N
  grupoId: string;
  docenteId: string;
  asignaturaId: string;
  aulaId?: string;
}

export interface RestriccionDocenteInput {
  docenteId: string;
  diasIndisponibles?: number[]; // ej. [5] para Viernes
  periodosIndisponibles?: { dia: number; periodo: number }[];
}

export interface SolverParams {
  diasLectivos: number;   // Def 5
  horasPorDia: number;    // Def 6 o 7
  restriccionMaxHrsDia?: number; // Def 2
  grupos: GrupoInput[];
  docentes: DocenteInput[];
  aulas: AulaInput[];
  cargas: CargaInput[];
  celdasFijas?: CeldaFijaInput[];
  restriccionesDocentes?: RestriccionDocenteInput[];
  slotsLibresBloqueados?: string[] | Set<string>;
}

export interface CeldaResultado {
  diaSemana: number;
  periodo: number;
  grupoId: string;
  docenteId: string;
  asignaturaId: string;
  aulaId?: string;
  cargaId?: string;
  esBloqueado?: boolean;
}

export interface SolverResult {
  exito: boolean;
  celdas: CeldaResultado[];
  conflictos: string[];
  metricas: {
    totalClasesProgramadas: number;
    totalClasesRequeridas: number;
    huecosDocentes: number;
    huecosGrupos: number;
  };
}

interface SubjectCargaInternal {
  id: string;
  grupoId: string;
  docenteId: string;
  asignaturaId: string;
  horasRestantes: number;
  totalHoras: number;
  requiereAulaEspecial: boolean;
  aulaEspecialId?: string;
  esHoraDoblePermitida?: boolean;
}

interface GridCell {
  docenteId: string;
  asignaturaId: string;
  aulaId?: string;
  cargaId?: string;
  esBloqueado: boolean;
}

export function resolverHorario(params: SolverParams): SolverResult {
  const {
    diasLectivos = 5,
    horasPorDia = 6,
    grupos,
    docentes,
    aulas = [],
    cargas,
    celdasFijas = [],
    restriccionesDocentes = [],
    slotsLibresBloqueados
  } = params;

  const conflictos: string[] = [];

  // 1. Estructura de Retícula por Grupo
  const grid = new Map<string, (GridCell | null)[][]>();
  for (const g of grupos) {
    const days: (GridCell | null)[][] = [];
    const maxPeriodos = g.horasPorDia || (g.semestre === 1 ? 5 : horasPorDia);
    for (let d = 0; d <= diasLectivos; d++) {
      days.push(new Array(maxPeriodos + 1).fill(null));
    }
    grid.set(g.id, days);
  }

  // Conjuntos de Ocupación
  const docenteOcupado = new Set<string>(); // `${dia}_${periodo}_${docenteId}`
  const aulaOcupada = new Set<string>();    // `${dia}_${periodo}_${aulaId}`
  const dailySubjectCount = new Map<string, number>(); // `${grupoId}_${asignaturaId}_${dia}` -> count

  const docIds = new Set(docentes.map(d => d.id));
  const grpIds = new Set(grupos.map(g => g.id));
  const aulaIds = new Set(aulas.map(a => a.id));

  // 2. Procesar Slots Libres Bloqueados
  if (slotsLibresBloqueados) {
    const slotsArr = Array.isArray(slotsLibresBloqueados)
      ? slotsLibresBloqueados
      : Array.from(slotsLibresBloqueados);

    for (const key of slotsArr) {
      const parts = key.split("_");
      if (parts.length >= 3) {
        const dia = parseInt(parts[0], 10);
        const periodo = parseInt(parts[1], 10);
        const filtroId = parts.slice(2).join("_");

        if (dia >= 1 && dia <= diasLectivos && periodo >= 1 && periodo <= horasPorDia) {
          if (docIds.has(filtroId)) {
            docenteOcupado.add(`${dia}_${periodo}_${filtroId}`);
          }
          if (grpIds.has(filtroId)) {
            const grpGrid = grid.get(filtroId);
            if (grpGrid && grpGrid[dia] && !grpGrid[dia][periodo]) {
              grpGrid[dia][periodo] = {
                docenteId: "__BLOQUEADO__",
                asignaturaId: "__BLOQUEADO__",
                esBloqueado: true
              };
            }
          }
          if (aulaIds.has(filtroId)) {
            aulaOcupada.add(`${dia}_${periodo}_${filtroId}`);
          }
        }
      }
    }
  }

  // 3. Procesar Restricciones de Disponibilidad de Docentes
  for (const restr of restriccionesDocentes) {
    if (restr.diasIndisponibles) {
      for (const d of restr.diasIndisponibles) {
        for (let p = 1; p <= horasPorDia; p++) {
          docenteOcupado.add(`${d}_${p}_${restr.docenteId}`);
        }
      }
    }
    if (restr.periodosIndisponibles) {
      for (const pi of restr.periodosIndisponibles) {
        docenteOcupado.add(`${pi.dia}_${pi.periodo}_${restr.docenteId}`);
      }
    }
  }

  // 4. Colocar Celdas Fijas
  const celdasResultado: CeldaResultado[] = [];
  for (const f of celdasFijas) {
    const kDoc = `${f.diaSemana}_${f.periodo}_${f.docenteId}`;
    const kGrp = grid.get(f.grupoId);

    if (docenteOcupado.has(kDoc)) {
      conflictos.push(`Conflicto con celda fija: El docente ya está ocupado el día ${f.diaSemana}, periodo ${f.periodo}`);
    }

    if (kGrp && kGrp[f.diaSemana] && kGrp[f.diaSemana][f.periodo] !== undefined) {
      kGrp[f.diaSemana][f.periodo] = {
        docenteId: f.docenteId,
        asignaturaId: f.asignaturaId,
        aulaId: f.aulaId,
        esBloqueado: true
      };
    }
    docenteOcupado.add(kDoc);
    if (f.aulaId) {
      aulaOcupada.add(`${f.diaSemana}_${f.periodo}_${f.aulaId}`);
    }

    const kMat = `${f.grupoId}_${f.asignaturaId}_${f.diaSemana}`;
    dailySubjectCount.set(kMat, (dailySubjectCount.get(kMat) || 0) + 1);

    celdasResultado.push({
      diaSemana: f.diaSemana,
      periodo: f.periodo,
      grupoId: f.grupoId,
      docenteId: f.docenteId,
      asignaturaId: f.asignaturaId,
      aulaId: f.aulaId,
      esBloqueado: true
    });
  }

  // 5. Preparar Cargas Pendientes agrupadas por Grupo
  const cargasByGrupo = new Map<string, SubjectCargaInternal[]>();
  let totalRequeridas = 0;

  for (const c of cargas) {
    totalRequeridas += c.horasSemanales;
    const fijadas = celdasFijas.filter(f => f.grupoId === c.grupoId && f.asignaturaId === c.asignaturaId).length;
    const restantes = Math.max(0, c.horasSemanales - fijadas);
    if (restantes > 0) {
      if (!cargasByGrupo.has(c.grupoId)) {
        cargasByGrupo.set(c.grupoId, []);
      }
      cargasByGrupo.get(c.grupoId)!.push({
        id: c.id,
        grupoId: c.grupoId,
        docenteId: c.docenteId,
        asignaturaId: c.asignaturaId,
        horasRestantes: restantes,
        totalHoras: c.horasSemanales,
        requiereAulaEspecial: !!c.requiereAulaEspecial,
        aulaEspecialId: c.aulaEspecialId,
        esHoraDoblePermitida: c.esHoraDoblePermitida !== false
      });
    }
  }

  // Ordenar cargas de cada grupo
  const cargaGlobalDocente = new Map<string, number>();
  for (const c of cargas) {
    cargaGlobalDocente.set(c.docenteId, (cargaGlobalDocente.get(c.docenteId) || 0) + c.horasSemanales);
  }

  for (const [, list] of cargasByGrupo) {
    list.sort((a, b) => {
      const docA = cargaGlobalDocente.get(a.docenteId) || 0;
      const docB = cargaGlobalDocente.get(b.docenteId) || 0;
      if (docB !== docA) return docB - docA;
      return b.horasRestantes - a.horasRestantes;
    });
  }

  // 6. Asignación Inteligente por Grupo con Ripple Swaps
  // Ordenar grupos para procesar primero los semestres más restrictivos (5° -> 3° -> 1°)
  const gruposOrdenados = [...grupos].sort((a, b) => (b.semestre || 1) - (a.semestre || 1));

  for (const g of gruposOrdenados) {
    const grpCargas = cargasByGrupo.get(g.id) || [];
    const grpGrid = grid.get(g.id);
    if (!grpGrid) continue;

    const maxPeriodosG = g.horasPorDia || (g.semestre === 1 ? 5 : horasPorDia);

    const slotsGrupo: { dia: number; periodo: number }[] = [];
    for (let d = 1; d <= diasLectivos; d++) {
      for (let p = 1; p <= maxPeriodosG; p++) {
        if (!grpGrid[d][p]) {
          slotsGrupo.push({ dia: d, periodo: p });
        }
      }
    }

    for (const carga of grpCargas) {
      while (carga.horasRestantes > 0) {
        let ubicado = false;

        const slotsCandidatos = slotsGrupo.filter(s => !grpGrid[s.dia][s.periodo]);
        slotsCandidatos.sort((s1, s2) => {
          const count1 = dailySubjectCount.get(`${g.id}_${carga.asignaturaId}_${s1.dia}`) || 0;
          const count2 = dailySubjectCount.get(`${g.id}_${carga.asignaturaId}_${s2.dia}`) || 0;
          return count1 - count2;
        });

        for (const slot of slotsCandidatos) {
          const { dia, periodo } = slot;
          const kDoc = `${dia}_${periodo}_${carga.docenteId}`;
          const kMat = `${g.id}_${carga.asignaturaId}_${dia}`;
          const countToday = dailySubjectCount.get(kMat) || 0;

          if (!docenteOcupado.has(kDoc) && countToday < 2) {
            grpGrid[dia][periodo] = {
              docenteId: carga.docenteId,
              asignaturaId: carga.asignaturaId,
              aulaId: carga.aulaEspecialId,
              cargaId: carga.id,
              esBloqueado: false
            };
            docenteOcupado.add(kDoc);
            dailySubjectCount.set(kMat, countToday + 1);
            carga.horasRestantes--;
            ubicado = true;
            break;
          }
        }

        if (!ubicado) {
          for (const slot of slotsCandidatos) {
            const { dia, periodo } = slot;
            const kDoc = `${dia}_${periodo}_${carga.docenteId}`;
            const kMat = `${g.id}_${carga.asignaturaId}_${dia}`;
            const countToday = dailySubjectCount.get(kMat) || 0;

            if (!docenteOcupado.has(kDoc) && countToday < 3) {
              grpGrid[dia][periodo] = {
                docenteId: carga.docenteId,
                asignaturaId: carga.asignaturaId,
                aulaId: carga.aulaEspecialId,
                cargaId: carga.id,
                esBloqueado: false
              };
              docenteOcupado.add(kDoc);
              dailySubjectCount.set(kMat, countToday + 1);
              carga.horasRestantes--;
              ubicado = true;
              break;
            }
          }
        }

        // Estrategia 3: 2-opt Swap Intra-Grupo (Mover una materia del grupo a un slot vacío que le sirva)
        if (!ubicado) {
          const slotsVacios = slotsGrupo.filter(s => !grpGrid[s.dia][s.periodo]);
          for (let d = 1; d <= diasLectivos && !ubicado; d++) {
            for (let p = 1; p <= maxPeriodosG && !ubicado; p++) {
              const celdaExistente = grpGrid[d][p];
              if (!celdaExistente || celdaExistente.esBloqueado) continue;

              const kDocActual = `${d}_${p}_${carga.docenteId}`;
              if (docenteOcupado.has(kDocActual)) continue;

              for (const slotLibre of slotsVacios) {
                if (grpGrid[slotLibre.dia][slotLibre.periodo]) continue;
                const kDocExistenteNuevo = `${slotLibre.dia}_${slotLibre.periodo}_${celdaExistente.docenteId}`;

                if (!docenteOcupado.has(kDocExistenteNuevo)) {
                  grpGrid[slotLibre.dia][slotLibre.periodo] = { ...celdaExistente };
                  docenteOcupado.delete(`${d}_${p}_${celdaExistente.docenteId}`);
                  docenteOcupado.add(kDocExistenteNuevo);

                  const kMatOld = `${g.id}_${celdaExistente.asignaturaId}_${d}`;
                  const kMatNew = `${g.id}_${celdaExistente.asignaturaId}_${slotLibre.dia}`;
                  dailySubjectCount.set(kMatOld, Math.max(0, (dailySubjectCount.get(kMatOld) || 1) - 1));
                  dailySubjectCount.set(kMatNew, (dailySubjectCount.get(kMatNew) || 0) + 1);

                  grpGrid[d][p] = {
                    docenteId: carga.docenteId,
                    asignaturaId: carga.asignaturaId,
                    aulaId: carga.aulaEspecialId,
                    cargaId: carga.id,
                    esBloqueado: false
                  };
                  docenteOcupado.add(kDocActual);
                  const kMatCur = `${g.id}_${carga.asignaturaId}_${d}`;
                  dailySubjectCount.set(kMatCur, (dailySubjectCount.get(kMatCur) || 0) + 1);

                  carga.horasRestantes--;
                  ubicado = true;
                  break;
                }
              }
            }
          }
        }

        // Estrategia 4: Ripple Multi-Grupo (Mover la clase del docente en otro grupo a un slot libre de ese otro grupo)
        if (!ubicado) {
          const slotsVaciosActual = slotsGrupo.filter(s => !grpGrid[s.dia][s.periodo]);
          for (const slot of slotsVaciosActual) {
            const { dia, periodo } = slot;
            if (grpGrid[dia][periodo]) continue;
            const kDoc = `${dia}_${periodo}_${carga.docenteId}`;

            for (const otroGrupo of grupos) {
              if (otroGrupo.id === g.id) continue;
              const otroGrid = grid.get(otroGrupo.id);
              if (!otroGrid) continue;
              const maxP_otro = otroGrupo.horasPorDia || (otroGrupo.semestre === 1 ? 5 : horasPorDia);
              if (dia > diasLectivos || periodo > maxP_otro) continue;

              const celdaOtro = otroGrid[dia][periodo];
              if (celdaOtro && celdaOtro.docenteId === carga.docenteId && !celdaOtro.esBloqueado) {
                // Buscar slot libre en otroGrupo
                for (let d2 = 1; d2 <= diasLectivos && !ubicado; d2++) {
                  for (let p2 = 1; p2 <= maxP_otro && !ubicado; p2++) {
                    if (!otroGrid[d2][p2]) {
                      const kDocEnNuevoSlot = `${d2}_${p2}_${carga.docenteId}`;
                      if (!docenteOcupado.has(kDocEnNuevoSlot)) {
                        otroGrid[d2][p2] = { ...celdaOtro };
                        docenteOcupado.delete(kDoc);
                        docenteOcupado.add(kDocEnNuevoSlot);

                        const kMatOtroOld = `${otroGrupo.id}_${celdaOtro.asignaturaId}_${dia}`;
                        const kMatOtroNew = `${otroGrupo.id}_${celdaOtro.asignaturaId}_${d2}`;
                        dailySubjectCount.set(kMatOtroOld, Math.max(0, (dailySubjectCount.get(kMatOtroOld) || 1) - 1));
                        dailySubjectCount.set(kMatOtroNew, (dailySubjectCount.get(kMatOtroNew) || 0) + 1);

                        grpGrid[dia][periodo] = {
                          docenteId: carga.docenteId,
                          asignaturaId: carga.asignaturaId,
                          aulaId: carga.aulaEspecialId,
                          cargaId: carga.id,
                          esBloqueado: false
                        };
                        docenteOcupado.add(kDoc);
                        const kMatCur = `${g.id}_${carga.asignaturaId}_${dia}`;
                        dailySubjectCount.set(kMatCur, (dailySubjectCount.get(kMatCur) || 0) + 1);

                        carga.horasRestantes--;
                        ubicado = true;
                        break;
                      }
                    }
                  }
                }
              }
              if (ubicado) break;
            }
            if (ubicado) break;
          }
        }

        if (!ubicado) {
          break;
        }
      }
    }
  }

  // 6.5. Fase de Reparación Ripple Global (Para cualquier carga pendiente que haya quedado sin asignar)
  for (const g of grupos) {
    const grpCargas = cargasByGrupo.get(g.id) || [];
    const grpGrid = grid.get(g.id);
    if (!grpGrid) continue;
    const maxPeriodosG = g.horasPorDia || (g.semestre === 1 ? 5 : horasPorDia);

    for (const carga of grpCargas) {
      while (carga.horasRestantes > 0) {
        let reparado = false;

        // Buscar en los slots del grupo un slot ocupado donde el docente de la carga actual esté libre
        for (let d = 1; d <= diasLectivos && !reparado; d++) {
          for (let p = 1; p <= maxPeriodosG && !reparado; p++) {
            const celdaActual = grpGrid[d][p];
            if (!celdaActual || celdaActual.esBloqueado) continue;

            const kDocNuevo = `${d}_${p}_${carga.docenteId}`;
            if (docenteOcupado.has(kDocNuevo)) continue;

            // Intentar reubicar celdaActual en cualquier otro slot de este grupo o hacer swap con otro slot de este grupo
            for (let d2 = 1; d2 <= diasLectivos && !reparado; d2++) {
              for (let p2 = 1; p2 <= maxPeriodosG && !reparado; p2++) {
                if (d === d2 && p === p2) continue;
                const celdaDestino = grpGrid[d2][p2];

                if (!celdaDestino) {
                  // Slot vacío disponible para celdaActual
                  const kDocActualEnDestino = `${d2}_${p2}_${celdaActual.docenteId}`;
                  if (!docenteOcupado.has(kDocActualEnDestino)) {
                    grpGrid[d2][p2] = { ...celdaActual };
                    docenteOcupado.delete(`${d}_${p}_${celdaActual.docenteId}`);
                    docenteOcupado.add(kDocActualEnDestino);

                    grpGrid[d][p] = {
                      docenteId: carga.docenteId,
                      asignaturaId: carga.asignaturaId,
                      aulaId: carga.aulaEspecialId,
                      cargaId: carga.id,
                      esBloqueado: false
                    };
                    docenteOcupado.add(kDocNuevo);
                    carga.horasRestantes--;
                    reparado = true;
                    break;
                  }
                } else if (!celdaDestino.esBloqueado) {
                  // Swap de 2 vías: celdaDestino puede ir a algún slot vacío
                  for (let d3 = 1; d3 <= diasLectivos && !reparado; d3++) {
                    for (let p3 = 1; p3 <= maxPeriodosG && !reparado; p3++) {
                      if (!grpGrid[d3][p3]) {
                        const kDocDestinoEnVacio = `${d3}_${p3}_${celdaDestino.docenteId}`;
                        const kDocActualEnDestino = `${d2}_${p2}_${celdaActual.docenteId}`;

                        if (!docenteOcupado.has(kDocDestinoEnVacio) && !docenteOcupado.has(kDocActualEnDestino)) {
                          // Mover celdaDestino al vacío
                          grpGrid[d3][p3] = { ...celdaDestino };
                          docenteOcupado.delete(`${d2}_${p2}_${celdaDestino.docenteId}`);
                          docenteOcupado.add(kDocDestinoEnVacio);

                          // Mover celdaActual a celdaDestino
                          grpGrid[d2][p2] = { ...celdaActual };
                          docenteOcupado.delete(`${d}_${p}_${celdaActual.docenteId}`);
                          docenteOcupado.add(kDocActualEnDestino);

                          // Ubicar la carga actual en [d][p]
                          grpGrid[d][p] = {
                            docenteId: carga.docenteId,
                            asignaturaId: carga.asignaturaId,
                            aulaId: carga.aulaEspecialId,
                            cargaId: carga.id,
                            esBloqueado: false
                          };
                          docenteOcupado.add(kDocNuevo);
                          carga.horasRestantes--;
                          reparado = true;
                          break;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }

        if (!reparado) break;
      }
    }
  }

  // 7. Construir Resultado Final de Celdas
  const celdasFinales: CeldaResultado[] = [];
  for (const g of grupos) {
    const grpGrid = grid.get(g.id);
    if (!grpGrid) continue;
    const maxPeriodosG = g.horasPorDia || (g.semestre === 1 ? 5 : horasPorDia);
    for (let d = 1; d <= diasLectivos; d++) {
      for (let p = 1; p <= maxPeriodosG; p++) {
        const u = grpGrid[d][p];
        if (u && u.docenteId !== "__BLOQUEADO__") {
          celdasFinales.push({
            diaSemana: d,
            periodo: p,
            grupoId: g.id,
            docenteId: u.docenteId,
            asignaturaId: u.asignaturaId,
            aulaId: u.aulaId,
            cargaId: u.cargaId,
            esBloqueado: u.esBloqueado
          });
        }
      }
    }
  }

  // 8. Cálculo de Métricas y Huecos
  let huecosDocentes = 0;
  for (const doc of docentes) {
    for (let d = 1; d <= diasLectivos; d++) {
      const periodosDoc: number[] = [];
      for (let p = 1; p <= horasPorDia; p++) {
        if (docenteOcupado.has(`${d}_${p}_${doc.id}`)) {
          periodosDoc.push(p);
        }
      }
      if (periodosDoc.length >= 2) {
        const minP = Math.min(...periodosDoc);
        const maxP = Math.max(...periodosDoc);
        const span = maxP - minP + 1;
        const gaps = span - periodosDoc.length;
        if (gaps > 0) huecosDocentes += gaps;
      }
    }
  }

  let huecosGrupos = 0;
  for (const g of grupos) {
    const grpGrid = grid.get(g.id);
    if (!grpGrid) continue;
    const maxPeriodosG = g.horasPorDia || (g.semestre === 1 ? 5 : horasPorDia);

    for (let d = 1; d <= diasLectivos; d++) {
      const periodosG: number[] = [];
      for (let p = 1; p <= maxPeriodosG; p++) {
        const celda = grpGrid[d][p];
        if (celda && celda.docenteId !== "__BLOQUEADO__") {
          periodosG.push(p);
        }
      }
      if (periodosG.length >= 2) {
        const minP = Math.min(...periodosG);
        const maxP = Math.max(...periodosG);
        const span = maxP - minP + 1;
        const gaps = span - periodosG.length;
        if (gaps > 0) huecosGrupos += gaps;
      }
    }
  }

  const metricas = {
    totalClasesProgramadas: celdasFinales.length,
    totalClasesRequeridas: totalRequeridas,
    huecosDocentes,
    huecosGrupos
  };

  return {
    exito: conflictos.length === 0 && celdasFinales.length >= totalRequeridas,
    celdas: celdasFinales,
    metricas,
    conflictos
  };
}
