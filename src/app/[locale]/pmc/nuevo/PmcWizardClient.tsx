'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ── Types ────────────────────────────────────────────────────────────────────

interface StaffMember {
  nombre: string;
  cargo: string;
  meta_individual?: string;
}

interface IndicadoresAcademicos {
  matricula?: number;
  aprobacion_ant?: number;
  aprobacion_meta?: number;
  reprobacion_ant?: number;
  reprobacion_meta?: number;
  abandono_ant?: number;
  abandono_meta?: number;
  et_ant?: number;
  et_meta?: number;
}

interface Foda {
  fortalezas: string;
  oportunidades: string;
  debilidades: string;
  amenazas: string;
}

interface MetaInstitucional {
  categoria: string;
  nombre_categoria: string;
  tema: string;
  meta: string;
  estrategia: string;
  linea_base: string;
  personal_designado: string;
  entregable: string;
  periodo_inicio: string;
  periodo_fin: string;
  diagnostico_meta: string;
}

interface MetaPersonal {
  nombre: string;
  cargo: string;
  meta_individual: string;
  estrategia: string;
  entregable: string;
  periodo: string;
}

interface PlanAccion {
  metas_institucionales: MetaInstitucional[];
  metas_personales: MetaPersonal[];
}

interface DiagnosticoGenerado {
  presentacion: string;
  contexto: string;
  analisis_indicadores: string;
  sintesis_foda: string;
  priorizacion: string;
}

interface PmcProject {
  id?: string;
  school_name?: string;
  school_cct?: string;
  municipality?: string;
  locality?: string;
  school_zone?: string;
  director_name?: string;
  supervisor_name?: string;
  ciclo_escolar?: string;
  subsystem?: string;
  total_staff?: number;
  staff_data?: StaffMember[];
  indicadores_academicos?: IndicadoresAcademicos;
  foda?: Foda;
  categorias_priorizadas?: CategoriaPriorizada[];
  diagnostico_comunidad?: string;
  normativa?: Record<string, string>;
  diagnostico_generado?: DiagnosticoGenerado;
  plan_accion?: PlanAccion;
  current_step?: number;
  status?: string;
}

interface Props {
  locale: string;
  teacherId: string;
  teacherName: string;
  teacherSchool?: string;
  teacherMunicipality?: string;
  existingProject: PmcProject | null;
}

// ── Constants ────────────────────────────────────────────────────────────────

interface CategoriaPriorizada {
  id: string;
  nombre: string;
  temas: string[];
}

const CATEGORIAS_OFICIALES = [
  {
    id: '1',
    nombre: 'Categoría 1: Desarrollo académico y aprendizaje',
    color: '#1a4a7a',
    temas: [
      'Formación y actualización docente',
      'Propuestas pedagógicas',
      'Trabajo colegiado',
      'Proyecto Escolar Comunitario (PEC)',
      'Movimiento Nacional por la Alfabetización y la Educación (MONAE)',
      'Clubes de lectura',
      'Indicadores académicos (reprobación, eficiencia terminal y abandono escolar)',
      'Orientación y Tutoría',
      'Planeación didáctica',
      'Otras actividades académicas (proyectos escolares)',
    ],
  },
  {
    id: '2',
    nombre: 'Categoría 2: Gestión y administración escolar',
    color: '#2d6a2d',
    temas: [
      'Vinculación con instituciones educativas',
      'Vinculación con empresas, fundaciones e instituciones públicas',
      'Gestión y administración de recursos, equipamiento y servicios',
      'Seguimiento al desempeño docente en el aula',
      'Seguimiento de egresados',
    ],
  },
  {
    id: '3',
    nombre: 'Categoría 3: Desarrollo socioemocional y prevención de la violencia',
    color: '#7a1a1a',
    temas: [
      'Ámbitos de formación socioemocional (Currículum Ampliado)',
      'Estrategias, programas y/o proyectos sobre violencia',
      'Orientación educativa',
    ],
  },
];

const CARGOS_COMUNES = [
  'Director(a)',
  'Subdirector(a)',
  'Secretario(a) académico(a)',
  'Orientador(a) educativo(a)',
  'Docente de tiempo completo',
  'Docente por horas',
  'Auxiliar administrativo(a)',
  'Prefecto(a)',
  'Trabajador(a) social',
  'Personal de intendencia',
  'Personal de mantenimiento',
  'Otro',
];

const SUBSISTEMAS = ['BGE', 'TBC', 'CBTA', 'CECyTE', 'COBACH', 'Preparatoria federal', 'Otro'];

