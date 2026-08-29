"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Send,
  FileSpreadsheet,
  FileText,
  Lock,
  Unlock,
  Users,
  UserCheck,
  Building2,
  Grid,
  Sliders,
  MessageSquare,
  X,
  Package,
  Download,
  Check,
  Trash2,
  Save,
  RefreshCw
} from "lucide-react";
import toast from "react-hot-toast";
import { exportarHorarioExcel, exportarHorarioPDF, exportarHorarioDOCX, exportarSumarioExcel, getHashColor } from "@/lib/horarios/exportador";
import { reacomodarHorarioConRipple } from "@/lib/horarios/ripple-solver";

interface Props {
  escuela: any;
  horarioInicial: any;
  grupos: any[];
  docentes: any[];
  aulas: any[];
  cargas: any[];
  onVolverAWizard: () => void;
  onGuardarHorario?: (horarioGuardado: any) => void;
  esAdmin?: boolean;
}

const PALETA_ESTILOS: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: "rgba(37, 99, 235, 0.25)", text: "#93c5fd", border: "#3b82f6" },
  green: { bg: "rgba(22, 163, 74, 0.25)", text: "#86efac", border: "#22c55e" },
  yellow: { bg: "rgba(202, 138, 4, 0.25)", text: "#fef08a", border: "#eab308" },
  orange: { bg: "rgba(234, 88, 12, 0.25)", text: "#fed7aa", border: "#f97316" },
  pink: { bg: "rgba(219, 39, 119, 0.25)", text: "#fbcfe8", border: "#ec4899" },
  purple: { bg: "rgba(147, 51, 234, 0.25)", text: "#e9d5ff", border: "#a855f7" },
  teal: { bg: "rgba(13, 148, 136, 0.25)", text: "#99f6e4", border: "#14b8a6" },
  cyan: { bg: "rgba(8, 145, 178, 0.25)", text: "#a5f3fc", border: "#06b6d4" }
};

const ESTILOS_ARRAY = Object.values(PALETA_ESTILOS);

