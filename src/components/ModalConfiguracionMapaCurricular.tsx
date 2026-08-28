"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Sparkles, Check, School, Layers, AlertCircle, BookOpen, ChevronRight, RefreshCw, Save } from "lucide-react";
import toast from "react-hot-toast";
import {
  FORMACIONES_LABORALES,
  FFE_OPTATIVAS_CATALOGO,
  FFE_RECURSOS_SOCIOCOGNITIVOS,
  FFE_AREAS_CONOCIMIENTO,
  FORMACIONES_SOCIOEMOCIONALES,
  generarGruposPorEstructura,
  obtenerAsignaturasParaGrupo,
  GrupoDefinicion
} from "@/lib/escuela-grupos";

interface Props {
  escuela: {
    id: string;
    cct: string;
    nombre: string;
    gruposPrimerAno?: number;
    gruposSegundoAno?: number;
    gruposTercerAno?: number;
    mapaCurricularCompletado?: boolean;
  };
  gruposIniciales?: any[];
  isOpen: boolean;
  onClose?: () => void;
  onSaved?: () => void;
  forceObligatorio?: boolean;
  isAdmin?: boolean;
}

export default function ModalConfiguracionMapaCurricular({
  escuela,
  gruposIniciales = [],
  isOpen,
  onClose,
  onSaved,
  forceObligatorio = false,
  isAdmin = false,
}: Props) {
  const [paso, setPaso] = useState<1 | 2>(1);
  const [guardando, setGuardando] = useState(false);

  // Paso 1: Estructura de Grupos
  const [g1, setG1] = useState<number>(escuela.gruposPrimerAno || 1);
  const [g2, setG2] = useState<number>(escuela.gruposSegundoAno || 1);
  const [g3, setG3] = useState<number>(escuela.gruposTercerAno || 1);

  // Config por Grupo (nombre -> { capacitacionNombre, ffeOptativas, ffeoSocioemocional })
  const [mapaConfig, setMapaConfig] = useState<Record<string, { capacitacionNombre: string; ffeOptativas: string[]; ffeoSocioemocional: string }>>({});

  const [initialized, setInitialized] = useState(false);

  // Reset y sincronización al abrir el modal (solo una vez por apertura)
  useEffect(() => {
    if (isOpen && !initialized) {
      setG1(Math.max(1, escuela?.gruposPrimerAno || 1));
      setG2(Math.max(1, escuela?.gruposSegundoAno || 1));
      setG3(Math.max(1, escuela?.gruposTercerAno || 1));

      const initialMap: Record<string, { capacitacionNombre: string; ffeOptativas: string[]; ffeoSocioemocional: string }> = {};
      if (Array.isArray(gruposIniciales)) {
        gruposIniciales.forEach(g => {
          let opts = g.ffeOptativas;
          if (typeof opts === "string") {
            try { opts = JSON.parse(opts); } catch { opts = []; }
          }

          const parsedOpts = Array.isArray(opts) && opts.length === 4 ? opts : [
            FFE_RECURSOS_SOCIOCOGNITIVOS[0],
            FFE_RECURSOS_SOCIOCOGNITIVOS[1],
            FFE_AREAS_CONOCIMIENTO[0],
            FFE_AREAS_CONOCIMIENTO[1]
          ];

          const itemData = {
            capacitacionNombre: g.capacitacionNombre || "Administracion",
            ffeOptativas: parsedOpts,
            ffeoSocioemocional: g.ffeoSocioemocional || (g.semestre === 3 ? FORMACIONES_SOCIOEMOCIONALES[0] : FORMACIONES_SOCIOEMOCIONALES[1])
          };

          if (g.nombre) {
            initialMap[g.nombre] = itemData;
            initialMap[g.nombre.replace("º", "°")] = itemData;
            initialMap[g.nombre.replace("°", "º")] = itemData;
          }
        });
      }
      setMapaConfig(initialMap);
      setPaso(1);
      setInitialized(true);
    } else if (!isOpen && initialized) {
      setInitialized(false);
    }
  }, [isOpen, initialized, escuela, gruposIniciales]);

  // Generar lista dinámica de grupos según la estructura actual de los inputs
  const gruposGenerados = useMemo(() => {
    return generarGruposPorEstructura({ gruposPrimerAno: g1, gruposSegundoAno: g2, gruposTercerAno: g3 }, "SEMESTRE_A");
  }, [g1, g2, g3]);

  if (!isOpen) return null;

  const normalizarNombreGrupo = (n: string) => (n || "").replace(/º/g, "°");

  const handleUpdateGrupoConfig = (grupoNombre: string, field: string, value: any) => {
    const nNorm = normalizarNombreGrupo(grupoNombre);
    const nAlt = grupoNombre.includes("°") ? grupoNombre.replace("°", "º") : grupoNombre.replace("º", "°");

    setMapaConfig(prev => {
      const actual = prev[nNorm] || prev[grupoNombre] || prev[nAlt] || {
        capacitacionNombre: "Administracion",
        ffeOptativas: [
          FFE_RECURSOS_SOCIOCOGNITIVOS[0],
          FFE_RECURSOS_SOCIOCOGNITIVOS[1],
          FFE_AREAS_CONOCIMIENTO[0],
          FFE_AREAS_CONOCIMIENTO[1]
        ],
        ffeoSocioemocional: FORMACIONES_SOCIOEMOCIONALES[0]
      };

      const updatedConfig = {
        ...actual,
        [field]: value
      };

      const nuevoMapa = {
        ...prev,
        [nNorm]: updatedConfig,
        [grupoNombre]: updatedConfig,
        [nAlt]: updatedConfig
      };

      // Auto-swap inteligente bidireccional entre 3.er y 5.º Semestre (evita colisiones)
      if (field === "ffeoSocioemocional") {
        const letra = grupoNombre.split(" ")[1];
        if (grupoNombre.startsWith("3º") || grupoNombre.startsWith("3°")) {
          const key5Norm = normalizarNombreGrupo(`5° ${letra}`);
          const key5Alt = `5º ${letra}`;
          const config5 = prev[key5Norm] || prev[key5Alt] || {
            capacitacionNombre: "Administracion",
            ffeOptativas: [FFE_RECURSOS_SOCIOCOGNITIVOS[0], FFE_RECURSOS_SOCIOCOGNITIVOS[1], FFE_AREAS_CONOCIMIENTO[0], FFE_AREAS_CONOCIMIENTO[1]],
            ffeoSocioemocional: FORMACIONES_SOCIOEMOCIONALES[1]
          };
          if (config5.ffeoSocioemocional === value) {
            const opcionDisponible = FORMACIONES_SOCIOEMOCIONALES.find(soc => soc !== value) || FORMACIONES_SOCIOEMOCIONALES[1];
            const updated5 = { ...config5, ffeoSocioemocional: opcionDisponible };
            nuevoMapa[key5Norm] = updated5;
            nuevoMapa[key5Alt] = updated5;
          }
        } else if (grupoNombre.startsWith("5º") || grupoNombre.startsWith("5°")) {
          const key3Norm = normalizarNombreGrupo(`3° ${letra}`);
          const key3Alt = `3º ${letra}`;
          const config3 = prev[key3Norm] || prev[key3Alt] || {
            capacitacionNombre: "Administracion",
            ffeOptativas: [
              FFE_RECURSOS_SOCIOCOGNITIVOS[0],
              FFE_RECURSOS_SOCIOCOGNITIVOS[1],
              FFE_AREAS_CONOCIMIENTO[0],
              FFE_AREAS_CONOCIMIENTO[1]
            ],
            ffeoSocioemocional: FORMACIONES_SOCIOEMOCIONALES[0]
          };
          if (config3.ffeoSocioemocional === value) {
            const opcionDisponible = FORMACIONES_SOCIOEMOCIONALES.find(soc => soc !== value) || FORMACIONES_SOCIOEMOCIONALES[0];
            const updated3 = { ...config3, ffeoSocioemocional: opcionDisponible };
            nuevoMapa[key3Norm] = updated3;
            nuevoMapa[key3Alt] = updated3;
          }
        }
      }

      return nuevoMapa;
    });
  };

  const handleSave = async () => {
    setGuardando(true);
    try {
      // Construir array de gruposConfig
      const gruposConfig = gruposGenerados.map(g => {
        const cfg = mapaConfig[g.nombre] || mapaConfig[g.nombre.replace("º", "°")] || mapaConfig[g.nombre.replace("°", "º")] || {
          capacitacionNombre: "Administracion",
          ffeOptativas: [
            "Análisis de Fenómenos y Procesos Biológicos",
            "Pensamiento Matemático Aplicado a las Finanzas I",
            "Fundamentos de Administración I",
            "Lógica y Pensamiento Crítico"
          ],
          ffeoSocioemocional: FORMACIONES_SOCIOEMOCIONALES[0]
        };

        return {
          grupoNombre: g.nombre,
          semestre: g.semestre,
          capacitacionNombre: cfg.capacitacionNombre,
          ffeOptativas: cfg.ffeOptativas,
          ffeoSocioemocional: cfg.ffeoSocioemocional,
        };
      });

      const res = await fetch(`/api/escuelas/${escuela.id}/mapa-curricular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gruposPrimerAno: g1,
          gruposSegundoAno: g2,
          gruposTercerAno: g3,
          gruposConfig
        })
      });

      if (!res.ok) throw new Error("Error al guardar mapa curricular");

      try {
        localStorage.removeItem(`horarios_wizard_config_v4_${escuela.id}`);
        localStorage.removeItem(`horarios_wizard_config_${escuela.id}`);
      } catch (e) {
        console.warn("No se pudo limpiar localStorage", e);
      }

      toast.success("¡Mapa curricular y estructura del plantel guardados exitosamente!");
      if (onSaved) onSaved();
      if (onClose) onClose();
    } catch (err: any) {
      toast.error(err.message || "No se pudo guardar la configuración");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      background: "rgba(15, 23, 42, 0.85)",
      backdropFilter: "blur(8px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1rem"
    }}>
      <div style={{
        background: "#0f172a",
        width: "100%",
        maxWidth: "880px",
        maxHeight: "90vh",
        borderRadius: "16px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        border: "1px solid #334155"
      }}>
        {/* Header */}
        <div style={{
          padding: "1.25rem 1.5rem",
          background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
          color: "#ffffff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.9 }}>
              {escuela.cct} • {escuela.nombre}
            </div>
            <h3 style={{ margin: "0.2rem 0 0", fontSize: "1.15rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Sparkles size={18} /> Mapa Curricular y Estructura del Plantel (1.º a 6.º Semestre)
            </h3>
          </div>
          {(!forceObligatorio || isAdmin) && onClose && (
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.2)",
                border: "1px solid rgba(255,255,255,0.35)",
                color: "#ffffff",
                borderRadius: "8px",
                padding: "6px 12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.85rem",
                fontWeight: 700,
                transition: "all 0.2s",
              }}
              title="Cerrar modal (Modo Administrador / Opcional)"
            >
              <X size={18} />
              <span>{isAdmin ? "Cerrar (Admin)" : "Cerrar"}</span>
            </button>
          )}
        </div>

        {/* Stepper Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #334155", background: "#1e293b" }}>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setPaso(1); }}
            style={{
              flex: 1,
              padding: "0.85rem",
              border: "none",
              background: paso === 1 ? "#0f172a" : "transparent",
              color: paso === 1 ? "#38bdf8" : "#94a3b8",
              fontWeight: 800,
              fontSize: "0.875rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              borderBottom: paso === 1 ? "3px solid #38bdf8" : "none"
            }}
          >
            <Layers size={16} /> 1. Estructura de Grupos ({g1 + g2 + g3} grupos)
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setPaso(2); }}
            style={{
              flex: 1,
              padding: "0.85rem",
              border: "none",
              background: paso === 2 ? "#0f172a" : "transparent",
              color: paso === 2 ? "#38bdf8" : "#94a3b8",
              fontWeight: 800,
              fontSize: "0.875rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              borderBottom: paso === 2 ? "3px solid #38bdf8" : "none"
            }}
          >
            <BookOpen size={16} /> 2. Formaciones Laborales & Optativas FFE
          </button>
        </div>

        {/* Body scrollable */}
        <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1, background: "#0f172a" }}>

          {/* PASO 1: Estructura de Grupos por Año */}
          {paso === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{
                background: "rgba(37, 99, 235, 0.15)",
                border: "1px solid rgba(59, 130, 246, 0.35)",
                padding: "1rem",
                borderRadius: "12px",
                display: "flex",
                gap: "0.75rem",
                alignItems: "center"
              }}>
                <AlertCircle size={24} color="#38bdf8" />
                <div style={{ fontSize: "0.85rem", color: "#bfdbfe", lineHeight: 1.4 }}>
                  <strong style={{ color: "#ffffff" }}>Paso 1: Confirme los grupos activos en su plantel.</strong><br />
                  Escriba la cantidad de grupos activos por grado/año. Esta información se usará para construir automáticamente las listas en Horarios IA y Planeaciones Didácticas.
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem" }}>
                <div style={{ padding: "1.25rem", border: "1px solid #334155", background: "#1e293b", borderRadius: "12px", textAlign: "center" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "0.5rem" }}>
                    1.er Año (1.º y 2.º Semestre)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={g1}
                    onChange={(e) => setG1(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{
                      width: "100%",
                      fontSize: "1.5rem",
                      fontWeight: 800,
                      textAlign: "center",
                      padding: "0.5rem",
                      borderRadius: "8px",
                      border: "2px solid #3b82f6",
                      background: "#0f172a",
                      color: "#ffffff"
                    }}
                  />
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.5rem" }}>
                    Genera: 1º A {g1 > 1 ? `hasta 1º ${String.fromCharCode(64 + g1)}` : ""}
                  </div>
                </div>

                <div style={{ padding: "1.25rem", border: "1px solid #334155", background: "#1e293b", borderRadius: "12px", textAlign: "center" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "0.5rem" }}>
                    2.º Año (3.er y 4.º Semestre)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={g2}
                    onChange={(e) => setG2(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{
                      width: "100%",
                      fontSize: "1.5rem",
                      fontWeight: 800,
                      textAlign: "center",
                      padding: "0.5rem",
                      borderRadius: "8px",
                      border: "2px solid #3b82f6",
                      background: "#0f172a",
                      color: "#ffffff"
                    }}
                  />
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.5rem" }}>
                    Genera: 3º A {g2 > 1 ? `hasta 3º ${String.fromCharCode(64 + g2)}` : ""}
                  </div>
                </div>

                <div style={{ padding: "1.25rem", border: "1px solid #334155", background: "#1e293b", borderRadius: "12px", textAlign: "center" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "0.5rem" }}>
                    3.er Año (5.º y 6.º Semestre)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={g3}
                    onChange={(e) => setG3(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{
                      width: "100%",
                      fontSize: "1.5rem",
                      fontWeight: 800,
                      textAlign: "center",
                      padding: "0.5rem",
                      borderRadius: "8px",
                      border: "2px solid #3b82f6",
                      background: "#0f172a",
                      color: "#ffffff"
                    }}
                  />
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.5rem" }}>
                    Genera: 5º A {g3 > 1 ? `hasta 5º ${String.fromCharCode(64 + g3)}` : ""}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setPaso(2); }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontWeight: 700,
                    padding: "0.65rem 1.25rem",
                    background: "#2563eb",
                    color: "#ffffff",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  Continuar al Mapa Curricular por Grupo <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* PASO 2: Asignación por Grupo */}
          {paso === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{
                background: "#1e293b",
                border: "1px solid #334155",
                padding: "0.85rem 1rem",
                borderRadius: "10px",
                fontSize: "0.8rem",
                color: "#cbd5e1"
              }}>
                <strong style={{ color: "#38bdf8" }}>Paso 2: Configure la Formación Laboral, Optativas FFE y Socioemocional por Grupo.</strong><br />
                Para cada grupo de 3.º y 5.º semestre, seleccione las asignaturas correspondientes a su oferta educativa.
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {gruposGenerados.map(g => {
                  const rawCfg = mapaConfig[g.nombre] || mapaConfig[g.nombre.replace("º", "°")] || mapaConfig[g.nombre.replace("°", "º")];
                  const cfg = {
                    capacitacionNombre: rawCfg?.capacitacionNombre || "Administracion",
                    ffeOptativas: Array.isArray(rawCfg?.ffeOptativas) && rawCfg.ffeOptativas.length === 4 ? rawCfg.ffeOptativas : [
                      FFE_RECURSOS_SOCIOCOGNITIVOS[0],
                      FFE_RECURSOS_SOCIOCOGNITIVOS[1],
                      FFE_AREAS_CONOCIMIENTO[0],
                      FFE_AREAS_CONOCIMIENTO[1]
                    ],
                    ffeoSocioemocional: rawCfg?.ffeoSocioemocional || (g.semestre === 3 ? FORMACIONES_SOCIOEMOCIONALES[0] : FORMACIONES_SOCIOEMOCIONALES[1])
                  };

                  return (
                    <div key={g.id} style={{ padding: "1.25rem", border: "1px solid #334155", background: "#1e293b", borderRadius: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid #334155" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ width: "28px", height: "28px", borderRadius: "6px", background: "#2563eb", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.85rem" }}>
                            {g.nombre.split(" ")[0]}
                          </span>
                          <span style={{ fontWeight: 800, fontSize: "1rem", color: "#ffffff" }}>
                            Grupo {g.nombre} ({g.semestre}° Semestre)
                          </span>
                        </div>

                        <span style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          padding: "0.2rem 0.6rem",
                          borderRadius: "12px",
                          background: g.semestre === 1 ? "rgba(16, 185, 129, 0.2)" : g.semestre === 3 ? "rgba(59, 130, 246, 0.2)" : "rgba(139, 92, 246, 0.2)",
                          color: g.semestre === 1 ? "#34d399" : g.semestre === 3 ? "#60a5fa" : "#a78bfa",
                          border: `1px solid ${g.semestre === 1 ? "rgba(52, 211, 153, 0.3)" : g.semestre === 3 ? "rgba(96, 165, 246, 0.3)" : "rgba(167, 139, 250, 0.3)"}`
                        }}>
                          {g.semestre === 1 ? "100% Fundamental Universal" : g.semestre === 3 ? "Laboral (9 UACs)" : "Laboral + FFE (10 UACs)"}
                        </span>
                      </div>

                      {/* Grupos de 1º Semestre */}
                      {g.semestre === 1 && (
                        <div style={{ fontSize: "0.8rem", color: "#94a3b8", fontStyle: "italic" }}>
                          ✓ Asignaturas del Currículum Fundamental MCCEMS 100% universales (Ciencias Naturales, Experimentales y Tecnología I, Pensamiento Matemático I, Humanidades I, Lenguaje y Comunicación I, etc.).
                        </div>
                      )}

                      {/* Grupos de 3º Semestre */}
                      {g.semestre === 3 && (() => {
                        const letra = g.nombre.split(" ")[1];
                        const config5 = mapaConfig[normalizarNombreGrupo(`5° ${letra}`)] || mapaConfig[`5° ${letra}`] || mapaConfig[`5º ${letra}`];
                        const socio5 = config5?.ffeoSocioemocional || FORMACIONES_SOCIOEMOCIONALES[1];
                        const socio4y6 = FORMACIONES_SOCIOEMOCIONALES.find(soc => soc !== cfg.ffeoSocioemocional && soc !== socio5) || FORMACIONES_SOCIOEMOCIONALES[2];

                        return (
                          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                              <div>
                                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "0.3rem" }}>
                                  FORMACIÓN LABORAL (CAPACITACIÓN DEL GRUPO):
                                </label>
                                <select
                                  className="form-control"
                                  value={cfg.capacitacionNombre}
                                  onChange={(e) => handleUpdateGrupoConfig(g.nombre, "capacitacionNombre", e.target.value)}
                                  style={{
                                    fontSize: "0.85rem",
                                    fontWeight: 700,
                                    background: "#0f172a",
                                    color: "#ffffff",
                                    border: "1px solid #475569",
                                    borderRadius: "8px",
                                    padding: "0.5rem 0.75rem",
                                    width: "100%"
                                  }}
                                >
                                  {FORMACIONES_LABORALES.map(cap => (
                                    <option key={cap} value={cap} style={{ background: "#0f172a", color: "#ffffff" }}>{cap}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "0.3rem" }}>
                                  FORMACIÓN SOCIOEMOCIONAL (OPCIÓN 1 - 3.ER SEMESTRE):
                                </label>
                                <select
                                  className="form-control"
                                  value={cfg.ffeoSocioemocional}
                                  onChange={(e) => handleUpdateGrupoConfig(g.nombre, "ffeoSocioemocional", e.target.value)}
                                  style={{
                                    fontSize: "0.85rem",
                                    fontWeight: 700,
                                    background: "#0f172a",
                                    color: "#ffffff",
                                    border: "1px solid #475569",
                                    borderRadius: "8px",
                                    padding: "0.5rem 0.75rem",
                                    width: "100%"
                                  }}
                                >
                                  {FORMACIONES_SOCIOEMOCIONALES.map(soc => (
                                    <option key={soc} value={soc} style={{ background: "#0f172a", color: "#ffffff" }}>{soc}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* 📗 Bloque informativo: Semestre B (4.º Semestre automático) */}
                            <div style={{ background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "0.75rem 1rem", borderRadius: "10px" }}>
                              <div style={{ fontSize: "0.78125rem", fontWeight: 800, color: "#34d399", marginBottom: "0.3rem" }}>
                                📗 Semestre B Correspondiente (4.º Semestre - Grupo 4° {letra})
                              </div>
                              <div style={{ fontSize: "0.725rem", color: "#86efac", lineHeight: 1.4 }}>
                                • <strong>Laboral:</strong> Submódulos 3 y 4 de <em>{cfg.capacitacionNombre}</em> (Automático)<br />
                                • <strong>Socioemocional:</strong> <em>{socio4y6}</em> (Automático)
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Grupos de 5º Semestre */}
                      {g.semestre === 5 && (() => {
                        const letra = g.nombre.split(" ")[1];
                        const config3 = mapaConfig[normalizarNombreGrupo(`3° ${letra}`)] || mapaConfig[`3° ${letra}`] || mapaConfig[`3º ${letra}`];
                        const socio3 = config3?.ffeoSocioemocional || FORMACIONES_SOCIOEMOCIONALES[0];
                        const opcionesSocio5 = FORMACIONES_SOCIOEMOCIONALES.filter(soc => soc !== socio3);
                        const socio5Actual = opcionesSocio5.includes(cfg.ffeoSocioemocional) ? cfg.ffeoSocioemocional : opcionesSocio5[0];
                        const socio4y6 = FORMACIONES_SOCIOEMOCIONALES.find(soc => soc !== socio3 && soc !== socio5Actual) || FORMACIONES_SOCIOEMOCIONALES[2];

                        const optRecurso1 = cfg.ffeOptativas[0] || FFE_RECURSOS_SOCIOCOGNITIVOS[0];
                        const optRecurso2 = cfg.ffeOptativas[1] || FFE_RECURSOS_SOCIOCOGNITIVOS[1];
                        const optArea3 = cfg.ffeOptativas[2] || FFE_AREAS_CONOCIMIENTO[0];
                        const optArea4 = cfg.ffeOptativas[3] || FFE_AREAS_CONOCIMIENTO[1];

                        return (
                          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                              <div>
                                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "0.3rem" }}>
                                  FORMACIÓN LABORAL (CAPACITACIÓN):
                                </label>
                                <select
                                  className="form-control"
                                  value={cfg.capacitacionNombre}
                                  onChange={(e) => handleUpdateGrupoConfig(g.nombre, "capacitacionNombre", e.target.value)}
                                  style={{
                                    fontSize: "0.85rem",
                                    fontWeight: 700,
                                    background: "#0f172a",
                                    color: "#ffffff",
                                    border: "1px solid #475569",
                                    borderRadius: "8px",
                                    padding: "0.5rem 0.75rem",
                                    width: "100%"
                                  }}
                                >
                                  {FORMACIONES_LABORALES.map(cap => (
                                    <option key={cap} value={cap} style={{ background: "#0f172a", color: "#ffffff" }}>{cap}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "0.3rem" }}>
                                  FORMACIÓN SOCIOEMOCIONAL (OPCIÓN 2 - 5.º SEMESTRE):
                                </label>
                                <select
                                  className="form-control"
                                  value={socio5Actual}
                                  onChange={(e) => handleUpdateGrupoConfig(g.nombre, "ffeoSocioemocional", e.target.value)}
                                  style={{
                                    fontSize: "0.85rem",
                                    fontWeight: 700,
                                    background: "#0f172a",
                                    color: "#ffffff",
                                    border: "1px solid #475569",
                                    borderRadius: "8px",
                                    padding: "0.5rem 0.75rem",
                                    width: "100%"
                                  }}
                                >
                                  {opcionesSocio5.map(soc => (
                                    <option key={soc} value={soc} style={{ background: "#0f172a", color: "#ffffff" }}>{soc}</option>
                                  ))}
                                </select>
                                <div style={{ fontSize: "0.725rem", color: "#86efac", marginTop: "0.4rem", fontWeight: 700, background: "rgba(16, 185, 129, 0.12)", padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                                  ⚡ Opción de 3.er semestre: <strong style={{ color: "#ffffff" }}>{socio3}</strong><br />
                                  ℹ️ 4.º y 6.º Semestre llevarán automáticamente: <strong style={{ color: "#ffffff" }}>{socio4y6}</strong>
                                </div>
                              </div>
                            </div>

                            {/* ── Optativas FFE Divididas por Categoría (Alto Contraste) ── */}
                            <div style={{
                              background: "#0b132b",
                              padding: "1.1rem",
                              borderRadius: "12px",
                              border: "1px solid #334155",
                              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)"
                            }}>
                              <label style={{
                                display: "block",
                                fontSize: "0.85rem",
                                fontWeight: 800,
                                color: "#38bdf8",
                                marginBottom: "0.85rem",
                                textTransform: "uppercase",
                                letterSpacing: "0.03em"
                              }}>
                                ✨ Optativas FFE (2 Recursos Sociocognitivos + 2 Áreas de Conocimiento):
                              </label>

                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                                {/* Bloque 1: Recursos Sociocognitivos */}
                                <div style={{
                                  background: "#1e293b",
                                  padding: "0.9rem",
                                  borderRadius: "10px",
                                  border: "1.5px solid #3b82f6",
                                  boxShadow: "0 4px 12px rgba(0,0,0,0.25)"
                                }}>
                                  <div style={{
                                    fontSize: "0.8rem",
                                    fontWeight: 800,
                                    color: "#93c5fd",
                                    marginBottom: "0.6rem",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.35rem"
                                  }}>
                                    📘 Recursos Sociocognitivos (Optativas 1 y 2):
                                  </div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                                    <div>
                                      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#60a5fa", marginBottom: "0.25rem" }}>
                                        Optativa 1 (Recurso):
                                      </label>
                                      <select
                                        className="form-control"
                                        value={optRecurso1}
                                        onChange={(e) => {
                                          const copia = [...cfg.ffeOptativas];
                                          copia[0] = e.target.value;
                                          handleUpdateGrupoConfig(g.nombre, "ffeOptativas", copia);
                                        }}
                                        style={{
                                          background: "#0f172a",
                                          color: "#ffffff",
                                          border: "1px solid #3b82f6",
                                          borderRadius: "6px",
                                          padding: "0.5rem 0.65rem",
                                          fontSize: "0.8rem",
                                          fontWeight: 600,
                                          width: "100%"
                                        }}
                                      >
                                        {FFE_RECURSOS_SOCIOCOGNITIVOS.map(opt => (
                                          <option key={opt} value={opt} style={{ background: "#0f172a", color: "#ffffff" }}>
                                            {opt}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div>
                                      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#60a5fa", marginBottom: "0.25rem" }}>
                                        Optativa 2 (Recurso):
                                      </label>
                                      <select
                                        className="form-control"
                                        value={optRecurso2}
                                        onChange={(e) => {
                                          const copia = [...cfg.ffeOptativas];
                                          copia[1] = e.target.value;
                                          handleUpdateGrupoConfig(g.nombre, "ffeOptativas", copia);
                                        }}
                                        style={{
                                          background: "#0f172a",
                                          color: "#ffffff",
                                          border: "1px solid #3b82f6",
                                          borderRadius: "6px",
                                          padding: "0.5rem 0.65rem",
                                          fontSize: "0.8rem",
                                          fontWeight: 600,
                                          width: "100%"
                                        }}
                                      >
                                        {FFE_RECURSOS_SOCIOCOGNITIVOS.filter(o => o !== optRecurso1).map(opt => (
                                          <option key={opt} value={opt} style={{ background: "#0f172a", color: "#ffffff" }}>
                                            {opt}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                </div>

                                {/* Bloque 2: Áreas de Conocimiento */}
                                <div style={{
                                  background: "#1e293b",
                                  padding: "0.9rem",
                                  borderRadius: "10px",
                                  border: "1.5px solid #a855f7",
                                  boxShadow: "0 4px 12px rgba(0,0,0,0.25)"
                                }}>
                                  <div style={{
                                    fontSize: "0.8rem",
                                    fontWeight: 800,
                                    color: "#d8b4fe",
                                    marginBottom: "0.6rem",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.35rem"
                                  }}>
                                    🔬 Áreas de Conocimiento (Optativas 3 y 4):
                                  </div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                                    <div>
                                      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#c084fc", marginBottom: "0.25rem" }}>
                                        Optativa 3 (Área):
                                      </label>
                                      <select
                                        className="form-control"
                                        value={optArea3}
                                        onChange={(e) => {
                                          const copia = [...cfg.ffeOptativas];
                                          copia[2] = e.target.value;
                                          handleUpdateGrupoConfig(g.nombre, "ffeOptativas", copia);
                                        }}
                                        style={{
                                          background: "#0f172a",
                                          color: "#ffffff",
                                          border: "1px solid #a855f7",
                                          borderRadius: "6px",
                                          padding: "0.5rem 0.65rem",
                                          fontSize: "0.8rem",
                                          fontWeight: 600,
                                          width: "100%"
                                        }}
                                      >
                                        {FFE_AREAS_CONOCIMIENTO.map(opt => (
                                          <option key={opt} value={opt} style={{ background: "#0f172a", color: "#ffffff" }}>
                                            {opt}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div>
                                      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#c084fc", marginBottom: "0.25rem" }}>
                                        Optativa 4 (Área):
                                      </label>
                                      <select
                                        className="form-control"
                                        value={optArea4}
                                        onChange={(e) => {
                                          const copia = [...cfg.ffeOptativas];
                                          copia[3] = e.target.value;
                                          handleUpdateGrupoConfig(g.nombre, "ffeOptativas", copia);
                                        }}
                                        style={{
                                          background: "#0f172a",
                                          color: "#ffffff",
                                          border: "1px solid #a855f7",
                                          borderRadius: "6px",
                                          padding: "0.5rem 0.65rem",
                                          fontSize: "0.8rem",
                                          fontWeight: 600,
                                          width: "100%"
                                        }}
                                      >
                                        {FFE_AREAS_CONOCIMIENTO.filter(o => o !== optArea3).map(opt => (
                                          <option key={opt} value={opt} style={{ background: "#0f172a", color: "#ffffff" }}>
                                            {opt}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* 📗 Bloque informativo: Semestre B (6.º Semestre automático) */}
                            <div style={{ background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "0.75rem 1rem", borderRadius: "10px" }}>
                              <div style={{ fontSize: "0.78125rem", fontWeight: 800, color: "#34d399", marginBottom: "0.3rem" }}>
                                📗 Semestre B Correspondiente (6.º Semestre - Grupo 6° {letra})
                              </div>
                              <div style={{ fontSize: "0.725rem", color: "#86efac", lineHeight: 1.4 }}>
                                • <strong>Laboral:</strong> Submódulos 5 y 6 de <em>{cfg.capacitacionNombre}</em> (Automático)<br />
                                • <strong>Socioemocional:</strong> <em>{socio4y6}</em> (Automático)<br />
                                • <strong>Optativas FFE:</strong> Mantiene las 4 optativas FFE de 5.º Semestre (Automático)
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{
          padding: "1rem 1.5rem",
          background: "#1e293b",
          borderTop: "1px solid #334155",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
            Total de grupos a registrar: <strong style={{ color: "#ffffff" }}>{g1 + g2 + g3} grupos</strong>
          </span>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            {isAdmin && onClose && (
              <button
                type="button"
                onClick={onClose}
                disabled={guardando}
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  border: "1px solid rgba(239, 68, 68, 0.5)",
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#fca5a5",
                  borderRadius: "8px",
                  padding: "0.5rem 0.9rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  cursor: "pointer"
                }}
              >
                <X size={16} /> Cerrar sin guardar (Admin)
              </button>
            )}

            {paso === 2 && (
              <button
                onClick={() => setPaso(1)}
                disabled={guardando}
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  background: "#334155",
                  color: "#f8fafc",
                  border: "1px solid #475569",
                  borderRadius: "8px",
                  padding: "0.5rem 0.9rem",
                  cursor: "pointer"
                }}
              >
                Regresar a Grupos
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={guardando}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.85rem",
                fontWeight: 700,
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "0.5rem 1.1rem",
                cursor: guardando ? "not-allowed" : "pointer"
              }}
            >
              {guardando ? (
                <>
                  <RefreshCw size={16} className="spin" /> Guardando...
                </>
              ) : (
                <>
                  <Save size={16} /> Guardar Mapa Curricular del Plantel
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