const STEPS = [
  { n: 1, label: 'Datos institucionales' },
  { n: 2, label: 'Personal' },
  { n: 3, label: 'Diagnóstico' },
  { n: 4, label: 'Generación IA' },
  { n: 5, label: 'Revisión y exportar' },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function PmcWizardClient({ locale, teacherId, teacherName, teacherSchool, teacherMunicipality, existingProject }: Props) {
  const router = useRouter();

  // Initialize state from existing project or defaults
  const [projectId, setProjectId] = useState<string | null>(existingProject?.id || null);
  const [activeStep, setActiveStep] = useState<number>(existingProject?.current_step || 1);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingMeta, setEditingMeta] = useState<number | null>(null);
  const [editingPersonal, setEditingPersonal] = useState<number | null>(null);

  // Step 1: Institutional data
  const [schoolName, setSchoolName] = useState(existingProject?.school_name || teacherSchool || '');
  const [schoolCct, setSchoolCct] = useState(existingProject?.school_cct || '');
  const [municipality, setMunicipality] = useState(existingProject?.municipality || teacherMunicipality || '');
  const [locality, setLocality] = useState(existingProject?.locality || '');
  const [schoolZone, setSchoolZone] = useState(existingProject?.school_zone || '');
  const [directorName, setDirectorName] = useState(existingProject?.director_name || '');
  const [supervisorName, setSupervisorName] = useState(existingProject?.supervisor_name || '');
  const [cicloEscolar, setCicloEscolar] = useState(existingProject?.ciclo_escolar || '2025-2026');
  const [subsystem, setSubsystem] = useState(existingProject?.subsystem || 'BGE');

  // Step 2: Staff
  const [totalStaff, setTotalStaff] = useState(existingProject?.total_staff || 1);
  const [staffData, setStaffData] = useState<StaffMember[]>(
    existingProject?.staff_data || [{ nombre: '', cargo: 'Director(a)', meta_individual: '' }]
  );

  // Step 3: Diagnosis
  const [diagnosticoComunidad, setDiagnosticoComunidad] = useState(existingProject?.diagnostico_comunidad || '');
  const [indicadores, setIndicadores] = useState<IndicadoresAcademicos>(
    existingProject?.indicadores_academicos || {
      matricula: undefined,
      aprobacion_ant: undefined, aprobacion_meta: undefined,
      reprobacion_ant: undefined, reprobacion_meta: undefined,
      abandono_ant: undefined, abandono_meta: undefined,
      et_ant: undefined, et_meta: undefined,
    }
  );
  const [foda, setFoda] = useState<Foda>(
    existingProject?.foda || { fortalezas: '', oportunidades: '', debilidades: '', amenazas: '' }
  );
  const [categoriasPriorizadas, setCategoriasPriorizadas] = useState<CategoriaPriorizada[]>(
    existingProject?.categorias_priorizadas || []
  );

  // Step 4: Generated content
  const [diagnosticoGenerado, setDiagnosticoGenerado] = useState<DiagnosticoGenerado | null>(
    existingProject?.diagnostico_generado || null
  );
  const [planAccion, setPlanAccion] = useState<PlanAccion | null>(
    existingProject?.plan_accion || null
  );

  // ── Helpers ────────────────────────────────────────────────────────────────

  const saveProject = useCallback(async (data: Partial<PmcProject>, goToStep?: number): Promise<string | null> => {
    setSaving(true);
    setError(null);
    try {
      const payload = { ...data };
      if (goToStep !== undefined) payload.current_step = goToStep;

      if (!projectId) {
        // Create new
        const res = await fetch('/api/pmc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            school_name: schoolName, school_cct: schoolCct, municipality,
            locality, school_zone: schoolZone, director_name: directorName,
            supervisor_name: supervisorName, ciclo_escolar: cicloEscolar, subsystem,
            ...payload,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        const created = await res.json();
        setProjectId(created.id);
        router.replace(`/${locale}/pmc/nuevo?id=${created.id}`);
        return created.id;
      } else {
        // Update existing
        const res = await fetch(`/api/pmc/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        return projectId;
      }
    } catch (e: unknown) {
      setError((e as Error).message || 'Error al guardar');
      return null;
    } finally {
      setSaving(false);
    }
  }, [projectId, schoolName, schoolCct, municipality, locality, schoolZone, directorName, supervisorName, cicloEscolar, subsystem, locale, router]);

  const generateStep = useCallback(async (step: string): Promise<void> => {
    if (!projectId) return;
    setGenerating(step);
    setError(null);
    try {
      const res = await fetch(`/api/pmc/${projectId}/generate-step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Error al generar');
      }
      const data = await res.json();
      if (step === 'diagnostico' && data.diagnostico_generado) {
        setDiagnosticoGenerado(data.diagnostico_generado);
      }
      if (step === 'plan_accion' && data.plan_accion) {
        setPlanAccion(data.plan_accion);
      }
    } catch (e: unknown) {
      setError((e as Error).message || 'Error al generar contenido');
    } finally {
      setGenerating(null);
    }
  }, [projectId]);

  const adjustStaffCount = (newCount: number) => {
    const n = Math.max(1, Math.min(100, newCount));
    setTotalStaff(n);
    setStaffData(prev => {
      if (n > prev.length) {
        const toAdd = Array.from({ length: n - prev.length }, () => ({ nombre: '', cargo: 'Docente de tiempo completo', meta_individual: '' }));
        return [...prev, ...toAdd];
      }
      return prev.slice(0, n);
    });
  };

  // Toggle categoria (activa/desactiva la categoría completa)
  const toggleCategoria = (cat: typeof CATEGORIAS_OFICIALES[0]) => {
    setCategoriasPriorizadas(prev => {
      const exists = prev.find(c => c.id === cat.id);
      if (exists) return prev.filter(c => c.id !== cat.id);
      return [...prev, { id: cat.id, nombre: cat.nombre, temas: [] }];
    });
  };

  // Toggle tema dentro de una categoría
  const toggleTema = (catId: string, tema: string) => {
    setCategoriasPriorizadas(prev => prev.map(c => {
      if (c.id !== catId) return c;
      const temas = c.temas.includes(tema)
        ? c.temas.filter(t => t !== tema)
        : [...c.temas, tema];
      return { ...c, temas };
    }));
  };

  const isCatSelected = (id: string) => categoriasPriorizadas.some(c => c.id === id);
  const isTemaSelected = (catId: string, tema: string) =>
    categoriasPriorizadas.find(c => c.id === catId)?.temas.includes(tema) ?? false;
  const totalTemasSeleccionados = categoriasPriorizadas.reduce((sum, c) => sum + c.temas.length, 0);

  // ── Step navigation ────────────────────────────────────────────────────────

  const handleNext = async () => {
    setError(null);
    let idToUse = projectId;

    if (activeStep === 1) {
      if (!schoolName.trim() || !schoolCct.trim() || !directorName.trim()) {
        setError('Por favor completa: nombre del plantel, CCT y nombre del director.');
        return;
      }
      idToUse = await saveProject({
        school_name: schoolName, school_cct: schoolCct, municipality, locality,
        school_zone: schoolZone, director_name: directorName, supervisor_name: supervisorName,
        ciclo_escolar: cicloEscolar, subsystem, current_step: 2,
      });
    } else if (activeStep === 2) {
      const incomplete = staffData.some(s => !s.nombre.trim() || !s.cargo.trim());
      if (incomplete) {
        setError('Por favor completa el nombre y cargo de todos los miembros del personal.');
        return;
      }
      idToUse = await saveProject({ total_staff: totalStaff, staff_data: staffData, current_step: 3 });
    } else if (activeStep === 3) {
      if (!diagnosticoComunidad.trim()) {
        setError('Por favor describe el contexto de la comunidad.');
        return;
      }
      if (categoriasPriorizadas.length === 0 || totalTemasSeleccionados === 0) {
        setError('Selecciona al menos una categoría y al menos un tema a priorizar.');
        return;
      }
      idToUse = await saveProject({
        diagnostico_comunidad: diagnosticoComunidad,
        indicadores_academicos: indicadores,
        foda, categorias_priorizadas: categoriasPriorizadas,
        current_step: 4,
      });
    } else if (activeStep === 4) {
      if (!diagnosticoGenerado || !planAccion) {
        setError('Debes generar tanto el diagnóstico como el plan de acción con IA antes de continuar.');
        return;
      }
      idToUse = await saveProject({
        diagnostico_generado: diagnosticoGenerado,
        plan_accion: planAccion,
        status: 'completed',
        current_step: 5,
      });
    }

    if (idToUse) {
      setActiveStep(s => Math.min(s + 1, 5));
    }
  };

  const handleBack = () => setActiveStep(s => Math.max(s - 1, 1));

  // ── Render ────────────────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: '6px',
    border: '1px solid var(--c-border)', fontSize: '14px',
    fontFamily: 'inherit', background: '#fff',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontWeight: 600, fontSize: '13px',
    color: 'var(--c-text)', marginBottom: '4px',
  };
  const sectionCard: React.CSSProperties = {
    background: '#fff', borderRadius: '10px', border: '1px solid var(--c-border)',
    padding: '20px', marginBottom: '16px',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ background: 'var(--c-navy)', color: '#fff', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>📈</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>Plan de Mejora Continua</div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>Lineamientos DBEPA {cicloEscolar}</div>
          </div>
        </div>
        <Link href={`/${locale}/pmc`} style={{ color: '#fff', textDecoration: 'none', fontSize: '13px', opacity: 0.8 }}>
          ← Volver
        </Link>
      </header>

      {/* Progress steps */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--c-border)', padding: '0 24px' }}>
        <div style={{ display: 'flex', gap: 0, maxWidth: '900px', margin: '0 auto' }}>
          {STEPS.map(step => (
            <div key={step.n} style={{
              flex: 1, padding: '14px 8px', textAlign: 'center', fontSize: '12px', fontWeight: 600,
              borderBottom: `3px solid ${activeStep === step.n ? 'var(--c-amber)' : activeStep > step.n ? 'var(--c-green)' : 'transparent'}`,
              color: activeStep === step.n ? 'var(--c-navy)' : activeStep > step.n ? 'var(--c-green)' : 'var(--c-text-muted)',
              cursor: activeStep > step.n ? 'pointer' : 'default',
            }} onClick={() => activeStep > step.n && setActiveStep(step.n)}>
              <div style={{ fontSize: '18px', marginBottom: '2px' }}>
                {activeStep > step.n ? '✓' : step.n}
              </div>
              {step.label}
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: '24px', maxWidth: '900px', margin: '0 auto', width: '100%' }}>

        {/* Error banner */}
        {error && (
          <div style={{ background: '#f8d7da', color: '#721c24', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', border: '1px solid #f5c6cb' }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── STEP 1: Datos Institucionales ─────────────────────────── */}
        {activeStep === 1 && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--c-navy)', marginBottom: '8px' }}>
              Paso 1: Datos Institucionales
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--c-text-muted)', marginBottom: '20px' }}>
              Ingresa los datos generales del plantel educativo. Esta información aparecerá en la portada del PMC.
            </p>

            <div style={sectionCard}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--c-navy-light)', marginBottom: '16px' }}>🏫 Datos del Plantel</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Nombre oficial del plantel *</label>
                  <input style={inputStyle} value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="Ej: Bachillerato General Oficial 'Lázaro Cárdenas'" />
                </div>
                <div>
                  <label style={labelStyle}>Clave de Centro de Trabajo (CCT) *</label>
                  <input style={inputStyle} value={schoolCct} onChange={e => setSchoolCct(e.target.value.toUpperCase())} placeholder="Ej: 21EBH0000A" maxLength={12} />
                  <small style={{ color: 'var(--c-text-muted)', fontSize: '11px' }}>Formato: 21EBH0000X (10 caracteres)</small>
                </div>
                <div>
                  <label style={labelStyle}>Subsistema</label>
                  <select style={inputStyle} value={subsystem} onChange={e => setSubsystem(e.target.value)}>
                    {SUBSISTEMAS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Municipio *</label>
                  <input style={inputStyle} value={municipality} onChange={e => setMunicipality(e.target.value)} placeholder="Ej: Zacapoaxtla" />
                </div>
                <div>
                  <label style={labelStyle}>Localidad / Comunidad *</label>
                  <input style={inputStyle} value={locality} onChange={e => setLocality(e.target.value)} placeholder="Ej: San Marcos Tlacoyalco" />
                </div>
                <div>
                  <label style={labelStyle}>Zona Escolar</label>
                  <input style={inputStyle} value={schoolZone} onChange={e => setSchoolZone(e.target.value)} placeholder="Ej: Zona 004" />
                </div>
                <div>
                  <label style={labelStyle}>Ciclo escolar</label>
                  <input style={inputStyle} value={cicloEscolar} onChange={e => setCicloEscolar(e.target.value)} placeholder="2025-2026" />
                </div>
              </div>
            </div>

            <div style={sectionCard}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--c-navy-light)', marginBottom: '16px' }}>👤 Autoridades</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Nombre del Director(a) *</label>
                  <input style={inputStyle} value={directorName} onChange={e => setDirectorName(e.target.value)} placeholder="Nombre completo del director(a)" />
                </div>
                <div>
                  <label style={labelStyle}>Nombre del Supervisor(a) de Zona</label>
                  <input style={inputStyle} value={supervisorName} onChange={e => setSupervisorName(e.target.value)} placeholder="Nombre completo del supervisor(a)" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Personal ────────────────────────────────────────── */}
        {activeStep === 2 && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--c-navy)', marginBottom: '8px' }}>
              Paso 2: Personal del Plantel
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--c-text-muted)', marginBottom: '20px' }}>
              Registra a <strong>todo el personal</strong> del plantel. Cada persona debe participar en el PMC
              con una meta individual. Si no defines su meta ahora, la IA generará una acorde a su cargo.
            </p>

            <div style={sectionCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={labelStyle}>Número total de trabajadores en el plantel</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => adjustStaffCount(totalStaff - 1)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--c-border)', cursor: 'pointer', fontSize: '16px' }}>−</button>
                    <span style={{ fontSize: '24px', fontWeight: 700, minWidth: '40px', textAlign: 'center', color: 'var(--c-navy)' }}>{totalStaff}</span>
                    <button onClick={() => adjustStaffCount(totalStaff + 1)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--c-border)', cursor: 'pointer', fontSize: '16px' }}>+</button>
                    <span style={{ fontSize: '13px', color: 'var(--c-text-muted)', marginLeft: '8px' }}>personas</span>
                  </div>
                </div>
                <div style={{ flex: 1, padding: '12px', background: 'var(--c-blue-pale)', borderRadius: '8px', fontSize: '13px', color: 'var(--c-navy)' }}>
                  💡 Incluye: director, docentes, orientador, prefectos, administrativos, intendentes, etc. Todos deben tener una meta en el PMC.
                </div>
              </div>

              {staffData.map((member, idx) => (
                <div key={idx} style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--c-border)', paddingTop: idx === 0 ? 0 : '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--c-navy)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                      {idx + 1}
                    </div>
                    <strong style={{ fontSize: '14px', color: 'var(--c-navy)' }}>
                      {member.nombre || `Trabajador ${idx + 1}`}
                    </strong>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>Nombre completo *</label>
                      <input
                        style={inputStyle}
                        value={member.nombre}
                        onChange={e => {
                          const copy = [...staffData];
                          copy[idx] = { ...copy[idx], nombre: e.target.value };
                          setStaffData(copy);
                        }}
                        placeholder="Nombre del trabajador"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Cargo / Función *</label>
                      <select
                        style={inputStyle}
                        value={member.cargo}
                        onChange={e => {
                          const copy = [...staffData];
                          copy[idx] = { ...copy[idx], cargo: e.target.value };
                          setStaffData(copy);
                        }}
                      >
                        {CARGOS_COMUNES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>Meta individual para el ciclo {cicloEscolar} (opcional — si no la defines la IA la generará)</label>
                      <textarea
                        style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                        value={member.meta_individual || ''}
                        onChange={e => {
                          const copy = [...staffData];
                          copy[idx] = { ...copy[idx], meta_individual: e.target.value };
                          setStaffData(copy);
                        }}
                        placeholder="Ej: Reducir mi índice de reprobación del 15% al 5% implementando estrategias de recuperación bimestral..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 3: Diagnóstico ─────────────────────────────────────── */}
        {activeStep === 3 && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--c-navy)', marginBottom: '8px' }}>
              Paso 3: Diagnóstico Socioeducativo
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--c-text-muted)', marginBottom: '20px' }}>
              Proporciona los datos del contexto comunitario, los indicadores académicos del ciclo anterior
              y el análisis FODA. La IA usará esta información para redactar el diagnóstico oficial.
            </p>

            {/* Contexto Comunitario */}
            <div style={sectionCard}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--c-navy-light)', marginBottom: '12px' }}>🌍 Contexto de la Comunidad</h3>
              <label style={labelStyle}>Descripción del contexto socioeducativo de la comunidad *</label>
              <textarea
                style={{ ...inputStyle, minHeight: '140px', resize: 'vertical' }}
                value={diagnosticoComunidad}
                onChange={e => setDiagnosticoComunidad(e.target.value)}
                placeholder="Describe la comunidad donde se ubica el plantel: ubicación geográfica, número de habitantes, condiciones socioeconómicas, acceso a servicios, problemáticas sociales relevantes (migración, marginación, violencia), acceso a internet y tecnología, distancia a centros urbanos, principales fuentes de empleo, etc."
              />
              <small style={{ color: 'var(--c-text-muted)', fontSize: '11px' }}>
                Incluye datos cuantitativos si los tienes (número de habitantes, % de marginación, etc.)
              </small>
            </div>

            {/* Indicadores académicos */}
            <div style={sectionCard}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--c-navy-light)', marginBottom: '12px' }}>📊 Indicadores Académicos</h3>
              <p style={{ fontSize: '13px', color: 'var(--c-text-muted)', marginBottom: '16px' }}>
                Ingresa los datos del ciclo anterior y tus metas para el ciclo {cicloEscolar}. Estos datos son obligatorios para el diagnóstico cuantitativo.
              </p>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--c-navy)', color: '#fff' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', width: '30%' }}>Indicador</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>% Ciclo Anterior</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>% Meta {cicloEscolar}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Aprobación', antKey: 'aprobacion_ant' as const, metaKey: 'aprobacion_meta' as const },
                      { label: 'Reprobación', antKey: 'reprobacion_ant' as const, metaKey: 'reprobacion_meta' as const },
                      { label: 'Abandono escolar / Deserción', antKey: 'abandono_ant' as const, metaKey: 'abandono_meta' as const },
                      { label: 'Eficiencia terminal', antKey: 'et_ant' as const, metaKey: 'et_meta' as const },
                    ].map((row, i) => (
                      <tr key={row.label} style={{ background: i % 2 === 0 ? '#fff' : 'var(--c-blue-pale)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{row.label}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <input
                              type="number" min={0} max={100} step={0.1}
                              style={{ width: '70px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--c-border)', textAlign: 'center' }}
                              value={indicadores[row.antKey] ?? ''}
                              onChange={e => setIndicadores(p => ({ ...p, [row.antKey]: parseFloat(e.target.value) || undefined }))}
                              placeholder="0"
                            />
                            <span>%</span>
                          </div>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <input
                              type="number" min={0} max={100} step={0.1}
                              style={{ width: '70px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--c-border)', textAlign: 'center', background: '#f0f7ff' }}
                              value={indicadores[row.metaKey] ?? ''}
                              onChange={e => setIndicadores(p => ({ ...p, [row.metaKey]: parseFloat(e.target.value) || undefined }))}
                              placeholder="0"
                            />
                            <span>%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: '12px' }}>
                <label style={labelStyle}>Matrícula total del plantel (alumnos)</label>
                <input
                  type="number" min={1}
                  style={{ ...inputStyle, width: '160px' }}
                  value={indicadores.matricula ?? ''}
                  onChange={e => setIndicadores(p => ({ ...p, matricula: parseInt(e.target.value) || undefined }))}
                  placeholder="Número de alumnos"
                />
              </div>
            </div>

            {/* FODA */}
            <div style={sectionCard}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--c-navy-light)', marginBottom: '12px' }}>📋 Análisis FODA del Plantel</h3>
              <p style={{ fontSize: '13px', color: 'var(--c-text-muted)', marginBottom: '16px' }}>
                Realizado de manera colegiada con todo el personal del plantel.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {[
                  { key: 'fortalezas' as const, label: '💪 Fortalezas', hint: 'Recursos, capacidades y ventajas internas del plantel', color: '#d4edda' },
                  { key: 'oportunidades' as const, label: '🌟 Oportunidades', hint: 'Factores externos favorables que puede aprovechar el plantel', color: '#d1ecf1' },
                  { key: 'debilidades' as const, label: '⚠️ Debilidades', hint: 'Limitaciones internas y áreas de oportunidad del plantel', color: '#fff3cd' },
                  { key: 'amenazas' as const, label: '🔴 Amenazas', hint: 'Factores externos que pueden afectar negativamente al plantel', color: '#f8d7da' },
                ].map(field => (
                  <div key={field.key}>
                    <label style={{ ...labelStyle, color: 'var(--c-navy)' }}>{field.label}</label>
                    <small style={{ display: 'block', color: 'var(--c-text-muted)', fontSize: '11px', marginBottom: '6px' }}>{field.hint}</small>
                    <textarea
                      style={{ ...inputStyle, minHeight: '100px', background: field.color, resize: 'vertical' }}
                      value={foda[field.key]}
                      onChange={e => setFoda(p => ({ ...p, [field.key]: e.target.value }))}
                      placeholder={`Lista los principales ${field.label.split(' ')[1].toLowerCase()}...`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Categorías y Temas Priorizados */}
            <div style={sectionCard}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--c-navy-light)', marginBottom: '4px' }}>🎯 Categorías y Temas a Priorizar *</h3>
              <p style={{ fontSize: '13px', color: 'var(--c-text-muted)', marginBottom: '8px' }}>
                Según los <strong>Lineamientos DBEPA 2025-2026</strong>, el PMC se organiza en <strong>3 categorías oficiales</strong>. Selecciona la(s) categoría(s) y marca los <strong>temas específicos</strong> que tu plantel abordará. La IA generará metas SMART (con Diagnóstico → Meta → Estrategia → Producto) para cada tema seleccionado.
              </p>
              {/* Nota metodológica SMART */}
              <div style={{ background: '#f0f7ff', border: '1px solid #c8dff5', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#1a4a7a' }}>
                <strong>📐 Metodología SMART:</strong> Cada meta que genere la IA será: <em>Específica · Medible · Alcanzable · Relevante · Temporal</em> — siguiendo la estructura: <strong>Diagnóstico → Meta → Estrategia → Producto</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {CATEGORIAS_OFICIALES.map(cat => {
                  const selected = isCatSelected(cat.id);
                  const temasSeleccionados = categoriasPriorizadas.find(c => c.id === cat.id)?.temas ?? [];
                  return (
                    <div key={cat.id} style={{ border: `2px solid ${selected ? cat.color : 'var(--c-border)'}`, borderRadius: '10px', overflow: 'hidden', transition: 'all 0.2s' }}>
                      {/* Categoría header */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', background: selected ? `${cat.color}18` : '#fafafa', userSelect: 'none' }}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleCategoria(cat)}
                          style={{ width: '18px', height: '18px', accentColor: cat.color, flexShrink: 0 }}
                        />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: selected ? cat.color : 'var(--c-text)' }}>{cat.nombre}</span>
                          {selected && temasSeleccionados.length > 0 && (
                            <span style={{ marginLeft: '10px', fontSize: '11px', background: cat.color, color: '#fff', borderRadius: '20px', padding: '2px 8px' }}>
                              {temasSeleccionados.length} tema(s)
                            </span>
                          )}
                        </div>
                      </label>
                      {/* Temas (subcategorías) — solo visibles si la categoría está seleccionada */}
                      {selected && (
                        <div style={{ padding: '8px 16px 14px 48px', background: '#fff', borderTop: `1px solid ${cat.color}30` }}>
                          <p style={{ fontSize: '11px', color: 'var(--c-text-muted)', marginBottom: '8px', fontStyle: 'italic' }}>
                            Selecciona los temas específicos que trabajará tu plantel en esta categoría:
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {cat.temas.map(tema => (
                              <label key={tema} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '13px', color: isTemaSelected(cat.id, tema) ? cat.color : 'var(--c-text)', fontWeight: isTemaSelected(cat.id, tema) ? 600 : 400 }}>
                                <input
                                  type="checkbox"
                                  checked={isTemaSelected(cat.id, tema)}
                                  onChange={() => toggleTema(cat.id, tema)}
                                  style={{ width: '14px', height: '14px', marginTop: '2px', accentColor: cat.color, flexShrink: 0 }}
                                />
                                {tema}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Resumen */}
              {totalTemasSeleccionados > 0 && (
                <div style={{ marginTop: '14px', padding: '10px 14px', background: '#e8f4e8', borderRadius: '8px', fontSize: '13px', color: '#2d6a2d', fontWeight: 600 }}>
                  ✅ {categoriasPriorizadas.length} categoría(s) · {totalTemasSeleccionados} tema(s) seleccionado(s) — la IA generará una meta SMART por cada tema
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 4: Generación IA ───────────────────────────────────── */}
        {activeStep === 4 && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--c-navy)', marginBottom: '8px' }}>
              Paso 4: Generación con Inteligencia Artificial
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--c-text-muted)', marginBottom: '20px' }}>
              La IA redactará el diagnóstico oficial y el plan de acción con metas SMART para tu plantel.
              Puedes editar cualquier sección después de generarla.
            </p>

            {/* Generate Diagnóstico */}
            <div style={sectionCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--c-navy-light)', margin: 0 }}>
                    📄 Diagnóstico Socioeducativo
                    {diagnosticoGenerado && <span style={{ marginLeft: '8px', color: '#28a745', fontSize: '13px' }}>✓ Generado</span>}
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--c-text-muted)', margin: '4px 0 0' }}>
                    Presentación, contexto, análisis de indicadores, FODA y priorización de categorías
                  </p>
                </div>
                <button
                  onClick={() => generateStep('diagnostico')}
                  disabled={generating !== null}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: generating === 'diagnostico' ? '#ccc' : 'var(--c-navy)', color: '#fff', fontWeight: 600, cursor: generating !== null ? 'not-allowed' : 'pointer', fontSize: '13px' }}
                >
                  {generating === 'diagnostico' ? '⏳ Generando...' : diagnosticoGenerado ? '🔄 Regenerar' : '✨ Generar Diagnóstico'}
                </button>
              </div>
              {diagnosticoGenerado && (
                <div style={{ background: 'var(--c-gray)', borderRadius: '8px', padding: '16px', fontSize: '13px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <strong style={{ color: 'var(--c-navy)' }}>Presentación:</strong>
                    <p style={{ marginTop: '4px', lineHeight: '1.6', color: 'var(--c-text)' }}>{diagnosticoGenerado.presentacion}</p>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <strong style={{ color: 'var(--c-navy)' }}>Contexto Socioeducativo:</strong>
                    <p style={{ marginTop: '4px', lineHeight: '1.6' }}>{diagnosticoGenerado.contexto}</p>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <strong style={{ color: 'var(--c-navy)' }}>Análisis de Indicadores Académicos:</strong>
                    <p style={{ marginTop: '4px', lineHeight: '1.6' }}>{diagnosticoGenerado.analisis_indicadores}</p>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <strong style={{ color: 'var(--c-navy)' }}>Síntesis FODA:</strong>
                    <p style={{ marginTop: '4px', lineHeight: '1.6' }}>{diagnosticoGenerado.sintesis_foda}</p>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--c-navy)' }}>Priorización de Categorías:</strong>
                    <p style={{ marginTop: '4px', lineHeight: '1.6' }}>{diagnosticoGenerado.priorizacion}</p>
                  </div>
                </div>
              )}
              {!diagnosticoGenerado && generating !== 'diagnostico' && (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--c-text-muted)', background: 'var(--c-gray)', borderRadius: '8px', fontSize: '13px' }}>
                  Haz clic en "Generar Diagnóstico" para que la IA redacte el diagnóstico oficial del PMC
                </div>
              )}
              {generating === 'diagnostico' && (
                <div style={{ padding: '32px', textAlign: 'center', background: 'var(--c-blue-pale)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>🤖</div>
                  <p style={{ fontWeight: 600, color: 'var(--c-navy)' }}>Generando diagnóstico...</p>
                  <p style={{ fontSize: '13px', color: 'var(--c-text-muted)' }}>La IA está analizando el contexto y los indicadores del plantel</p>
                </div>
              )}
            </div>

            {/* Generate Plan de Acción */}
            <div style={sectionCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--c-navy-light)', margin: 0 }}>
                    🎯 Plan de Acción con Metas SMART
                    {planAccion && <span style={{ marginLeft: '8px', color: '#28a745', fontSize: '13px' }}>✓ Generado</span>}
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--c-text-muted)', margin: '4px 0 0' }}>
                    Metas institucionales por categoría + metas individuales para los {totalStaff} trabajadores
                  </p>
                </div>
                <button
                  onClick={() => generateStep('plan_accion')}
                  disabled={generating !== null || !diagnosticoGenerado}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: generating === 'plan_accion' ? '#ccc' : !diagnosticoGenerado ? '#999' : 'var(--c-amber)', color: '#fff', fontWeight: 600, cursor: (generating !== null || !diagnosticoGenerado) ? 'not-allowed' : 'pointer', fontSize: '13px' }}
                >
                  {generating === 'plan_accion' ? '⏳ Generando...' : planAccion ? '🔄 Regenerar' : '✨ Generar Plan de Acción'}
                </button>
              </div>
              {!diagnosticoGenerado && <p style={{ fontSize: '12px', color: '#856404', background: '#fff3cd', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px' }}>⚠️ Primero genera el diagnóstico para poder generar el plan de acción.</p>}

              {planAccion && (
                <div>
                  {/* Metas institucionales */}
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--c-navy)', marginBottom: '12px' }}>
                    Metas Institucionales ({planAccion.metas_institucionales.length})
                  </h4>
                  {planAccion.metas_institucionales.map((meta, i) => (
                    <div key={i} style={{ marginBottom: '12px', borderRadius: '8px', border: '1px solid var(--c-border)', overflow: 'hidden' }}>
                      <div style={{ background: 'var(--c-navy)', color: '#fff', padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px' }}>
                          {meta.nombre_categoria} — {meta.tema}
                        </span>
                        <button
                          onClick={() => setEditingMeta(editingMeta === i ? null : i)}
                          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          {editingMeta === i ? 'Cerrar' : '✏️ Editar'}
                        </button>
                      </div>
                      <div style={{ padding: '12px 14px', background: '#fff', fontSize: '13px' }}>
                        {editingMeta === i ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {[
                              { key: 'meta', label: 'Meta SMART', multi: true },
                              { key: 'estrategia', label: 'Estrategia de implementación', multi: true },
                              { key: 'personal_designado', label: 'Personal designado', multi: false },
                              { key: 'entregable', label: 'Entregable / Evidencia', multi: true },
                              { key: 'periodo_inicio', label: 'Período inicio (MM/YYYY)', multi: false },
                              { key: 'periodo_fin', label: 'Período fin (MM/YYYY)', multi: false },
                            ].map(f => (
                              <div key={f.key}>
                                <label style={{ ...labelStyle, fontSize: '12px' }}>{f.label}</label>
                                {f.multi ? (
                                  <textarea
                                    value={((meta as unknown) as Record<string, string>)[f.key] || ''}
                                    onChange={e => {
                                      const copy = { ...planAccion };
                                      const arr = [...copy.metas_institucionales];
                                      arr[i] = { ...arr[i], [f.key]: e.target.value };
                                      copy.metas_institucionales = arr;
                                      setPlanAccion(copy);
                                    }}
                                    style={{ ...inputStyle, minHeight: '70px', fontSize: '13px' }}
                                  />
                                ) : (
                                  <input
                                    value={((meta as unknown) as Record<string, string>)[f.key] || ''}
                                    onChange={e => {
                                      const copy = { ...planAccion };
                                      const arr = [...copy.metas_institucionales];
                                      arr[i] = { ...arr[i], [f.key]: e.target.value };
                                      copy.metas_institucionales = arr;
                                      setPlanAccion(copy);
                                    }}
                                    style={{ ...inputStyle, fontSize: '13px' }}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div style={{ gridColumn: '1/-1' }}><strong>Meta:</strong> {meta.meta}</div>
                            <div style={{ gridColumn: '1/-1' }}><strong>Estrategia:</strong> {meta.estrategia}</div>
                            <div><strong>Responsable:</strong> {meta.personal_designado}</div>
                            <div><strong>Período:</strong> {meta.periodo_inicio} — {meta.periodo_fin}</div>
                            <div style={{ gridColumn: '1/-1' }}><strong>Entregable:</strong> {meta.entregable}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Metas personales */}
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--c-navy)', margin: '20px 0 12px' }}>
                    Metas Individuales del Personal ({planAccion.metas_personales.length} personas)
                  </h4>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {planAccion.metas_personales.map((mp, i) => (
                      <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '10px', padding: '10px', background: i % 2 === 0 ? '#fff' : 'var(--c-blue-pale)', borderRadius: '6px', border: '1px solid var(--c-border)', flexWrap: 'wrap' }}>
                        <div style={{ minWidth: '200px' }}>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--c-navy)' }}>{mp.nombre}</div>
                          <div style={{ fontSize: '12px', color: 'var(--c-text-muted)' }}>{mp.cargo}</div>
                        </div>
                        <div style={{ flex: 1, fontSize: '12px' }}>
                          {editingPersonal === i ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {[
                                { key: 'meta_individual', label: 'Meta individual' },
                                { key: 'entregable', label: 'Entregable' },
                                { key: 'periodo', label: 'Período' },
                              ].map(f => (
                                <div key={f.key}>
                                  <label style={{ ...labelStyle, fontSize: '11px' }}>{f.label}</label>
                                  <textarea
                                    value={((mp as unknown) as Record<string, string>)[f.key] || ''}
                                    onChange={e => {
                                      const copy = { ...planAccion };
                                      const arr = [...copy.metas_personales];
                                      arr[i] = { ...arr[i], [f.key]: e.target.value };
                                      copy.metas_personales = arr;
                                      setPlanAccion(copy);
                                    }}
                                    style={{ ...inputStyle, minHeight: '50px', fontSize: '12px' }}
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div>
                              <div><strong>Meta:</strong> {mp.meta_individual}</div>
                              <div style={{ marginTop: '4px' }}><strong>Entregable:</strong> {mp.entregable}</div>
                              <div style={{ marginTop: '4px', color: 'var(--c-text-muted)' }}>Período: {mp.periodo}</div>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => setEditingPersonal(editingPersonal === i ? null : i)}
                          style={{ background: 'var(--c-navy)', border: 'none', color: '#fff', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', alignSelf: 'flex-start', flexShrink: 0 }}
                        >
                          {editingPersonal === i ? '✓ OK' : '✏️'}
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={async () => {
                      if (!projectId) return;
                      setSaving(true);
                      await fetch(`/api/pmc/${projectId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ plan_accion: planAccion }),
                      });
                      setSaving(false);
                    }}
                    style={{ marginTop: '12px', padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#28a745', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
                    disabled={saving}
                  >
                    {saving ? 'Guardando...' : '💾 Guardar cambios del plan'}
                  </button>
                </div>
              )}
              {generating === 'plan_accion' && (
                <div style={{ padding: '32px', textAlign: 'center', background: 'var(--c-blue-pale)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>🤖</div>
                  <p style={{ fontWeight: 600, color: 'var(--c-navy)' }}>Generando plan de acción...</p>
                  <p style={{ fontSize: '13px', color: 'var(--c-text-muted)' }}>La IA está creando metas SMART para {totalStaff} trabajadores y {categoriasPriorizadas.length} categorías</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 5: Revisión y exportar ───────────────────────────── */}
        {activeStep === 5 && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--c-navy)', marginBottom: '8px' }}>
              Paso 5: Revisión Final y Exportación
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--c-text-muted)', marginBottom: '20px' }}>
              Tu PMC está completo. Descarga los documentos oficiales para su entrega a la supervisión.
            </p>

            {/* Summary card */}
            <div style={{ ...sectionCard, background: 'linear-gradient(135deg, var(--c-navy) 0%, #2d5a87 100%)', color: '#fff', border: 'none' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>✅ PMC Completado</h3>
              <p style={{ fontSize: '14px', opacity: 0.85, margin: '0 0 16px' }}>
                {schoolName} · CCT: {schoolCct} · Ciclo {cicloEscolar}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                {[
                  { label: 'Trabajadores con meta', value: planAccion?.metas_personales.length || 0 },
                  { label: 'Metas institucionales', value: planAccion?.metas_institucionales.length || 0 },
                  { label: 'Categorías priorizadas', value: categoriasPriorizadas.length },
                ].map(stat => (
                  <div key={stat.label} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', fontWeight: 700 }}>{stat.value}</div>
                    <div style={{ fontSize: '12px', opacity: 0.8 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Download buttons */}
            <div style={sectionCard}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--c-navy-light)', marginBottom: '16px' }}>📥 Documentos para descargar</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'var(--c-blue-pale)', borderRadius: '8px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: 'var(--c-navy)', marginBottom: '4px' }}>📄 PMC Completo 2025-2026</div>
                    <div style={{ fontSize: '13px', color: 'var(--c-text-muted)' }}>Documento Word con todas las secciones: portada, normativa, diagnóstico, plan de acción, metas individuales y firmas</div>
                  </div>
                  <a
                    href={`/api/docx/pmc/${projectId}`}
                    className="btn btn-primary"
                    style={{ flexShrink: 0, backgroundColor: 'var(--c-navy)', borderColor: 'var(--c-navy)', textDecoration: 'none' }}
                  >
                    ↓ Descargar PMC
                  </a>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: '#d1ecf1', borderRadius: '8px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#0c5460', marginBottom: '4px' }}>📋 Plantilla: Informe Parcial de Avance</div>
                    <div style={{ fontSize: '13px', color: '#0c5460', opacity: 0.8 }}>
                      Formato personalizado para el seguimiento a mitad de ciclo. Incluye las metas de tu PMC con espacios para registrar los avances y evidencias reales.
                    </div>
                    <div style={{ fontSize: '12px', color: '#856404', background: '#fff3cd', padding: '4px 8px', borderRadius: '4px', marginTop: '6px', display: 'inline-block' }}>
                      ⚠️ Este documento lo debe completar el personal con evidencias reales — NO es generado por IA
                    </div>
                  </div>
                  <a
                    href={`/api/docx/pmc/${projectId}/informe-parcial`}
                    className="btn btn-sm"
                    style={{ flexShrink: 0, backgroundColor: '#17a2b8', borderColor: '#17a2b8', color: '#fff', textDecoration: 'none' }}
                  >
                    ↓ Informe Parcial
                  </a>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: '#d4edda', borderRadius: '8px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#155724', marginBottom: '4px' }}>📋 Plantilla: Informe Final</div>
                    <div style={{ fontSize: '13px', color: '#155724', opacity: 0.8 }}>
                      Formato para el informe anual al cierre del ciclo escolar. Incluye todas las metas institucionales e individuales con espacios para evidencias y conclusiones.
                    </div>
                    <div style={{ fontSize: '12px', color: '#856404', background: '#fff3cd', padding: '4px 8px', borderRadius: '4px', marginTop: '6px', display: 'inline-block' }}>
                      ⚠️ Este documento lo debe completar el personal con evidencias reales — NO es generado por IA
                    </div>
                  </div>
                  <a
                    href={`/api/docx/pmc/${projectId}/informe-final`}
                    className="btn btn-sm"
                    style={{ flexShrink: 0, backgroundColor: '#28a745', borderColor: '#28a745', color: '#fff', textDecoration: 'none' }}
                  >
                    ↓ Informe Final
                  </a>
                </div>
              </div>
            </div>

            <div style={{ ...sectionCard, background: '#fff3cd', borderColor: '#ffc107' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#856404', marginBottom: '8px' }}>📌 Instrucciones para los Informes</h3>
              <ul style={{ fontSize: '13px', color: '#856404', paddingLeft: '18px', margin: 0, lineHeight: '1.8' }}>
                <li>El <strong>Informe Parcial</strong> se entrega aproximadamente a mitad del ciclo escolar (enero-febrero 2026)</li>
                <li>El <strong>Informe Final</strong> se entrega al cierre del ciclo escolar (junio-julio 2026)</li>
                <li>Cada trabajador debe registrar sus avances con <strong>evidencias documentales reales</strong> (no fotografías solas)</li>
                <li>El director(a) consolida los informes individuales y elabora el informe institucional final</li>
                <li>Los informes deben ser firmados por el director y validados por el supervisor de zona</li>
              </ul>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '24px', borderTop: '1px solid var(--c-border)', paddingTop: '16px' }}>
          {activeStep > 1 ? (
            <button onClick={handleBack} disabled={saving} className="btn btn-secondary">
              ← Anterior
            </button>
          ) : (
            <Link href={`/${locale}/pmc`} className="btn btn-secondary">← Cancelar</Link>
          )}

          {activeStep < 5 && (
            <button onClick={handleNext} disabled={saving || generating !== null} className="btn btn-primary">
              {saving ? 'Guardando...' : activeStep === 4 ? '✓ Finalizar PMC' : 'Siguiente →'}
            </button>
          )}
          {activeStep === 5 && (
            <Link href={`/${locale}/pmc`} className="btn btn-primary">
              Ir a mis PMC →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