export default function EditorHorarios({
  escuela,
  horarioInicial,
  grupos,
  docentes,
  aulas,
  cargas,
  onVolverAWizard,
  onGuardarHorario,
  esAdmin = false
}: Props) {
  const [horario, setHorario] = useState<any>(horarioInicial);
  const [hayCambiosSinGuardar, setHayCambiosSinGuardar] = useState<boolean>(false);
  const [guardandoCambios, setGuardandoCambios] = useState<boolean>(false);
  const [vistaTab, setVistaTab] = useState<"GRUPO" | "DOCENTE" | "AULA" | "SUMARIO">("GRUPO");
  const [periodoFiltro, setPeriodoFiltro] = useState<"A" | "B">("A");
  
  const [grupoSeleccionadoId, setGrupoSeleccionadoId] = useState<string>(grupos[0]?.id || "");
  const [docenteSeleccionadoId, setDocenteSeleccionadoId] = useState<string>(docentes[0]?.id || "");
  const [aulaSeleccionadaId, setAulaSeleccionadaId] = useState<string>(aulas[0]?.id || "");

  // Grupos filtrados según periodo semestral (A = 1°,3°,5° | B = 2°,4°,6°)
  const gruposVisibles = React.useMemo(() => {
    const semestresDeseados = periodoFiltro === "A" ? [1, 3, 5] : [2, 4, 6];
    const filtrados = grupos.filter((g) => semestresDeseados.includes(g.semestre));
    if (filtrados.length > 0) return filtrados;

    if (periodoFiltro === "B") {
      const impares = grupos.filter((g) => [1, 3, 5].includes(g.semestre));
      if (impares.length > 0) {
        return impares.map((g) => {
          const semB = g.semestre === 1 ? 2 : g.semestre === 3 ? 4 : 6;
          const letra = g.nombre.split(" ")[1] || "A";
          return {
            ...g,
            id: `virtual_${semB}_${letra}`,
            semestre: semB,
            nombre: `${semB}° ${letra}`
          };
        });
      }
    }

    return grupos;
  }, [grupos, periodoFiltro]);

  React.useEffect(() => {
    if (gruposVisibles.length > 0) {
      const yaExiste = gruposVisibles.some((g) => g.id === grupoSeleccionadoId);
      if (!yaExiste) {
        setGrupoSeleccionadoId(gruposVisibles[0].id);
      }
    }
  }, [gruposVisibles]);

  const tieneHorarioGeneradoParaGrupo = React.useMemo(() => {
    if (!horario?.celdas || horario.celdas.length === 0) return false;
    if (vistaTab === "GRUPO") {
      const grp = gruposVisibles.find((g) => g.id === grupoSeleccionadoId) || grupos.find((g) => g.id === grupoSeleccionadoId);
      const idsValidos = [grupoSeleccionadoId, grp?.id, grp?.nombre].filter(Boolean);
      return horario.celdas.some((c: any) => idsValidos.includes(c.grupoId) || idsValidos.includes(c.grupo?.id) || idsValidos.includes(c.grupo?.nombre));
    }
    return true;
  }, [horario, vistaTab, grupoSeleccionadoId, gruposVisibles, grupos]);

  const [mostrarModalExportar, setMostrarModalExportar] = useState<boolean>(false);
  const [mostrarChat, setMostrarChat] = useState<boolean>(true);

  const [mensajeChat, setMensajeChat] = useState<string>("");
  const [enviandoChat, setEnviandoChat] = useState<boolean>(false);
  const [chatHistorial, setChatHistorial] = useState<any[]>(horarioInicial?.mensajesChat || []);
  const [limpiadoChat, setLimpiadoChat] = useState<boolean>(false);

  const [slotsLibresBloqueados, setSlotsLibresBloqueados] = useState<Set<string>>(() => {
    const initialArr = horarioInicial?.scoreMetricas?.slotsLibresBloqueados;
    if (Array.isArray(initialArr) && initialArr.length > 0) {
      return new Set(initialArr);
    }
    if (typeof window !== "undefined" && escuela?.id && horarioInicial?.id) {
      try {
        const saved = localStorage.getItem(`horarios_slots_libres_${escuela.id}_${horarioInicial.id}`);
        if (saved) return new Set(JSON.parse(saved));
      } catch (e) {}
    }
    return new Set();
  });

  const toggleBloquearSlotLibre = (dia: number, periodo: number, filtroId: string) => {
    const key = `${dia}_${periodo}_${filtroId}`;
    setSlotsLibresBloqueados(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(key)) {
        nuevo.delete(key);
        toast.success("Hora libre desbloqueada");
      } else {
        nuevo.add(key);
        toast.success("🔒 Hora libre fijada — el sistema no colocará clases aquí");
      }
      if (typeof window !== "undefined" && escuela?.id && horario?.id) {
        try {
          localStorage.setItem(`horarios_slots_libres_${escuela.id}_${horario.id}`, JSON.stringify(Array.from(nuevo)));
        } catch (e) {}
      }
      setHayCambiosSinGuardar(true);
      return nuevo;
    });
  };

  const esSlotLibreBloqueado = (dia: number, periodo: number, filtroId: string) =>
    slotsLibresBloqueados.has(`${dia}_${periodo}_${filtroId}`);

  const [draggedCelda, setDraggedCelda] = useState<any>(null);
  const [dragOverPos, setDragOverPos] = useState<{ dia: number; periodo: number } | null>(null);

  const diasLectivos = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
  const numHorasPorDia = horarioInicial?.config?.horasPorDia || horario?.config?.horasPorDia || 6;
  const periodos = Array.from({ length: numHorasPorDia }, (_, i) => i + 1);
  
  const grupoActivoObj = React.useMemo(() => {
    return gruposVisibles.find((g) => g.id === grupoSeleccionadoId) || grupos.find((g) => g.id === grupoSeleccionadoId);
  }, [gruposVisibles, grupos, grupoSeleccionadoId]);

  const docenteActivoObj = React.useMemo(() => {
    return docentes.find((d) => d.id === docenteSeleccionadoId);
  }, [docentes, docenteSeleccionadoId]);

  const horasGrupoActual = React.useMemo(() => {
    if (!grupoActivoObj) return numHorasPorDia;
    return (grupoActivoObj as any).horasPorDia || (grupoActivoObj.semestre === 1 ? 5 : numHorasPorDia);
  }, [grupoActivoObj, numHorasPorDia]);

  const periodosVisibles = React.useMemo(() => {
    if (vistaTab === "GRUPO") {
      return Array.from({ length: horasGrupoActual }, (_, i) => i + 1);
    }
    return Array.from({ length: numHorasPorDia }, (_, i) => i + 1);
  }, [vistaTab, horasGrupoActual, numHorasPorDia]);

  const getEstiloAsignatura = (uacName: string) => {
    if (!uacName) return ESTILOS_ARRAY[0];
    let hash = 0;
    for (let i = 0; i < uacName.length; i++) {
      hash = uacName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % ESTILOS_ARRAY.length;
    return ESTILOS_ARRAY[idx];
  };

  const getNombreAsignaturaCelda = (celda: any) => {
    if (!celda) return "";
    if (celda.asignatura?.uacName) return celda.asignatura.uacName;
    if (celda.uacName) return celda.uacName;
    
    const cargaMatch = cargas.find(c => c.asignaturaId === celda.asignaturaId || c.id === celda.cargaId || c.uacName === celda.asignaturaId);
    if (cargaMatch?.uacName) return cargaMatch.uacName;

    return celda.asignaturaId || "UAC / Materia";
  };

  const getNombreDocenteCelda = (celda: any) => {
    if (!celda) return "";
    if (celda.docente?.nombre) {
      return `${celda.docente.nombre} ${celda.docente.apellidoPaterno || ""}`.trim();
    }
    const docObj = docentes.find(d => d.id === celda.docenteId);
    if (docObj) {
      return `${docObj.nombre} ${docObj.apellidoPaterno || ""}`.trim();
    }
    return celda.docenteId || "Docente";
  };

  const getNombreGrupoCelda = (celda: any) => {
    if (!celda) return "";
    if (celda.grupo?.nombre) return `Grupo ${celda.grupo.nombre}`;
    const gObj = grupos.find((g: any) => g.id === celda.grupoId || g.nombre === celda.grupoId);
    if (gObj) return `Grupo ${gObj.nombre}`;
    return `Grupo ${celda.grupoId || ""}`;
  };

  // Handlers de Drag & Drop
  const handleDragStart = (e: React.DragEvent, celda: any) => {
    if (celda.esBloqueado) {
      e.preventDefault();
      toast.error("🔒 Esta celda está fijada con candado. Desbloquéala antes de moverla.");
      return;
    }
    setDraggedCelda(celda);
    e.dataTransfer.setData("text/plain", celda.id || `${celda.diaSemana}_${celda.periodo}_${celda.grupoId}`);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, dia: number, periodo: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!dragOverPos || dragOverPos.dia !== dia || dragOverPos.periodo !== periodo) {
      setDragOverPos({ dia, periodo });
    }
  };

  const handleDragLeave = () => {
    setDragOverPos(null);
  };

  const handleDragEnd = () => {
    setDraggedCelda(null);
    setDragOverPos(null);
  };

  const handleDropOnSlot = (targetDia: number, targetPeriodo: number) => {
    setDragOverPos(null);
    if (!draggedCelda || !horario?.celdas) return;

    const sourceDia = draggedCelda.diaSemana;
    const sourcePeriodo = draggedCelda.periodo;

    // Si se soltó en la misma posición, no hacer nada
    if (sourceDia === targetDia && sourcePeriodo === targetPeriodo) {
      setDraggedCelda(null);
      return;
    }

    if (draggedCelda.esBloqueado) {
      toast.error("🔒 La materia seleccionada está fijada con candado.");
      setDraggedCelda(null);
      return;
    }

    // Buscar si en el grupo de la celda arrastrada ya hay una materia en la posición destino
    const targetCeldaEnGrupo = horario.celdas.find(
      (c: any) => c.diaSemana === targetDia && c.periodo === targetPeriodo && c.grupoId === draggedCelda.grupoId
    );

    if (targetCeldaEnGrupo?.esBloqueado) {
      toast.error("🔒 La celda de destino está fijada con candado. Desbloquéala para permitir el intercambio.");
      setDraggedCelda(null);
      return;
    }

    // Verificar si el docente de la celda arrastrada ya está ocupado en otro grupo a esa misma hora en el día destino
    const docenteOcupadoEnDestino = horario.celdas.find(
      (c: any) =>
        c.diaSemana === targetDia &&
        c.periodo === targetPeriodo &&
        c.docenteId === draggedCelda.docenteId &&
        c.id !== draggedCelda.id &&
        c.grupoId !== draggedCelda.grupoId
    );

    if (docenteOcupadoEnDestino) {
      const grpConflicto = grupos.find(g => g.id === docenteOcupadoEnDestino.grupoId)?.nombre || docenteOcupadoEnDestino.grupoId;
      toast.error(`⚠️ Conflicto: El docente ya tiene clase en ${grpConflicto} en ese horario.`);
      setDraggedCelda(null);
      return;
    }

    // Si hay intercambio (swap), verificar si el docente de la celda destino no se empalma en la posición origen
    if (targetCeldaEnGrupo) {
      const docenteDestinoOcupadoEnOrigen = horario.celdas.find(
        (c: any) =>
          c.diaSemana === sourceDia &&
          c.periodo === sourcePeriodo &&
          c.docenteId === targetCeldaEnGrupo.docenteId &&
          c.id !== targetCeldaEnGrupo.id &&
          c.grupoId !== targetCeldaEnGrupo.grupoId
      );

      if (docenteDestinoOcupadoEnOrigen) {
        const grpConflicto = grupos.find(g => g.id === docenteDestinoOcupadoEnOrigen.grupoId)?.nombre || docenteDestinoOcupadoEnOrigen.grupoId;
        toast.error(`⚠️ Conflicto: El docente de intercambio ya tiene clase en ${grpConflicto} en el horario de origen.`);
        setDraggedCelda(null);
        return;
      }
    }

    // Aplicar el movimiento / swap en la lista de celdas
    const nuevasCeldas = horario.celdas.map((c: any) => {
      // Celda arrastrada -> pasa a targetDia, targetPeriodo
      if (c.id === draggedCelda.id || (c.diaSemana === sourceDia && c.periodo === sourcePeriodo && c.grupoId === draggedCelda.grupoId)) {
        return { ...c, diaSemana: targetDia, periodo: targetPeriodo };
      }
      // Celda de destino (si existía) -> pasa a sourceDia, sourcePeriodo (SWAP)
      if (targetCeldaEnGrupo && (c.id === targetCeldaEnGrupo.id || (c.diaSemana === targetDia && c.periodo === targetPeriodo && c.grupoId === targetCeldaEnGrupo.grupoId))) {
        return { ...c, diaSemana: sourceDia, periodo: sourcePeriodo };
      }
      return c;
    });

    const horarioActualizado = { ...horario, celdas: nuevasCeldas };
    setHorario(horarioActualizado);
    setHayCambiosSinGuardar(true);
    setDraggedCelda(null);

    const matNombre = getNombreAsignaturaCelda(draggedCelda);
    if (targetCeldaEnGrupo) {
      const matTargetNombre = getNombreAsignaturaCelda(targetCeldaEnGrupo);
      toast.success(`🔄 Intercambio: "${matNombre}" ⇄ "${matTargetNombre}"`);
    } else {
      toast.success(`✅ "${matNombre}" reubicada al Día ${targetDia}, Hora ${targetPeriodo}`);
    }
  };

  const getCeldaInfo = (diaSemana: number, periodo: number) => {
    if (!horario?.celdas) return null;

    if (vistaTab === "GRUPO") {
      const idsValidos = [grupoSeleccionadoId, grupoActivoObj?.id, grupoActivoObj?.nombre].filter(Boolean);
      return horario.celdas.find(
        (c: any) => c.diaSemana === diaSemana && c.periodo === periodo && (idsValidos.includes(c.grupoId) || idsValidos.includes(c.grupo?.id) || idsValidos.includes(c.grupo?.nombre))
      );
    } else if (vistaTab === "DOCENTE") {
      return horario.celdas.find(
        (c: any) => c.diaSemana === diaSemana && c.periodo === periodo && c.docenteId === docenteSeleccionadoId
      );
    } else if (vistaTab === "AULA") {
      return horario.celdas.find(
        (c: any) => c.diaSemana === diaSemana && c.periodo === periodo && c.aulaId === aulaSeleccionadaId
      );
    }
    return null;
  };

  const toggleBloquearCelda = (celda: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!celda || !horario?.celdas) return;

    const estadoNuevo = !celda.esBloqueado;
    const celdasActualizadas = horario.celdas.map((c: any) => {
      if (c.id === celda.id || (c.diaSemana === celda.diaSemana && c.periodo === celda.periodo && c.grupoId === celda.grupoId)) {
        return { ...c, esBloqueado: estadoNuevo };
      }
      return c;
    });

    setHorario({ ...horario, celdas: celdasActualizadas });
    setHayCambiosSinGuardar(true);
    toast.success(estadoNuevo ? "🔒 Celda fijada (la IA no la moverá)" : "Celda desbloqueada para la IA");
  };

  const handleGuardarHorarioDB = async () => {
    if (!horario?.id || guardandoCambios) return;
    setGuardandoCambios(true);

    try {
      const res = await fetch("/api/horarios/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          horarioId: horario.id,
          celdas: horario.celdas,
          slotsLibresBloqueados: Array.from(slotsLibresBloqueados),
          escuelaId: escuela?.id
        })
      });

      const data = await res.json();
      if (data.success) {
        setHorario(data.horario);
        setHayCambiosSinGuardar(false);
        if (onGuardarHorario) {
          onGuardarHorario(data.horario);
        }
        toast.success("💾 ¡Horario guardado permanentemente!");
      } else {
        toast.error(data.error || "Error al guardar el horario");
      }
    } catch (err) {
      toast.error("Error de conexión al guardar el horario");
    } finally {
      setGuardandoCambios(false);
    }
  };

  const handleEnviarMensajeIA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensajeChat.trim() || enviandoChat) return;

    const userMsg = mensajeChat.trim();
    setMensajeChat("");
    setEnviandoChat(true);
    setLimpiadoChat(false);

    setChatHistorial((prev) => [...prev, { role: "user", content: userMsg }]);

    try {
      const res = await fetch("/api/horarios/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          horarioId: horario.id,
          mensaje: userMsg,
          slotsLibresBloqueados: Array.from(slotsLibresBloqueados),
          celdas: horario.celdas,
          historialConversacion: chatHistorial
        })
      });

      const data = await res.json();
      if (data.success) {
        setHorario(data.horario);
        if (onGuardarHorario) {
          onGuardarHorario(data.horario);
        }
        if (data.horario?.scoreMetricas?.slotsLibresBloqueados && Array.isArray(data.horario.scoreMetricas.slotsLibresBloqueados)) {
          const nuevosSlots = new Set<string>(data.horario.scoreMetricas.slotsLibresBloqueados);
          setSlotsLibresBloqueados(nuevosSlots);
          if (typeof window !== "undefined" && escuela?.id && horario?.id) {
            try {
              localStorage.setItem(`horarios_slots_libres_${escuela.id}_${horario.id}`, JSON.stringify(Array.from(nuevosSlots)));
            } catch (e) {}
          }
        }
        setChatHistorial(data.horario.mensajesChat || []);
        setHayCambiosSinGuardar(false);
        toast.success("✨ ¡Horario reorganizado con éxito por la IA!");
      } else {
        toast.error(data.error || "Error al procesar mensaje");
      }
    } catch (err) {
      toast.error("Error de conexión con el chat de IA");
    } finally {
      setEnviandoChat(false);
    }
  };

  const handleLimpiarChat = async () => {
    if (!horario?.id) return;
    const confirmar = window.confirm(
      "¿Limpiar el historial de chat? Los mensajes anteriores se borrarán."
    );
    if (!confirmar) return;

    try {
      const res = await fetch(`/api/horarios/chat?horarioId=${horario.id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        setChatHistorial([]);
        setLimpiadoChat(true);
        toast.success("🗑️ Historial del chat limpiado correctamente");
      } else {
        toast.error(data.error || "Error al limpiar el chat");
      }
    } catch (err) {
      toast.error("Error de conexión al limpiar el chat");
    }
  };

  const ejecutarExportacion = async (
    opcion: "VISTA_ACTUAL" | "PAQUETE_DOCENTES" | "PAQUETE_GRUPOS" | "SUMARIO_MAESTRO" | "SUMARIO_GRUPO",
    formato: "PDF" | "EXCEL" | "DOCX"
  ) => {
    setMostrarModalExportar(false);

    if (opcion === "SUMARIO_MAESTRO") {
      exportarSumarioExcel(
        {
          nombreEscuela: escuela?.nombre || escuela?.school_name || "Mi Plantel",
          cct: escuela?.cct || "CCT",
          dias: diasLectivos,
          numHorasPorDia,
          entidades: docentes.map(d => ({
            id: d.id,
            etiqueta: `${d.apellidoPaterno || ""} ${d.nombre || ""}`.trim()
          })),
          obtenerCelda: (docenteId, dia, periodo) => {
            const c = horario?.celdas?.find(
              (cc: any) => cc.diaSemana === dia && cc.periodo === periodo && cc.docenteId === docenteId
            );
            if (!c) return null;
            const grpObj = grupos.find((g: any) => g.id === c.grupoId);
            const mat = getNombreAsignaturaCelda(c);
            return { texto: `${mat}${grpObj ? ` [${grpObj.nombre}]` : ""}` };
          }
        },
        "DOCENTE"
      );
      toast.success("📊 Sumario Maestro generado en Excel");
      return;
    }

    if (opcion === "SUMARIO_GRUPO") {
      exportarSumarioExcel(
        {
          nombreEscuela: escuela?.nombre || escuela?.school_name || "Mi Plantel",
          cct: escuela?.cct || "CCT",
          dias: diasLectivos,
          numHorasPorDia,
          entidades: grupos.map(g => ({ id: g.id, etiqueta: `Grupo ${g.nombre}` })),
          obtenerCelda: (grupoId, dia, periodo) => {
            const c = horario?.celdas?.find(
              (cc: any) => cc.diaSemana === dia && cc.periodo === periodo && cc.grupoId === grupoId
            );
            if (!c) return null;
            const mat = getNombreAsignaturaCelda(c);
            const doc = getNombreDocenteCelda(c);
            return { texto: `${mat}${doc ? ` [${doc}]` : ""}` };
          }
        },
        "GRUPO"
      );
      toast.success("📊 Sumario por Grupo generado en Excel");
      return;
    }

    const filasExport: any[] = [];
    let tipoVistaPDF: any = "GRUPO";
    let tituloTabla = "";

    if (opcion === "VISTA_ACTUAL") {
      if (vistaTab === "GRUPO") {
        const g = grupos.find(item => item.id === grupoSeleccionadoId);
        tituloTabla = `HORARIO POR GRUPO: ${g?.nombre || "GRUPO"}`;
        const celdasMapa: any = {};
        for (let d = 1; d <= 5; d++) {
          for (let p = 1; p <= numHorasPorDia; p++) {
            const celda = getCeldaInfo(d, p);
            if (celda) {
              celdasMapa[`${d}_${p}`] = { materia: getNombreAsignaturaCelda(celda), docente: getNombreDocenteCelda(celda), grupo: g?.nombre };
            }
          }
        }
        filasExport.push({ encabezado: `GRUPO: ${g?.nombre || ""}`, celdas: celdasMapa });
      } else if (vistaTab === "DOCENTE") {
        const dObj = docentes.find(item => item.id === docenteSeleccionadoId);
        const nomDoc = dObj ? `${dObj.nombre} ${dObj.apellidoPaterno || ""}`.trim() : "DOCENTE";
        tituloTabla = `HORARIO PERSONAL DEL DOCENTE: ${nomDoc}`;
        const celdasMapa: any = {};
        for (let d = 1; d <= 5; d++) {
          for (let p = 1; p <= numHorasPorDia; p++) {
            const celda = getCeldaInfo(d, p);
            if (celda) {
              const grpObj = grupos.find(g => g.id === celda.grupoId);
              celdasMapa[`${d}_${p}`] = { materia: getNombreAsignaturaCelda(celda), docente: nomDoc, grupo: grpObj?.nombre || celda.grupoId };
            }
          }
        }
        filasExport.push({ encabezado: `DOCENTE: ${nomDoc}`, celdas: celdasMapa });
        tipoVistaPDF = "DOCENTE";
      } else {
        tituloTabla = "SUMARIO GENERAL DEL PLANTEL";
        tipoVistaPDF = "SUMARIO";
      }
    } else if (opcion === "PAQUETE_DOCENTES") {
      tituloTabla = "PAQUETE OFICIAL DE HORARIOS INDIVIDUALES POR DOCENTE";
      tipoVistaPDF = "PAQUETE_DOCENTES";
      for (const docObj of docentes) {
        const nomDoc = `${docObj.nombre} ${docObj.apellidoPaterno || ""}`.trim();
        const celdasMapa: any = {};
        for (let d = 1; d <= 5; d++) {
          for (let p = 1; p <= numHorasPorDia; p++) {
            const celda = horario?.celdas?.find((c: any) => c.diaSemana === d && c.periodo === p && c.docenteId === docObj.id);
            if (celda) {
              const grpObj = grupos.find(g => g.id === celda.grupoId);
              celdasMapa[`${d}_${p}`] = { materia: getNombreAsignaturaCelda(celda), docente: nomDoc, grupo: grpObj?.nombre || celda.grupoId };
            }
          }
        }
        filasExport.push({ encabezado: `DOCENTE: ${nomDoc}`, celdas: celdasMapa });
      }
    } else if (opcion === "PAQUETE_GRUPOS") {
      tituloTabla = "PAQUETE OFICIAL DE HORARIOS POR GRUPO";
      tipoVistaPDF = "PAQUETE_GRUPOS";
      for (const g of grupos) {
        const celdasMapa: any = {};
        for (let d = 1; d <= 5; d++) {
          for (let p = 1; p <= numHorasPorDia; p++) {
            const celda = horario?.celdas?.find((c: any) => c.diaSemana === d && c.periodo === p && c.grupoId === g.id);
            if (celda) {
              celdasMapa[`${d}_${p}`] = { materia: getNombreAsignaturaCelda(celda), docente: getNombreDocenteCelda(celda), grupo: g.nombre };
            }
          }
        }
        filasExport.push({ encabezado: `GRUPO: ${g.nombre}`, celdas: celdasMapa });
      }
    }

    const payload = {
      nombreEscuela: escuela?.nombre || escuela?.school_name || "Mi Plantel",
      cct: escuela?.cct || "CCT",
      zonaEscolar: (escuela as any)?.zona || "004",
      cicloEscolar: (horario as any)?.cicloEscolar?.nombre || "2026-2027",
      tipoVista: tipoVistaPDF,
      tituloTabla,
      dias: diasLectivos,
      periodos: periodos.map(p => `Hora ${p}`),
      filas: filasExport
    };

    if (formato === "EXCEL") {
      exportarHorarioExcel(payload);
      toast.success("Excel generado correctamente");
    } else if (formato === "DOCX") {
      await exportarHorarioDOCX(payload);
      toast.success("📝 Word (.docx) generado correctamente");
    } else {
      exportarHorarioPDF(payload);
      toast.success("PDF generado exitosamente");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%" }}>
      {/* Barra de Controles Superior */}
      <div style={{ background: "#0f172a", padding: "1rem", borderRadius: "12px", border: "1px solid #334155", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={() => setVistaTab("GRUPO")}
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "8px",
              border: vistaTab === "GRUPO" ? "1px solid #3b82f6" : "1px solid #334155",
              background: vistaTab === "GRUPO" ? "#2563eb" : "#1e293b",
              color: vistaTab === "GRUPO" ? "#ffffff" : "#cbd5e1",
              fontWeight: vistaTab === "GRUPO" ? 800 : 700,
              fontSize: "0.8125rem",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            <Users style={{ width: "16px", height: "16px" }} /> Por Grupo
          </button>
          <button
            onClick={() => setVistaTab("DOCENTE")}
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "8px",
              border: vistaTab === "DOCENTE" ? "1px solid #3b82f6" : "1px solid #334155",
              background: vistaTab === "DOCENTE" ? "#2563eb" : "#1e293b",
              color: vistaTab === "DOCENTE" ? "#ffffff" : "#cbd5e1",
              fontWeight: vistaTab === "DOCENTE" ? 800 : 700,
              fontSize: "0.8125rem",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            <UserCheck style={{ width: "16px", height: "16px" }} /> Por Docente
          </button>
          <button
            onClick={() => setVistaTab("AULA")}
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "8px",
              border: vistaTab === "AULA" ? "1px solid #3b82f6" : "1px solid #334155",
              background: vistaTab === "AULA" ? "#2563eb" : "#1e293b",
              color: vistaTab === "AULA" ? "#ffffff" : "#cbd5e1",
              fontWeight: vistaTab === "AULA" ? 800 : 700,
              fontSize: "0.8125rem",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            <Building2 style={{ width: "16px", height: "16px" }} /> Por Aula
          </button>
          <button
            onClick={() => setVistaTab("SUMARIO")}
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "8px",
              border: vistaTab === "SUMARIO" ? "1px solid #3b82f6" : "1px solid #334155",
              background: vistaTab === "SUMARIO" ? "#2563eb" : "#1e293b",
              color: vistaTab === "SUMARIO" ? "#ffffff" : "#cbd5e1",
              fontWeight: vistaTab === "SUMARIO" ? 800 : 700,
              fontSize: "0.8125rem",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            <Grid style={{ width: "16px", height: "16px" }} /> Sumario Maestro
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={() => setMostrarChat(!mostrarChat)}
            style={{
              background: mostrarChat ? "rgba(37, 99, 235, 0.2)" : "#1e293b",
              color: mostrarChat ? "#60a5fa" : "#cbd5e1",
              border: "1px solid " + (mostrarChat ? "#3b82f6" : "#334155"),
              padding: "0.45rem 0.85rem",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "0.8125rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem"
            }}
          >
            <MessageSquare style={{ width: "15px", height: "15px" }} /> {mostrarChat ? "Ocultar Chat IA" : "Abrir Chat IA"}
          </button>

          <button
            onClick={onVolverAWizard}
            style={{ background: "#1e293b", color: "#cbd5e1", border: "1px solid #334155", padding: "0.45rem 0.85rem", fontSize: "0.8125rem", borderRadius: "8px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem" }}
          >
            <Sliders style={{ width: "15px", height: "15px" }} /> Reconfigurar
          </button>

          <button
            onClick={handleGuardarHorarioDB}
            disabled={guardandoCambios || !hayCambiosSinGuardar}
            style={{
              background: hayCambiosSinGuardar ? "#16a34a" : "#1e293b",
              color: hayCambiosSinGuardar ? "#ffffff" : "#64748b",
              border: hayCambiosSinGuardar ? "1px solid #22c55e" : "1px solid #334155",
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              fontWeight: 800,
              fontSize: "0.8125rem",
              cursor: guardandoCambios || !hayCambiosSinGuardar ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              boxShadow: hayCambiosSinGuardar ? "0 2px 8px rgba(22, 163, 74, 0.3)" : "none",
              transition: "all 0.2s ease"
            }}
            title={hayCambiosSinGuardar ? "Guardar cambios permanentemente" : "Sin cambios pendientes"}
          >
            {guardandoCambios ? (
              <>
                <RefreshCw style={{ width: "15px", height: "15px", animation: "spin 1s linear infinite" }} /> Guardando...
              </>
            ) : (
              <>
                <Save style={{ width: "15px", height: "15px" }} /> Guardar Cambios {hayCambiosSinGuardar ? "(*)" : ""}
              </>
            )}
          </button>

          <button
            onClick={() => setMostrarModalExportar(true)}
            style={{ background: "#2563eb", color: "#ffffff", border: "1px solid #3b82f6", padding: "0.5rem 1rem", fontSize: "0.8125rem", borderRadius: "8px", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem", boxShadow: "0 2px 6px rgba(37,99,235,0.3)" }}
          >
            <Download style={{ width: "15px", height: "15px" }} /> Exportar Horarios (PDF/Excel)
          </button>
        </div>
      </div>

      {/* Selectores de elemento según Tab activa */}
      <div style={{ padding: "0.75rem 1.25rem", background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" }}>Filtrar Vista:</span>
        {vistaTab === "GRUPO" && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "0.25rem", background: "#0f172a", padding: "0.2rem", borderRadius: "8px", border: "1px solid #334155" }}>
              <button
                type="button"
                onClick={() => {
                  setPeriodoFiltro("A");
                  const gA = grupos.find((g) => [1, 3, 5].includes(g.semestre));
                  if (gA) setGrupoSeleccionadoId(gA.id);
                }}
                style={{
                  padding: "0.3rem 0.65rem",
                  borderRadius: "6px",
                  border: "none",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  background: periodoFiltro === "A" ? "#2563eb" : "transparent",
                  color: periodoFiltro === "A" ? "white" : "#94a3b8"
                }}
              >
                📅 Semestre A (1º, 3º, 5º)
              </button>
              <button
                type="button"
                onClick={() => {
                  setPeriodoFiltro("B");
                  const gB = grupos.find((g) => [2, 4, 6].includes(g.semestre));
                  if (gB) {
                    setGrupoSeleccionadoId(gB.id);
                  } else {
                    const impares = grupos.filter((g) => [1, 3, 5].includes(g.semestre));
                    if (impares.length > 0) {
                      const primerSemB = impares[0].semestre === 1 ? 2 : impares[0].semestre === 3 ? 4 : 6;
                      const letra = impares[0].nombre.split(" ")[1] || "A";
                      setGrupoSeleccionadoId(`virtual_${primerSemB}_${letra}`);
                    }
                  }
                }}
                style={{
                  padding: "0.3rem 0.65rem",
                  borderRadius: "6px",
                  border: "none",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  background: periodoFiltro === "B" ? "#2563eb" : "transparent",
                  color: periodoFiltro === "B" ? "white" : "#94a3b8"
                }}
              >
                📅 Semestre B (2º, 4º, 6º)
              </button>
            </div>

            <select
              value={grupoSeleccionadoId}
              onChange={(e) => setGrupoSeleccionadoId(e.target.value)}
              style={{ padding: "0.45rem 0.85rem", borderRadius: "8px", border: "1px solid #475569", background: "#0f172a", fontSize: "0.875rem", fontWeight: 800, color: "#ffffff" }}
            >
              {gruposVisibles.map((g) => (
                <option key={g.id} value={g.id} style={{ background: "#0f172a", color: "#ffffff" }}>Grupo {g.nombre}</option>
              ))}
            </select>
          </div>
        )}

        {vistaTab === "DOCENTE" && (
          <select
            value={docenteSeleccionadoId}
            onChange={(e) => setDocenteSeleccionadoId(e.target.value)}
            style={{ padding: "0.45rem 0.85rem", borderRadius: "8px", border: "1px solid #475569", background: "#0f172a", fontSize: "0.875rem", fontWeight: 800, color: "#ffffff" }}
          >
            {docentes.map((d) => (
              <option key={d.id} value={d.id} style={{ background: "#0f172a", color: "#ffffff" }}>{d.nombre} {d.apellidoPaterno || ""}</option>
            ))}
          </select>
        )}

        {vistaTab === "AULA" && (
          <select
            value={aulaSeleccionadaId}
            onChange={(e) => setAulaSeleccionadaId(e.target.value)}
            style={{ padding: "0.45rem 0.85rem", borderRadius: "8px", border: "1px solid #475569", background: "#0f172a", fontSize: "0.875rem", fontWeight: 800, color: "#ffffff" }}
          >
            {aulas.map((a) => (
              <option key={a.id} value={a.id} style={{ background: "#0f172a", color: "#ffffff" }}>{a.nombre} ({a.tipo})</option>
            ))}
          </select>
        )}
      </div>

      {/* Retícula Principal y Panel Lateral de Chat */}
      <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start", width: "100%" }}>
        {/* PANEL IZQUIERDO: Cuadrícula interactiva completa */}
        <div style={{ flex: 1, minWidth: 0, background: "#0f172a", borderRadius: "16px", border: "1px solid #334155", padding: "1.25rem", boxShadow: "0 4px 16px rgba(0,0,0,0.25)" }}>
          
          {/* TARJETA EJECUTIVA DE METADATOS DEL GRUPO / DOCENTE */}
          {vistaTab === "GRUPO" && grupoActivoObj && (
            <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", border: "1px solid #334155", borderRadius: "12px", padding: "0.85rem 1.25rem", marginBottom: "1rem", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ background: "#2563eb", color: "#ffffff", padding: "0.5rem 0.85rem", borderRadius: "8px", fontWeight: 900, fontSize: "1rem" }}>
                  {grupoActivoObj.nombre}
                </div>
                <div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 800, color: "#ffffff" }}>
                    {grupoActivoObj.semestre}° Semestre • Bachillerato General Estatal
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "0.2rem" }}>
                    <span>⏱️ Jornada: <strong style={{ color: "#38bdf8" }}>{horasGrupoActual} hrs/día ({horasGrupoActual * 5} hrs/sem)</strong></span>
                    {grupoActivoObj.capacitacionNombre && <span>💼 Capacitación: <strong style={{ color: "#fbbf24" }}>{grupoActivoObj.capacitacionNombre}</strong></span>}
                    {grupoActivoObj.ffeoSocioemocional && <span>🌱 FFEO: <strong style={{ color: "#4ade80" }}>{grupoActivoObj.ffeoSocioemocional}</strong></span>}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.6875rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" }}>Asignaturas en Retícula</div>
                <div style={{ fontSize: "1rem", fontWeight: 900, color: "#38bdf8" }}>
                  {(horario?.celdas || []).filter((c: any) => c.grupoId === grupoSeleccionadoId).length} / {horasGrupoActual * 5} hrs asignadas
                </div>
              </div>
            </div>
          )}

          {vistaTab === "DOCENTE" && docenteActivoObj && (() => {
            const celdasDoc = (horario?.celdas || []).filter((c: any) => c.docenteId === docenteSeleccionadoId);
            const totalHrsDoc = celdasDoc.length;
            const materiasDoc = Array.from(new Set(celdasDoc.map((c: any) => getNombreAsignaturaCelda(c))));
            const gruposDoc = Array.from(new Set(celdasDoc.map((c: any) => { const grp = grupos.find((g: any) => g.id === c.grupoId); return grp ? grp.nombre : c.grupoId; })));

            return (
              <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", border: "1px solid #334155", borderRadius: "12px", padding: "0.85rem 1.25rem", marginBottom: "1rem", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ background: "#2563eb", color: "#ffffff", padding: "0.5rem 0.85rem", borderRadius: "8px", fontWeight: 900, fontSize: "1rem" }}>
                    👨‍🏫
                  </div>
                  <div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 800, color: "#ffffff" }}>
                      Prof. {docenteActivoObj.nombre} {docenteActivoObj.apellidoPaterno || ""}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8", display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "0.2rem" }}>
                      <span>💼 Cargo: <strong style={{ color: "#60a5fa" }}>{docenteActivoObj.cargo || "Docente"}</strong></span>
                      <span>👥 Grupos: <strong style={{ color: "#cbd5e1" }}>{gruposDoc.length > 0 ? gruposDoc.join(", ") : "Ninguno"}</strong></span>
                      <span>📚 Materias distintas: <strong style={{ color: "#38bdf8" }}>{materiasDoc.length}</strong></span>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.6875rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" }}>Carga Frente a Grupo</div>
                  <div style={{ fontSize: "1.125rem", fontWeight: 900, color: totalHrsDoc > 0 ? "#4ade80" : "#94a3b8" }}>
                    {totalHrsDoc} hrs / semana
                  </div>
                </div>
              </div>
            );
          })()}

          {!tieneHorarioGeneradoParaGrupo && vistaTab === "GRUPO" ? (
            <div style={{ padding: "3.5rem 2rem", textAlign: "center", background: "#1e293b", borderRadius: "16px", border: "2px dashed #475569", margin: "1rem 0" }}>
              <Grid style={{ width: "48px", height: "48px", color: "#64748b", margin: "0 auto 1rem" }} />
              <h3 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#ffffff", marginBottom: "0.5rem" }}>
                Horario del Semestre {periodoFiltro} ({periodoFiltro === "A" ? "1.º, 3.º, 5.º" : "2.º, 4.º, 6.º"}) aún no generado
              </h3>
              <p style={{ fontSize: "0.875rem", color: "#94a3b8", maxWidth: "520px", margin: "0 auto 1.5rem", lineHeight: 1.5 }}>
                El horario que visualizas en la plataforma fue generado para el <strong>Semestre {periodoFiltro === "A" ? "B" : "A"}</strong>. Para generar el horario oficial de los grupos del Semestre {periodoFiltro}, diríjase al Asistente de Configuración.
              </p>
              <button
                type="button"
                onClick={onVolverAWizard}
                style={{ background: "#2563eb", color: "#ffffff", padding: "0.75rem 1.5rem", borderRadius: "10px", fontWeight: 700, fontSize: "0.875rem", border: "none", cursor: "pointer" }}
              >
                ⚙️ Ir al Wizard de Configuración (Semestre {periodoFiltro})
              </button>
            </div>
          ) : (
            <table className="horario-grid-table" style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th style={{ width: "12%", padding: "0.6rem 0.5rem", background: "#1e293b", color: "#cbd5e1", border: "1px solid #334155", fontWeight: 800 }}>Periodo</th>
                  {diasLectivos.map((d, i) => (
                    <th key={i} style={{ width: "17.6%", padding: "0.6rem 0.5rem", background: "#1e293b", color: "#ffffff", border: "1px solid #334155", fontWeight: 800 }}>{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periodosVisibles.map((p) => (
                  <tr key={p}>
                    <td style={{ background: "#1e293b", textAlign: "center", fontWeight: 800, fontSize: "0.8125rem", color: "#38bdf8", border: "1px solid #334155" }}>
                      Hora {p}
                    </td>
                    {[1, 2, 3, 4, 5].map((dia) => {
                      const celda = getCeldaInfo(dia, p);
                      const uacNombre = getNombreAsignaturaCelda(celda);
                      const estiloColor = getEstiloAsignatura(uacNombre);

                      const isDragOver = dragOverPos?.dia === dia && dragOverPos?.periodo === p;

                      return (
                        <td
                          key={dia}
                          onDragOver={(e) => handleDragOver(e, dia, p)}
                          onDragLeave={handleDragLeave}
                          onDrop={() => handleDropOnSlot(dia, p)}
                          style={{
                            border: isDragOver ? "2px dashed #38bdf8" : "1px solid #334155",
                            height: "75px",
                            padding: "0.3rem",
                            verticalAlign: "top",
                            background: isDragOver ? "rgba(56, 189, 248, 0.12)" : celda ? "transparent" : "#0b1120",
                            transition: "all 0.15s ease"
                          }}
                        >
                          {celda ? (
                            <div
                              draggable={!celda.esBloqueado}
                              onDragStart={(e) => handleDragStart(e, celda)}
                              onDragEnd={handleDragEnd}
                              className="horario-celda-box"
                              style={{
                                height: "100%",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                background: estiloColor.bg,
                                border: `1px solid ${celda.esBloqueado ? "#f59e0b" : estiloColor.border}`,
                                padding: "0.35rem",
                                borderRadius: "6px",
                                cursor: celda.esBloqueado ? "not-allowed" : "grab",
                                boxShadow: celda.esBloqueado ? "0 0 0 1px #f59e0b" : "none",
                                opacity: draggedCelda?.id === celda.id ? 0.4 : 1,
                                transition: "transform 0.1s ease, box-shadow 0.1s ease"
                              }}
                            >
                              <div>
                                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.2rem" }}>
                                  <p style={{ fontSize: "0.75rem", fontWeight: 900, color: estiloColor.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }} title={uacNombre}>
                                    {uacNombre}
                                  </p>
                                  <button
                                    onClick={(e) => toggleBloquearCelda(celda, e)}
                                    title={celda.esBloqueado ? "🔒 Celda protegida con candado (Clic para desbloquear)" : "Clic para fijar con candado"}
                                    style={{
                                      background: celda.esBloqueado ? "rgba(245, 158, 11, 0.25)" : "transparent",
                                      borderRadius: "4px",
                                      border: celda.esBloqueado ? "1px solid #f59e0b" : "none",
                                      cursor: "pointer",
                                      padding: "1px 3px",
                                      display: "inline-flex",
                                      alignItems: "center"
                                    }}
                                  >
                                    {celda.esBloqueado ? (
                                      <Lock style={{ width: "12px", height: "12px", color: "#fbbf24" }} />
                                    ) : (
                                      <Unlock style={{ width: "11px", height: "11px", color: "#64748b", opacity: 0.5 }} />
                                    )}
                                  </button>
                                </div>
                                <p style={{ fontSize: "0.7rem", fontWeight: 800, color: "#f8fafc", margin: "0.15rem 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {vistaTab === "DOCENTE" ? getNombreGrupoCelda(celda) : getNombreDocenteCelda(celda)}
                                </p>
                                {vistaTab === "SUMARIO" && (
                                  <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", margin: 0 }}>
                                    {getNombreGrupoCelda(celda)}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (() => {
                            const filtroId =
                              vistaTab === "GRUPO" ? grupoSeleccionadoId :
                              vistaTab === "DOCENTE" ? docenteSeleccionadoId :
                              vistaTab === "AULA" ? aulaSeleccionadaId :
                              grupoSeleccionadoId;
                            const estaBloqueado = esSlotLibreBloqueado(dia, p, filtroId);
                            return (
                              <div
                                className="horario-celda-libre"
                                style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontStyle: "italic", position: "relative",
                                  color: estaBloqueado ? "#fbbf24" : "#475569",
                                  background: estaBloqueado ? "rgba(245, 158, 11, 0.15)" : "transparent",
                                  border: estaBloqueado ? "1px dashed #f59e0b" : "none",
                                  borderRadius: estaBloqueado ? "6px" : "0",
                                  cursor: "pointer"
                                }}
                                onClick={() => toggleBloquearSlotLibre(dia, p, filtroId)}
                                title={estaBloqueado ? "Hora libre bloqueada — clic para desbloquear" : "Clic para bloquear esta hora libre (la IA no colocará clases aquí)"}
                              >
                                {estaBloqueado ? (
                                  <>
                                    <Lock style={{ width: "13px", height: "13px", marginRight: "4px", color: "#fbbf24" }} />
                                    <span>Bloqueado</span>
                                  </>
                                ) : (
                                  <span>Libre</span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* PANEL DERECHO: Chat IA Asistente Deslizable */}
        {mostrarChat && (
          <div style={{ width: "340px", flexShrink: 0, background: "#0f172a", borderRadius: "16px", border: "1px solid #334155", padding: "1.25rem", display: "flex", flexDirection: "column", height: "600px", boxShadow: "0 10px 25px rgba(0,0,0,0.3)" }}>
            <div style={{ borderBottom: "1px solid #334155", paddingBottom: "0.75rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Sparkles style={{ width: "20px", height: "20px", color: "#60a5fa" }} />
                <div>
                  <h3 style={{ fontSize: "0.9375rem", fontWeight: 800, color: "white", margin: 0 }}>Asistente IA de Horarios</h3>
                  {esAdmin && (
                    <p style={{ fontSize: "0.65rem", color: "#94a3b8", margin: 0 }}>Gemini 3.5 Flash Lite | DidactecaIA Pool</p>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button
                  onClick={handleLimpiarChat}
                  title="Limpiar historial de conversación"
                  style={{
                    background: chatHistorial.length === 0 ? "#1e293b" : "rgba(239,68,68,0.15)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: chatHistorial.length === 0 ? "#475569" : "#f87171",
                    cursor: chatHistorial.length === 0 ? "not-allowed" : "pointer",
                    borderRadius: "6px",
                    padding: "0.3rem 0.5rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    fontSize: "0.7rem",
                    fontWeight: 700
                  }}
                  disabled={chatHistorial.length === 0}
                >
                  <Trash2 style={{ width: "13px", height: "13px" }} />
                  Limpiar
                </button>
                <button
                  onClick={() => setMostrarChat(false)}
                  style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                >
                  <X style={{ width: "18px", height: "18px" }} />
                </button>
              </div>
            </div>

            {/* Historial de Mensajes */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem", paddingRight: "0.25rem" }}>
              <div style={{ background: "rgba(30, 41, 59, 0.8)", padding: "0.75rem", borderRadius: "10px", border: "1px solid #334155", fontSize: "0.75rem", color: "#cbd5e1" }}>
                💡 <strong>Directiva:</strong> Pide cualquier ajuste en lenguaje natural. Ej: <em>"Mueve la clase de Química del lunes 1ª hora al martes 3ª hora"</em> o <em>"Deja libre los viernes al profesor arminda"</em>. Las celdas con candado 🔒 se mantendrán protegidas.
              </div>

              {chatHistorial.map((msg: any, i: number) => (
                <div
                  key={i}
                  style={{
                    padding: "0.75rem",
                    borderRadius: "12px",
                    background: msg.role === "user" ? "#2563eb" : "#1e293b",
                    color: "white",
                    fontSize: "0.8125rem",
                    alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "90%",
                    border: msg.role === "user" ? "none" : "1px solid #334155"
                  }}
                >
                  {msg.content}
                </div>
              ))}
            </div>

            {/* Input del Chat */}
            <form onSubmit={handleEnviarMensajeIA} style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
              <textarea
                rows={1}
                placeholder="Escribe una instrucción para la IA..."
                value={mensajeChat}
                onChange={(e) => {
                  setMensajeChat(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (mensajeChat.trim() !== '') {
                      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                      handleEnviarMensajeIA(fakeEvent);
                      e.currentTarget.style.height = 'auto';
                    }
                  }
                }}
                style={{
                  flex: 1,
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  padding: "0.5rem 0.75rem",
                  color: "white",
                  fontSize: "0.8125rem",
                  resize: "none",
                  overflowY: "auto",
                  minHeight: "36px",
                  maxHeight: "150px"
                }}
              />
              <button
                type="submit"
                disabled={enviandoChat}
                style={{
                  background: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.5rem 0.75rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Send style={{ width: "16px", height: "16px" }} />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* MODAL DE EXPORTACIÓN AVANZADA */}
      {mostrarModalExportar && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.85)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "1rem" }}>
          <div style={{ background: "#0f172a", borderRadius: "16px", padding: "1.75rem", maxWidth: "620px", width: "100%", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)", border: "1px solid #334155", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #334155", paddingBottom: "1rem", marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#ffffff", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
                <FileText style={{ width: "22px", height: "22px", color: "#38bdf8" }} /> Opciones de Exportación Oficial
              </h3>
              <button onClick={() => setMostrarModalExportar(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                <X style={{ width: "20px", height: "20px" }} />
              </button>
            </div>

            <p style={{ fontSize: "0.8125rem", color: "#94a3b8", marginBottom: "1.25rem" }}>
              Seleccione el formato y alcance. Los botones <b>Word</b> generan archivos editables (.docx).
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {/* Opción 1: Vista Actual */}
              <div style={{ border: "1px solid #334155", borderRadius: "10px", padding: "0.85rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1e293b" }}>
                <div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 800, color: "#ffffff" }}>📄 Vista Actual en Pantalla</div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Exporta exactamente el filtro visible ({vistaTab})</div>
                </div>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button onClick={() => ejecutarExportacion("VISTA_ACTUAL", "PDF")} style={{ background: "#2563eb", color: "white", border: "none", padding: "0.4rem 0.65rem", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>PDF</button>
                  <button onClick={() => ejecutarExportacion("VISTA_ACTUAL", "EXCEL")} style={{ background: "#16a34a", color: "white", border: "none", padding: "0.4rem 0.65rem", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>Excel</button>
                  <button onClick={() => ejecutarExportacion("VISTA_ACTUAL", "DOCX")} style={{ background: "#7c3aed", color: "white", border: "none", padding: "0.4rem 0.65rem", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>Word</button>
                </div>
              </div>

              {/* Opción 2: Paquete Completo por Docente */}
              <div style={{ border: "1px solid #334155", borderRadius: "10px", padding: "0.85rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1e293b" }}>
                <div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 800, color: "#ffffff", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <Package style={{ width: "16px", height: "16px", color: "#fbbf24" }} /> Paquete por Docente (Multi-página)
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>1 hoja individual por cada maestro del plantel</div>
                </div>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button onClick={() => ejecutarExportacion("PAQUETE_DOCENTES", "PDF")} style={{ background: "#2563eb", color: "white", border: "none", padding: "0.4rem 0.65rem", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>PDF</button>
                  <button onClick={() => ejecutarExportacion("PAQUETE_DOCENTES", "DOCX")} style={{ background: "#7c3aed", color: "white", border: "none", padding: "0.4rem 0.65rem", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>Word</button>
                </div>
              </div>

              {/* Opción 3: Paquete Completo por Grupo */}
              <div style={{ border: "1px solid #334155", borderRadius: "10px", padding: "0.85rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1e293b" }}>
                <div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 800, color: "#ffffff", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <Package style={{ width: "16px", height: "16px", color: "#fbbf24" }} /> Paquete por Grupo (Multi-página)
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>1 hoja individual por cada grupo para alumnos</div>
                </div>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button onClick={() => ejecutarExportacion("PAQUETE_GRUPOS", "PDF")} style={{ background: "#2563eb", color: "white", border: "none", padding: "0.4rem 0.65rem", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>PDF</button>
                  <button onClick={() => ejecutarExportacion("PAQUETE_GRUPOS", "DOCX")} style={{ background: "#7c3aed", color: "white", border: "none", padding: "0.4rem 0.65rem", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>Word</button>
                </div>
              </div>

              {/* Separador */}
              <div style={{ borderTop: "1px dashed #334155", paddingTop: "0.85rem" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#94a3b8", marginBottom: "0.6rem" }}>📊 Exportaciones Compactas (una sola tabla)</div>

                {/* Sumario Maestro */}
                <div style={{ border: "1px solid #4f46e5", borderRadius: "10px", padding: "0.85rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(79, 70, 229, 0.15)", marginBottom: "0.6rem" }}>
                  <div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 800, color: "#c7d2fe" }}>👨‍🏫 Sumario Maestro</div>
                    <div style={{ fontSize: "0.72rem", color: "#a5b4fc" }}>Todos los docentes en filas · Lun/H1 … Vie/H6 en columnas</div>
                  </div>
                  <button onClick={() => ejecutarExportacion("SUMARIO_MAESTRO", "EXCEL")} style={{ background: "#4f46e5", color: "white", border: "none", padding: "0.4rem 0.85rem", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>
                    Excel
                  </button>
                </div>

                {/* Sumario Grupo */}
                <div style={{ border: "1px solid #059669", borderRadius: "10px", padding: "0.85rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(5, 150, 105, 0.15)" }}>
                  <div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 800, color: "#a7f3d0" }}>🏫 Sumario por Grupo</div>
                    <div style={{ fontSize: "0.72rem", color: "#6ee7b7" }}>Todos los grupos en filas · Lun/H1 … Vie/H6 en columnas</div>
                  </div>
                  <button onClick={() => ejecutarExportacion("SUMARIO_GRUPO", "EXCEL")} style={{ background: "#059669", color: "white", border: "none", padding: "0.4rem 0.85rem", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>
                    Excel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
