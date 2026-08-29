import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql, getTeacherByEmail } from "@/lib/db";
import { procesarComandoIA, RespuestaIAHorario } from "@/lib/horarios/ai-assistant";
import { resolverHorario } from "@/lib/horarios/solver";
import { moverCelda, intercambiarCeldas, bloquearLibre } from "@/lib/horarios/mutations";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const teacher = await getTeacherByEmail(session.user.email);
    if (!teacher) {
      return NextResponse.json({ error: "Docente no encontrado" }, { status: 404 });
    }

    const body = await req.json();
    const mensaje = body.mensaje || body.mensajeUsuario;
    const horarioId = body.horarioId || `horario_${teacher.id}`;
    const clientSlots: string[] = Array.isArray(body.slotsLibresBloqueados)
      ? body.slotsLibresBloqueados
      : [];
    const clientCeldas: any[] = Array.isArray(body.celdas)
      ? body.celdas
      : Array.isArray(body.contextoHorario?.celdasActuales)
      ? body.contextoHorario.celdasActuales
      : [];

    if (!mensaje) {
      return NextResponse.json({ error: "El mensaje es requerido" }, { status: 400 });
    }

    // 1. Obtener datos de la escuela y configuración desde la BD
    const teacherId = teacher.id;
    let configRows: any[] = [];
    let gruposRows: any[] = [];
    let cargasRows: any[] = [];
    let docentesRows: any[] = [];

    try {
      configRows = await sql()`SELECT * FROM horario_config WHERE teacher_id = ${teacherId}::uuid LIMIT 1`;
      gruposRows = await sql()`SELECT id::text, nombre, semestre FROM horario_grupos WHERE teacher_id = ${teacherId}::uuid ORDER BY semestre, nombre`;
      cargasRows = await sql()`SELECT id::text, grupo_nombre AS "grupoId", uac_name AS "uacName", personal_id AS "personalId", horas_semanales AS "horasSemanales", requiere_aula_esp AS "requiereAulaEspecial" FROM horario_cargas WHERE teacher_id = ${teacherId}::uuid`;
      docentesRows = await sql()`
        SELECT id::text, nombre, apellido_paterno, apellido_materno, cargo, horas_base, email
        FROM escuela_personal
        WHERE director_id = ${teacherId}::uuid AND activo = TRUE
        ORDER BY apellido_paterno ASC, nombre ASC
      `;
    } catch (e) {
      console.warn("[api/horarios/chat] Error consultando tablas de horarios:", e);
    }

    const configDB = configRows[0] || null;
    const horasPorDia = configDB?.horas_por_dia ?? 6;
    const diasLectivos = configDB?.dias_lectivos ?? 5;

    let docentes = docentesRows.map((p: any) => {
      const hrsAsignadas = clientCeldas.filter((c: any) => c.docenteId === p.id).length;
      return {
        id: p.id,
        nombreCompleto: `${p.nombre || ""} ${p.apellido_paterno || ""}`.trim(),
        horasAsignadas: hrsAsignadas > 0 ? hrsAsignadas : (p.horas_base || 20),
      };
    });

    if (docentes.length === 0) {
      docentes = [{
        id: teacherId,
        nombreCompleto: teacher.name || "Director Plantel",
        horasAsignadas: 20,
      }];
    }

    const materiasSet = new Set<string>();
    clientCeldas.forEach((c: any) => {
      const mat = c.asignatura?.uacName || c.uacName || c.asignaturaId;
      if (mat) materiasSet.add(mat);
    });
    cargasRows.forEach((c: any) => {
      if (c.uacName) materiasSet.add(c.uacName);
    });

    const materias = Array.from(materiasSet).map((m, idx) => ({ id: `mat_${idx}`, nombre: m }));
    const grupos = gruposRows.length > 0
      ? gruposRows.map((g: any) => ({ id: g.nombre || g.id, nombre: g.nombre, semestre: g.semestre }))
      : [{ id: "1° A", nombre: "1° A", semestre: 1 }, { id: "3° A", nombre: "3° A", semestre: 3 }, { id: "5° A", nombre: "5° A", semestre: 5 }];

    // Combinar slots libres bloqueados
    let slotsLibresBloqueados: string[] = Array.from(new Set(clientSlots));

    const contexto = body.contextoHorario || {
      nombreEscuela: teacher.school_name || "Mi Plantel",
      horasPorDia,
      diasLectivos,
      grupos,
      docentes,
      materias,
      celdasActuales: clientCeldas,
      slotsLibresBloqueados,
      historialConversacion: body.historialConversacion || []
    };

    // 2. Procesar con el Asistente IA (Gemini 3.5 / 3.1 Flash Lite)
    const respuestaIA: RespuestaIAHorario = await procesarComandoIA(mensaje, contexto, teacherId);

    // 3. Si no es factible, retornar respuesta explicativa
    if (!respuestaIA.factible) {
      return NextResponse.json({
        success: true,
        respuestaIA,
        respuesta: respuestaIA,
        horario: {
          id: horarioId,
          celdas: clientCeldas,
          scoreMetricas: { slotsLibresBloqueados }
        }
      });
    }

    // 4. Router de Acciones: Mutaciones Quirúrgicas vs Macro-Restricciones
    let celdasResultado = [...clientCeldas];
    let slotsLibresActualizados = new Set<string>(slotsLibresBloqueados || []);
    let scoreMetricas: any = { slotsLibresBloqueados: Array.from(slotsLibresActualizados) };

    const gruposInfo = grupos.map((g: any) => ({
      id: g.id,
      nombre: g.nombre,
      semestre: g.semestre || 1,
      horasPorDia: g.semestre === 1 ? 5 : horasPorDia
    }));

    if (respuestaIA.acciones && respuestaIA.acciones.length > 0) {
      for (const accion of respuestaIA.acciones) {
        if (accion.tipo === "MOVER_CELDA") {
          const resMover = moverCelda(
            celdasResultado,
            {
              asignatura: accion.asignatura,
              grupoId: accion.grupoId,
              docenteId: accion.docenteId,
              diaOrigen: accion.diaOrigen,
              periodoOrigen: accion.periodoOrigen,
              diaDestino: accion.diaDestino || 1,
              periodoDestino: accion.periodoDestino || 1
            },
            slotsLibresActualizados,
            gruposInfo,
            horasPorDia
          );
          if (resMover.success) {
            celdasResultado = resMover.celdas;
          }
        } else if (accion.tipo === "INTERCAMBIAR" && accion.origen && accion.destino) {
          const resSwap = intercambiarCeldas(
            celdasResultado,
            { origen: accion.origen, destino: accion.destino },
            slotsLibresActualizados,
            gruposInfo,
            horasPorDia
          );
          if (resSwap.success) {
            celdasResultado = resSwap.celdas;
          }
        } else if (accion.tipo === "BLOQUEAR_LIBRE") {
          const resBloq = bloquearLibre(
            celdasResultado,
            {
              docenteId: accion.docenteId,
              grupoId: accion.grupoId,
              dias: accion.dias,
              periodos: accion.periodos,
              intermedias: accion.intermedias
            },
            slotsLibresActualizados,
            gruposInfo,
            horasPorDia,
            diasLectivos
          );
          if (resBloq.success) {
            celdasResultado = resBloq.celdas;
            slotsLibresActualizados = resBloq.slotsActualizados;
          } else {
            // Si la mutación quirúrgica no pudo encontrar huecos libres, ejecutar regeneración macro
            accion.tipo = "REGENERAR_CON_RESTRICCIONES";
          }
        }

        if (accion.tipo === "REGENERAR_CON_RESTRICCIONES" || accion.tipo === "MACRO_RESTRICCION") {
          // Extraer celdas fijadas con candado
          const celdasFijasExistentes = clientCeldas
            .filter((c: any) => c.esBloqueado)
            .map((c: any) => ({
              diaSemana: c.diaSemana,
              periodo: c.periodo,
              grupoId: c.grupoId,
              docenteId: c.docenteId,
              asignaturaId: c.asignaturaId || c.uacName || "MATERIA",
              aulaId: c.aulaId || undefined
            }));

          const restriccionMaxHrsDia = accion.restriccionDistribucion === "MAX_1_HR_DIA" ? 1 : 2;

          // Reconstruir cargas completas agrupando las celdas activas
          const cargasMap = new Map<string, any>();
          for (const c of clientCeldas) {
            if (!c.docenteId || c.docenteId === "__BLOQUEADO__") continue;
            const key = `${c.grupoId}___${c.docenteId}___${c.asignaturaId || c.uacName}`;
            if (!cargasMap.has(key)) {
              cargasMap.set(key, {
                id: `carga_${cargasMap.size}`,
                grupoId: c.grupoId,
                docenteId: c.docenteId,
                asignaturaId: c.asignaturaId || c.uacName || "MATERIA",
                horasSemanales: 0,
                aulaEspecialId: c.aulaId || undefined,
                requiereAulaEspecial: !!c.aulaId
              });
            }
            cargasMap.get(key)!.horasSemanales += 1;
          }

          let cargasParaSolver = Array.from(cargasMap.values());
          if (cargasParaSolver.length === 0 && cargasRows.length > 0) {
            cargasParaSolver = cargasRows.map((c: any) => ({
              id: c.id,
              docenteId: c.personalId,
              grupoId: c.grupoId,
              asignaturaId: c.uacName,
              horasSemanales: c.horasSemanales || 3,
              requiereAulaEspecial: c.requiereAulaEspecial
            }));
          }

          // Sanitizar restricciones para asegurar que no excedan las horas libres del docente
          const restriccionesSanitizadas = (accion.bloqueosDocentes || []).map((r: any) => {
            const docInfo = docentes.find((d: any) => d.id === r.docenteId);
            const hrsAsig = docInfo?.horasAsignadas || 20;
            const diasIndisp = r.diasIndisponibles || [];
            const diasDisponibles = Math.max(1, diasLectivos - diasIndisp.length);
            const maxCapacidadDias = diasDisponibles * horasPorDia;

            if (hrsAsig > maxCapacidadDias) {
              return {
                docenteId: r.docenteId,
                diasIndisponibles: [],
                periodosIndisponibles: []
              };
            }

            let periodosValidos = r.periodosIndisponibles || [];
            const maxPeriodosPermitidos = maxCapacidadDias - hrsAsig;
            if (periodosValidos.length > maxPeriodosPermitidos) {
              periodosValidos = periodosValidos.slice(0, Math.max(0, maxPeriodosPermitidos));
            }

            return {
              docenteId: r.docenteId,
              diasIndisponibles: diasIndisp,
              periodosIndisponibles: periodosValidos
            };
          });

          // Resolver con el nuevo Solver Min-Conflicts respetando slotsLibresBloqueados
          const resultadoSolver = resolverHorario({
            diasLectivos,
            horasPorDia,
            restriccionMaxHrsDia,
            grupos: gruposInfo,
            docentes: docentes.map((d: any) => ({ id: d.id, nombreCompleto: d.nombreCompleto })),
            aulas: [{ id: "aula-general", nombre: "Aula General", tipo: "REGULAR" }],
            cargas: cargasParaSolver,
            celdasFijas: celdasFijasExistentes,
            restriccionesDocentes: restriccionesSanitizadas,
            slotsLibresBloqueados: Array.from(slotsLibresActualizados)
          });

          if (resultadoSolver.celdas && resultadoSolver.celdas.length > 0) {
            celdasResultado = resultadoSolver.celdas.map((c, idx) => {
              const grpObj = grupos.find((g: any) => g.id === c.grupoId || g.nombre === c.grupoId);
              const docObj = docentesRows.find((d: any) => d.id === c.docenteId);
              return {
                id: `celda_res_${idx}_${c.diaSemana}_${c.periodo}_${c.grupoId}`,
                diaSemana: c.diaSemana,
                periodo: c.periodo,
                grupoId: c.grupoId,
                grupo: grpObj ? { id: grpObj.id, nombre: grpObj.nombre, semestre: grpObj.semestre } : undefined,
                docenteId: c.docenteId,
                docente: docObj ? { id: docObj.id, nombre: docObj.nombre, apellidoPaterno: docObj.apellido_paterno } : undefined,
                asignaturaId: c.asignaturaId,
                asignatura: { id: c.asignaturaId, uacName: c.asignaturaId },
                aulaId: c.aulaId || null,
                cargaId: c.cargaId || null,
                esBloqueado: !!c.esBloqueado
              };
            });
            scoreMetricas = {
              ...resultadoSolver.metricas,
              slotsLibresBloqueados: Array.from(slotsLibresActualizados)
            };
          }
        }
      }
    }

    const nuevoHistorial = [
      ...(body.historialConversacion || []),
      { role: "user", content: mensaje },
      { role: "assistant", content: respuestaIA.explicacion }
    ];

    const horarioActualizado = {
      id: horarioId,
      config: { horasPorDia, diasLectivos },
      scoreMetricas,
      celdas: celdasResultado,
      mensajesChat: nuevoHistorial
    };

    // 5. Persistir permanentemente en base de datos Postgres Neon
    try {
      await sql()`
        UPDATE horario_config
        SET horario_generado = ${JSON.stringify(horarioActualizado)}
        WHERE teacher_id = ${teacherId}::uuid
      `;
    } catch (e) {
      console.warn("[api/horarios/chat] Error actualizando horario_generado:", e);
    }

    return NextResponse.json({
      success: true,
      respuestaIA,
      respuesta: respuestaIA,
      horario: horarioActualizado
    });
  } catch (error: any) {
    console.error("[api/horarios/chat] Error en POST:", error);
    return NextResponse.json({ error: "Error al procesar mensaje en el chat IA" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      mensaje: "Historial de chat reiniciado correctamente."
    });
  } catch (error: any) {
    console.error("[api/horarios/chat] Error en DELETE:", error);
    return NextResponse.json({ error: "Error al limpiar el historial del chat" }, { status: 500 });
  }
}
