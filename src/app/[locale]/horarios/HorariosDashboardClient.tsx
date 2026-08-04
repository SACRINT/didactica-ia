'use client';

import React, { useState, useEffect } from 'react';
import WizardConfiguracion from '@/components/horarios/WizardConfiguracion';
import EditorHorarios from '@/components/horarios/EditorHorarios';
import ModalConfiguracionMapaCurricular from '@/components/ModalConfiguracionMapaCurricular';
import { Sparkles, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  isDirector: boolean;
  teacherName: string;
}

export default function HorariosDashboardClient({ isDirector, teacherName }: Props) {
  const [loading, setLoading] = useState<boolean>(true);
  const [modo, setModo] = useState<'WIZARD' | 'EDITOR'>('WIZARD');
  const [pasoActual, setPasoActual] = useState<number>(1);
  const [mapaModalAbierto, setMapaModalAbierto] = useState<boolean>(false);

  const escuela = {
    id: 'didactica_plantel_1',
    cct: '21EBH0001X',
    nombre: 'Plantel DidactecaIA Puebla',
    gruposPrimerAno: 1,
    gruposSegundoAno: 1,
    gruposTercerAno: 1,
    mapaCurricularCompletado: true
  };

  const [escuelaState, setEscuelaState] = useState<any>(escuela);
  const [config, setConfig] = useState<any>(null);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [aulas, setAulas] = useState<any[]>([]);
  const [docentes, setDocentes] = useState<any[]>([]);
  const [cargas, setCargas] = useState<any[]>([]);
  const [horario, setHorario] = useState<any>(null);

  useEffect(() => {
    if (isDirector) {
      cargarDatos();
    } else {
      setLoading(false);
    }
  }, [isDirector]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/horarios/configuracion?escuelaId=${escuela.id}`);
      const data = await res.json();

      if (data.escuela) {
        setEscuelaState(data.escuela);
      }
      if (data.config) setConfig(data.config);
      if (data.grupos) setGrupos(data.grupos);
      if (data.aulas) setAulas(data.aulas);
      if (data.docentes) setDocentes(data.docentes);

      if (data.cargas) {
        const cargasNormalizadas = data.cargas.map((c: any) => ({
          grupoId: c.grupoId,
          asignaturaId: c.asignaturaId,
          uacName: c.asignatura?.uacName || c.uacName || '',
          personalId: c.personalId,
          horasSemanales: c.horasSemanales,
          requiereAulaEspecial: c.requiereAulaEspecial || false
        }));
        setCargas(cargasNormalizadas);
      }

      if (data.horario) {
        setHorario(data.horario);
        setModo('EDITOR');
        setPasoActual(4);
      } else {
        setModo('WIZARD');
        setPasoActual(1);
      }
    } catch (e) {
      console.error('Error cargando configuración de horarios:', e);
      toast.error('Error al cargar datos del horario');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerarHorarioIA = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/horarios/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          params: {
            grupos,
            docentes,
            aulas: aulas.length > 0 ? aulas : [{ id: 'aula-gen', nombre: 'Aula General', tipo: 'REGULAR' }],
            cargas,
            config: config || { horasPorDia: 6, diasLectivos: 5 }
          }
        })
      });

      const data = await res.json();
      const horarioResultado = data.horario || data.resultado;
      if (data.success && horarioResultado) {
        setHorario(horarioResultado);
        setModo('EDITOR');
        setPasoActual(4);
        toast.success('¡Horario generado exitosamente con 0 empalmes!');
      } else {
        toast.error(data.error || 'No se pudo generar el horario. Verifique la carga docente.');
      }
    } catch (e) {
      toast.error('Error al generar horario con IA');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarHorario = async () => {
    if (!confirm(`¿Estás SEGURO de eliminar el horario generado? Volverá al asistente de configuración.`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/horarios/generar?escuelaId=${escuela.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Horario generado eliminado exitosamente.');
        setHorario(null);
        await cargarDatos();
        setModo('WIZARD');
        setPasoActual(1);
      } else {
        toast.error(data.error || 'No se pudo eliminar el horario.');
      }
    } catch (e) {
      toast.error('Error al eliminar horario');
    } finally {
      setLoading(false);
    }
  };

  const handleVolverAWizard = async () => {
    await cargarDatos();
    setModo('WIZARD');
    setPasoActual(1);
  };

  const handleReiniciarMapaCurricular = async () => {
    if (!confirm('¿Estás SEGURO de reiniciar la configuración de horarios para este plantel?')) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/escuelas/${escuela.id}/mapa-curricular`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Configuración reiniciada correctamente.');
        try {
          localStorage.removeItem(`horarios_wizard_v4_${escuela.id}`);
        } catch (err) {}
        cargarDatos();
      } else {
        toast.error(data.error || 'Error al reiniciar la configuración.');
      }
    } catch (e) {
      toast.error('Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  if (!isDirector) {
    return (
      <div style={{
        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: 12, padding: 24, textAlign: 'center', margin: '40px auto', maxWidth: 600
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fca5a5', marginBottom: 8 }}>Acceso Exclusivo para Directores y Supervisión</h2>
        <p style={{ fontSize: 14, opacity: 0.8, lineHeight: 1.5 }}>
          Hola {teacherName}, esta herramienta está diseñada para la confección del horario escolar del plantel. Si eres Director, Supervisor o ATP y requieres acceso, solicita la actualización de tu rol en el panel administrativo.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <Sparkles style={{ width: '40px', height: '40px', color: '#2563eb', animation: 'spin 2s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#f8fafc' }}>Cargando Generador Inteligente de Horarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Controls */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '1rem', background: '#0f172a', padding: '1rem 1.25rem',
        borderRadius: '14px', border: '1px solid #334155'
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Calendar style={{ width: '22px', height: '22px', color: '#38bdf8' }} /> Asistente Interactivo de Horarios MCCEMS 2026-2027
          </h2>
          <p style={{ fontSize: '0.78125rem', color: '#94a3b8', margin: '0.25rem 0 0' }}>
            {escuelaState?.nombre || escuela.nombre} ({escuelaState?.cct || escuela.cct}) · Confección semiautomática sin empalmes
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setMapaModalAbierto(true)}
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff',
              padding: '0.45rem 0.85rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.78125rem',
              border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem'
            }}
          >
            ⚙️ Configurar Mapa Curricular
          </button>

          <button
            onClick={handleReiniciarMapaCurricular}
            style={{
              background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5',
              padding: '0.45rem 0.85rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.78125rem',
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem'
            }}
          >
            🔄 Reiniciar Configuración
          </button>

          {horario && (
            <button
              onClick={handleEliminarHorario}
              style={{
                background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5',
                padding: '0.45rem 0.85rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.78125rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem'
              }}
            >
              🗑️ Eliminar Horario Generado
            </button>
          )}
        </div>
      </div>

      {/* Stepper Principal */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#1e293b', border: '1px solid #334155', borderRadius: '14px',
        padding: '0.75rem 1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginRight: '0.5rem' }}>
            Navegación del Módulo:
          </span>
          {[
            { num: 1, label: '1. Estructura & Currículum' },
            { num: 2, label: '2. Plantilla Docente' },
            { num: 3, label: '3. Matriz por Semestre' },
            { num: 4, label: '4. Horario Generado (IA)' }
          ].map((step) => {
            const esActivo = pasoActual === step.num;
            const esCompletado = step.num < pasoActual || (step.num === 4 && !!horario);
            const esDeshabilitado = step.num === 4 && !horario;

            return (
              <button
                key={step.num}
                type="button"
                disabled={esDeshabilitado}
                onClick={() => {
                  if (step.num === 4) {
                    if (horario) {
                      setModo('EDITOR');
                      setPasoActual(4);
                    } else {
                      toast.error('Aún no se ha generado un horario. Complete los pasos 1-3 y haga clic en Generar.');
                    }
                  } else {
                    setModo('WIZARD');
                    setPasoActual(step.num);
                  }
                }}
                style={{
                  padding: '0.45rem 0.9rem', borderRadius: '20px', border: 'none',
                  fontSize: '0.8rem', fontWeight: 800,
                  cursor: esDeshabilitado ? 'not-allowed' : 'pointer',
                  background: esActivo ? '#2563eb' : esCompletado ? '#334155' : 'transparent',
                  color: esActivo ? '#ffffff' : esDeshabilitado ? '#64748b' : '#cbd5e1',
                  opacity: esDeshabilitado ? 0.6 : 1, transition: 'all 0.2s',
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem'
                }}
              >
                {step.num === 4 && horario ? '✨ ' : ''}{step.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content View */}
      {modo === 'WIZARD' ? (
        <WizardConfiguracion
          escuelaId={escuela.id}
          configInicial={config}
          gruposIniciales={grupos}
          aulasIniciales={aulas}
          docentesIniciales={docentes}
          cargasIniciales={cargas}
          onGenerarClick={handleGenerarHorarioIA}
          pasoInicial={pasoActual}
          onStepChange={(p) => setPasoActual(p)}
        />
      ) : (
        <EditorHorarios
          escuela={escuela}
          horarioInicial={horario}
          grupos={grupos}
          docentes={docentes}
          aulas={aulas}
          cargas={cargas}
          onVolverAWizard={handleVolverAWizard}
          onGuardarHorario={(h) => setHorario(h)}
        />
      )}

      {/* Modal de Configuración de Mapa Curricular */}
      <ModalConfiguracionMapaCurricular
        escuela={escuelaState || escuela}
        gruposIniciales={grupos}
        isOpen={mapaModalAbierto}
        onClose={() => setMapaModalAbierto(false)}
        onSaved={cargarDatos}
        forceObligatorio={false}
      />
    </div>
  );
}
