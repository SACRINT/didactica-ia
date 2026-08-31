'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { PipsProject, PipsPlantele, PipsProblematica, PipsObjetivo, PipsCronogramaActividad } from '@/types/pips';

// ─── Step labels ──────────────────────────────────────────────────────────────
const STEPS = [
  { n: 1, label: 'Datos de la Zona' },
  { n: 2, label: 'Presentación' },
  { n: 3, label: 'Evaluación Anterior' },
  { n: 4, label: 'Diagnóstico Territorial' },
  { n: 5, label: 'Objetivos y Metas' },
  { n: 6, label: 'Cronograma y Cierre' },
];

// ─── Default PIPS object ─────────────────────────────────────────────────────
function defaultPips(): Partial<PipsProject> {
  return {
    zona_clave: '21FMS0020X',
    zona_nombre: 'Zona Escolar 004',
    supervisor_name: 'Ing. Alejandro Escamilla Martínez',
    municipio_sede: 'Lázaro Cárdenas, Venustiano Carranza, Puebla',
    municipios_atiende: 'Venustiano Carranza, Francisco Z. Mena, Pantepec y Jalpan',
    num_planteles: 17,
    subsistema: 'BGE',
    modalidad: 'Escolarizada',
    ciclo_escolar: '2026-2027',
    atps: 'Ing. Samuel Cruz Interial, Imelda Hernández García, Víctor Manuel Sáenz Cuellar, Lilia Castillo Leyva',
    presentacion_supervisor: '',
    pips_anterior_realizado: true,
    reflexion_pips_anterior: '',
    fortalezas_anterior: '',
    areas_oportunidad_anterior: '',
    planteles_json: [],
    diagnostico_contexto: '',
    problematicas_json: [],
    objetivo_general: '',
    objetivos_especificos_json: [],
    cronograma_json: [],
    evaluacion_json: [],
    current_step: 1,
    status: 'draft',
  };
}

// ─── Input / Textarea helpers ─────────────────────────────────────────────────
const inp = (
  label: string,
  value: string | number,
  onChange: (v: string) => void,
  opts: { type?: string; rows?: number; placeholder?: string; required?: boolean } = {}
) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600, color: 'var(--c-text-muted)' }}>
      {label}{opts.required && <span style={{ color: '#ef4444' }}> *</span>}
    </label>
    {opts.rows ? (
      <textarea
        rows={opts.rows}
        placeholder={opts.placeholder}
        value={String(value)}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'var(--c-text)', fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }}
      />
    ) : (
      <input
        type={opts.type ?? 'text'}
        placeholder={opts.placeholder}
        value={String(value)}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'var(--c-text)', fontSize: 13, fontFamily: 'inherit' }}
      />
    )}
  </div>
);

// ─── Main Wizard Component ────────────────────────────────────────────────────
export default function PipsWizard({ locale }: { locale: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingId = searchParams.get('id');

  const [pips, setPips] = useState<Partial<PipsProject>>(defaultPips());
  const [projectId, setProjectId] = useState<string | null>(existingId);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState('');
  const [newPlantele, setNewPlantele] = useState<PipsPlantele>({ no: 1, cct: '', nombre: '', localidad: '', municipio: '', hombres: 0, mujeres: 0, total: 0 });

  // Load existing project
  useEffect(() => {
    if (existingId) {
      fetch(`/api/pips/${existingId}`)
        .then(r => r.json())
        .then(data => {
          if (data.project) {
            setPips(data.project as Partial<PipsProject>);
            setStep(Math.min((data.project.current_step as number) || 1, 6));
          }
        });
    }
  }, [existingId]);

  const set = (key: keyof PipsProject, value: unknown) =>
    setPips(prev => ({ ...prev, [key]: value }));

  // Save/update project
  const save = useCallback(async (nextStep: number, finalStatus = 'draft') => {
    setSaving(true);
    const payload = { ...pips, current_step: nextStep, status: finalStatus };

    try {
      if (projectId) {
        await fetch(`/api/pips/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        const res = await fetch('/api/pips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.project?.id) {
          setProjectId(data.project.id as string);
          router.replace(`/${locale}/pips/nuevo?id=${data.project.id as string}`);
        }
      }
    } finally {
      setSaving(false);
    }
  }, [pips, projectId, locale, router]);

  const next = async () => {
    const ns = Math.min(step + 1, 6);
    await save(ns);
    setStep(ns);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prev = () => {
    setStep(s => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // AI Generation
  const generate = async () => {
    if (!projectId) { setMsg('Guarda el proyecto primero.'); return; }
    setGenerating(true);
    setMsg('');
    try {
      const res = await fetch(`/api/pips/${projectId}/generate`, { method: 'POST' });
      const data = await res.json();
      if (data.content) {
        set('generated_content', data.content);
        await save(6, 'completed');
        setMsg('✅ PIPS generado con éxito. Puedes descargarlo como Word.');
      } else {
        setMsg('Error al generar el contenido. Intenta de nuevo.');
      }
    } catch {
      setMsg('Error de conexión. Intenta de nuevo.');
    } finally {
      setGenerating(false);
    }
  };

  // ─── Render steps ────────────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    background: 'var(--c-surface)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: '28px 32px',
    marginBottom: 24,
  };

  const sectionTitle = (t: string) => (
    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--c-text)', marginBottom: 20, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      {t}
    </h3>
  );

  // ── Step 1 ── Datos generales
  const step1 = (
    <div style={cardStyle}>
      {sectionTitle('Datos generales de la supervisión')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
        {inp('Clave de zona escolar *', pips.zona_clave ?? '', v => set('zona_clave', v), { required: true, placeholder: 'ej. 21FMS0020X' })}
        {inp('Nombre de la zona *', pips.zona_nombre ?? '', v => set('zona_nombre', v), { required: true })}
        {inp('Nombre del supervisor *', pips.supervisor_name ?? '', v => set('supervisor_name', v), { required: true })}
        {inp('Municipio sede', pips.municipio_sede ?? '', v => set('municipio_sede', v), { placeholder: 'ej. Lázaro Cárdenas, Venustiano Carranza' })}
        {inp('Municipios que atiende', pips.municipios_atiende ?? '', v => set('municipios_atiende', v), { placeholder: 'ej. Venustiano Carranza, Francisco Z. Mena...' })}
        {inp('Número de planteles', pips.num_planteles ?? 1, v => set('num_planteles', parseInt(v) || 1), { type: 'number' })}
        {inp('Tipo de subsistema', pips.subsistema ?? '', v => set('subsistema', v), { placeholder: 'ej. BGE, BD, COBACH' })}
        {inp('Modalidad', pips.modalidad ?? '', v => set('modalidad', v), { placeholder: 'ej. Escolarizada' })}
        {inp('Ciclo escolar', pips.ciclo_escolar ?? '', v => set('ciclo_escolar', v), { placeholder: 'ej. 2026-2027' })}
      </div>
      {inp('Personal ATP (nombres separados por coma)', pips.atps ?? '', v => set('atps', v), { rows: 2, placeholder: 'ej. Juan Pérez, María González...' })}
    </div>
  );

  // ── Step 2 ── Presentación del supervisor
  const step2 = (
    <div style={cardStyle}>
      {sectionTitle('Presentación del supervisor escolar')}
      <p style={{ fontSize: 13, color: 'var(--c-text-muted)', marginBottom: 16 }}>
        Escribe una presentación curricular del supervisor: formación académica, experiencia en el subsistema, logros relevantes y visión pedagógica.
      </p>
      {inp('Presentación del supervisor', pips.presentacion_supervisor ?? '', v => set('presentacion_supervisor', v), {
        rows: 8,
        placeholder: 'El Ing. / Lic. / Dr. [nombre] es egresado de... Desde [año] ejerce como supervisor de la Zona [No.]...',
      })}
    </div>
  );

  // ── Step 3 ── Reflexión PIPS anterior
  const step3 = (
    <div style={cardStyle}>
      {sectionTitle('Reflexión del PIPS del ciclo anterior')}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'var(--c-text-muted)' }}>
          ¿Realizó PIPS en el ciclo escolar anterior?
        </label>
        <div style={{ display: 'flex', gap: 12 }}>
          {['Sí', 'No'].map(opt => (
            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: 'var(--c-text)' }}>
              <input
                type="radio"
                checked={opt === 'Sí' ? !!pips.pips_anterior_realizado : !pips.pips_anterior_realizado}
                onChange={() => set('pips_anterior_realizado', opt === 'Sí')}
              />
              {opt}
            </label>
          ))}
        </div>
      </div>
      {pips.pips_anterior_realizado ? (
        <>
          {inp('Reflexión general del PIPS anterior', pips.reflexion_pips_anterior ?? '', v => set('reflexion_pips_anterior', v), {
            rows: 5, placeholder: 'Describe los principales resultados, logros y aprendizajes del PIPS del ciclo anterior...',
          })}
          {inp('Fortalezas identificadas (una por línea)', pips.fortalezas_anterior ?? '', v => set('fortalezas_anterior', v), {
            rows: 4, placeholder: '• Todos los planteles entregaron el PAEC-PEC...\n• Se consolidó el equipo ATP...',
          })}
          {inp('Áreas de oportunidad (una por línea)', pips.areas_oportunidad_anterior ?? '', v => set('areas_oportunidad_anterior', v), {
            rows: 4, placeholder: '• Errores de alineación curricular en el 60% de los planteles...\n• Falta de comités completos...',
          })}
        </>
      ) : (
        <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: 16, fontSize: 13, color: 'var(--c-text-muted)' }}>
          <strong style={{ color: '#818cf8' }}>Protocolo Anexo 1 (DBEPA):</strong> Si no realizó PIPS en el ciclo anterior,
          el diagnóstico deberá basarse en al menos 3 problemáticas pedagógicas identificadas durante el ciclo,
          los instrumentos utilizados para detectarlas y los objetivos/metas que se abordaron.
          Registra esa información en el paso de Diagnóstico (paso 4).
        </div>
      )}
    </div>
  );

  // ── Step 4 ── Diagnóstico y problemáticas
  const step4 = (
    <>
      {/* Planteles */}
      <div style={cardStyle}>
        {sectionTitle('Planteles de la zona escolar')}
        <p style={{ fontSize: 13, color: 'var(--c-text-muted)', marginBottom: 16 }}>
          Agrega los planteles con su matrícula. Puedes ingresar los datos uno a uno.
        </p>
        {(pips.planteles_json ?? []).length > 0 && (
          <div style={{ overflowX: 'auto', marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'rgba(99,102,241,0.15)' }}>
                  {['No.', 'CCT', 'Nombre', 'Localidad', 'Municipio', 'H', 'M', 'Total', ''].map(h => (
                    <th key={h} style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--c-text-muted)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(pips.planteles_json ?? []).map((pl, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {[pl.no, pl.cct, pl.nombre, pl.localidad, pl.municipio, pl.hombres, pl.mujeres, pl.total].map((v, j) => (
                      <td key={j} style={{ padding: '5px 8px', textAlign: 'center', color: 'var(--c-text)', fontSize: 12 }}>{String(v)}</td>
                    ))}
                    <td>
                      <button
                        onClick={() => set('planteles_json', (pips.planteles_json ?? []).filter((_, idx) => idx !== i))}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}
                      >✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <p style={{ fontSize: 12, color: 'var(--c-text-muted)', marginBottom: 12 }}>➕ Agregar plantel</p>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 2fr 1fr 1fr 70px 70px', gap: 8 }}>
            {(['No.', 'CCT', 'Nombre del plantel', 'Localidad', 'Municipio', 'Hombres', 'Mujeres'] as const).map((label, idx) => {
              const keys: (keyof PipsPlantele)[] = ['no', 'cct', 'nombre', 'localidad', 'municipio', 'hombres', 'mujeres'];
              return (
                <div key={label}>
                  <label style={{ fontSize: 11, color: 'var(--c-text-muted)', display: 'block', marginBottom: 3 }}>{label}</label>
                  <input
                    type={idx === 0 || idx >= 5 ? 'number' : 'text'}
                    value={String(newPlantele[keys[idx]])}
                    onChange={e => setNewPlantele(prev => ({
                      ...prev,
                      [keys[idx]]: idx === 0 || idx >= 5 ? parseInt(e.target.value) || 0 : e.target.value,
                      total: idx === 5 ? (parseInt(e.target.value) || 0) + prev.mujeres : idx === 6 ? prev.hombres + (parseInt(e.target.value) || 0) : prev.total,
                    }))}
                    style={{ width: '100%', padding: '7px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'var(--c-text)', fontSize: 12 }}
                  />
                </div>
              );
            })}
          </div>
          <button
            onClick={() => {
              const pl = { ...newPlantele, total: newPlantele.hombres + newPlantele.mujeres };
              set('planteles_json', [...(pips.planteles_json ?? []), pl]);
              setNewPlantele({ no: (pips.planteles_json ?? []).length + 2, cct: '', nombre: '', localidad: '', municipio: '', hombres: 0, mujeres: 0, total: 0 });
            }}
            className="btn btn-secondary btn-sm"
            style={{ marginTop: 10 }}
          >
            Agregar plantel
          </button>
        </div>
      </div>

      {/* Contexto */}
      <div style={cardStyle}>
        {sectionTitle('Contexto socioeducativo y diagnóstico')}
        {inp('Descripción del contexto de la zona', pips.diagnostico_contexto ?? '', v => set('diagnostico_contexto', v), {
          rows: 8,
          placeholder: 'Describe el contexto geográfico, socioeconómico y educativo de la zona. Incluye características de los municipios, condiciones de las comunidades, perfil del estudiantado...',
        })}
      </div>

      {/* Problemáticas */}
      <div style={cardStyle}>
        {sectionTitle('Problemáticas pedagógicas detectadas')}
        {(pips.problematicas_json ?? []).map((prob, i) => (
          <div key={prob.id ?? i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 14, marginBottom: 10, border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--c-text)' }}>Problemática {i + 1}</span>
              <button
                onClick={() => set('problematicas_json', (pips.problematicas_json ?? []).filter((_, idx) => idx !== i))}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13 }}
              >✕ Eliminar</button>
            </div>
            <input
              value={prob.titulo}
              onChange={e => {
                const arr = [...(pips.problematicas_json ?? [])];
                arr[i] = { ...arr[i], titulo: e.target.value };
                set('problematicas_json', arr);
              }}
              placeholder="Título de la problemática"
              style={{ width: '100%', marginBottom: 8, padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'var(--c-text)', fontSize: 13 }}
            />
            <textarea
              rows={3}
              value={prob.descripcion}
              onChange={e => {
                const arr = [...(pips.problematicas_json ?? [])];
                arr[i] = { ...arr[i], descripcion: e.target.value };
                set('problematicas_json', arr);
              }}
              placeholder="Descripción detallada de la problemática..."
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'var(--c-text)', fontSize: 13, resize: 'vertical' }}
            />
            <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>Prioridad:</label>
              {(['alta', 'media', 'baja'] as const).map(p => (
                <label key={p} style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 12, cursor: 'pointer', color: prob.prioridad === p ? (p === 'alta' ? '#ef4444' : p === 'media' ? '#f59e0b' : '#22c55e') : 'var(--c-text-muted)' }}>
                  <input type="radio" checked={prob.prioridad === p} onChange={() => {
                    const arr = [...(pips.problematicas_json ?? [])];
                    arr[i] = { ...arr[i], prioridad: p };
                    set('problematicas_json', arr);
                  }} /> {p.charAt(0).toUpperCase() + p.slice(1)}
                </label>
              ))}
            </div>
          </div>
        ))}
        <button
          onClick={() => {
            const arr = [...(pips.problematicas_json ?? [])];
            arr.push({ id: Date.now().toString(), titulo: '', descripcion: '', prioridad: 'alta' });
            set('problematicas_json', arr);
          }}
          className="btn btn-secondary btn-sm"
        >
          + Agregar problemática
        </button>
      </div>
    </>
  );

  // ── Step 5 ── Objetivos y metas
  const step5 = (
    <>
      <div style={cardStyle}>
        {sectionTitle('Objetivo general del PIPS')}
        {inp('Objetivo general', pips.objetivo_general ?? '', v => set('objetivo_general', v), {
          rows: 4, placeholder: 'Fortalecer la calidad pedagógica de los [N] planteles de la Zona [X] mediante...',
        })}
      </div>
      <div style={cardStyle}>
        {sectionTitle('Objetivos específicos y metas')}
        {(pips.objetivos_especificos_json ?? []).map((obj, i) => (
          <div key={obj.id ?? i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 14, marginBottom: 12, border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#818cf8' }}>Objetivo {i + 1}</span>
              <button onClick={() => set('objetivos_especificos_json', (pips.objetivos_especificos_json ?? []).filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13 }}>✕</button>
            </div>
            <input
              value={obj.descripcion}
              onChange={e => {
                const arr = [...(pips.objetivos_especificos_json ?? [])];
                arr[i] = { ...arr[i], descripcion: e.target.value };
                set('objetivos_especificos_json', arr);
              }}
              placeholder="Descripción del objetivo específico"
              style={{ width: '100%', marginBottom: 10, padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'var(--c-text)', fontSize: 13 }}
            />
            <p style={{ fontSize: 12, color: 'var(--c-text-muted)', marginBottom: 8 }}>Metas del objetivo:</p>
            {(obj.metas ?? []).map((meta, j) => (
              <div key={j} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 6, marginBottom: 6 }}>
                {(['Meta', 'Indicador', 'Responsable', 'Fecha'] as const).map((field, k) => (
                  <input
                    key={field}
                    value={meta[(['meta', 'indicador', 'responsable', 'fecha'] as const)[k]]}
                    onChange={e => {
                      const arrO = [...(pips.objetivos_especificos_json ?? [])];
                      const arrM = [...(arrO[i].metas ?? [])];
                      arrM[j] = { ...arrM[j], [(['meta', 'indicador', 'responsable', 'fecha'] as const)[k]]: e.target.value };
                      arrO[i] = { ...arrO[i], metas: arrM };
                      set('objetivos_especificos_json', arrO);
                    }}
                    placeholder={field}
                    style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'var(--c-text)', fontSize: 11 }}
                  />
                ))}
                <button onClick={() => {
                  const arrO = [...(pips.objetivos_especificos_json ?? [])];
                  arrO[i] = { ...arrO[i], metas: arrO[i].metas.filter((_, idx) => idx !== j) };
                  set('objetivos_especificos_json', arrO);
                }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
              </div>
            ))}
            <button
              onClick={() => {
                const arrO = [...(pips.objetivos_especificos_json ?? [])];
                arrO[i] = { ...arrO[i], metas: [...(arrO[i].metas ?? []), { meta: '', indicador: '', responsable: '', fecha: '' }] };
                set('objetivos_especificos_json', arrO);
              }}
              className="btn btn-sm"
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', fontSize: 11, cursor: 'pointer', borderRadius: 6, padding: '4px 10px' }}
            >+ Meta</button>
          </div>
        ))}
        <button
          onClick={() => {
            const arr = [...(pips.objetivos_especificos_json ?? [])];
            arr.push({ id: Date.now().toString(), numero: arr.length + 1, descripcion: '', metas: [] });
            set('objetivos_especificos_json', arr);
          }}
          className="btn btn-secondary btn-sm"
        >+ Agregar objetivo</button>
      </div>
    </>
  );

  // ── Step 6 ── Cronograma y cierre
  const step6 = (
    <>
      <div style={cardStyle}>
        {sectionTitle('Cronograma de actividades')}
        {(pips.cronograma_json ?? []).length > 0 && (
          <div style={{ overflowX: 'auto', marginBottom: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: 'rgba(99,102,241,0.15)' }}>
                  {['Actividad', 'Objetivo', 'Responsable', 'Mes', 'Recursos', 'Indicador', ''].map(h => (
                    <th key={h} style={{ padding: '6px 8px', color: 'var(--c-text-muted)', fontWeight: 600, textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(pips.cronograma_json ?? []).map((act, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {([act.actividad, act.objetivo, act.responsable, act.mes, act.recursos, act.indicador] as string[]).map((v, j) => (
                      <td key={j} style={{ padding: '5px 8px', color: 'var(--c-text)', verticalAlign: 'top' }}>{v}</td>
                    ))}
                    <td><button onClick={() => set('cronograma_json', (pips.cronograma_json ?? []).filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <AddCronogramaRow onAdd={(act: PipsCronogramaActividad) => set('cronograma_json', [...(pips.cronograma_json ?? []), act])} />
      </div>

      {/* Generar */}
      <div style={{ ...cardStyle, textAlign: 'center', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.05)' }}>
        {sectionTitle('✅ Generar Cartografía de Zona con IA')}
        <p style={{ fontSize: 13, color: 'var(--c-text-muted)', marginBottom: 20 }}>
          La IA consolidará toda la información territorial ingresada y completará la Cartografía de Zona Escolar con redacción profesional, diagnósticos cuantitativos, objetivos estratégicos y cronograma oficial.
        </p>
        {msg && (
          <div style={{ padding: '10px 16px', borderRadius: 8, background: msg.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: msg.startsWith('✅') ? '#22c55e' : '#ef4444', marginBottom: 16, fontSize: 13 }}>
            {msg}
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={generate}
            disabled={generating || saving}
            className="btn btn-primary"
            style={{ fontSize: 14, padding: '12px 28px' }}
          >
            {generating ? '⏳ Generando Cartografía...' : '🤖 Generar Cartografía con IA'}
          </button>
          {projectId && pips.status === 'completed' && (
            <a
              href={`/api/docx/pips/${projectId}`}
              className="btn"
              style={{ background: '#f59e0b', color: '#fff', border: 'none', fontSize: 14, padding: '12px 28px', textDecoration: 'none', borderRadius: 8, display: 'inline-block' }}
            >
              ↓ Descargar Word Oficial
            </a>
          )}
        </div>
      </div>
    </>
  );

  const stepContent = [step1, step2, step3, step4, step5, step6];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Progress */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 32, overflowX: 'auto' }}>
        {STEPS.map(s => (
          <div
            key={s.n}
            onClick={() => s.n < step && setStep(s.n)}
            style={{
              flex: 1, minWidth: 80, padding: '10px 8px', borderRadius: 10, textAlign: 'center', cursor: s.n < step ? 'pointer' : 'default',
              background: step === s.n ? 'rgba(99,102,241,0.2)' : s.n < step ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${step === s.n ? 'rgba(99,102,241,0.5)' : s.n < step ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)'}`,
              transition: 'all 0.2s',
            }}
          >
            <div style={{ fontSize: 16, marginBottom: 2 }}>
              {s.n < step ? '✅' : step === s.n ? '▶' : '○'}
            </div>
            <div style={{ fontSize: 10, color: step === s.n ? '#818cf8' : s.n < step ? '#22c55e' : 'var(--c-text-muted)', fontWeight: step === s.n ? 700 : 400 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Step content */}
      {stepContent[step - 1]}

      {/* Nav buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <button onClick={prev} disabled={step === 1 || saving} className="btn btn-secondary">
          ← Anterior
        </button>
        <span style={{ fontSize: 12, color: 'var(--c-text-muted)', alignSelf: 'center' }}>
          Paso {step} de {STEPS.length}
        </span>
        {step < STEPS.length ? (
          <button onClick={next} disabled={saving} className="btn btn-primary">
            {saving ? 'Guardando…' : 'Siguiente →'}
          </button>
        ) : (
          <button onClick={() => save(6, 'draft')} disabled={saving} className="btn btn-secondary">
            {saving ? 'Guardando…' : '💾 Guardar borrador'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Cronograma row helper ───────────────────────────────────────────────────
function AddCronogramaRow({ onAdd }: { onAdd: (a: PipsCronogramaActividad) => void }) {
  const [row, setRow] = useState<PipsCronogramaActividad>({ actividad: '', objetivo: 'Obj. 1', responsable: 'Supervisor + ATP', mes: 'Ago 2026', recursos: '', indicador: '' });
  const setR = (k: keyof PipsCronogramaActividad, v: string) => setRow(prev => ({ ...prev, [k]: v }));
  const fields: [keyof PipsCronogramaActividad, string][] = [
    ['actividad', 'Actividad'], ['objetivo', 'Objetivo'], ['responsable', 'Responsable'], ['mes', 'Mes'], ['recursos', 'Recursos'], ['indicador', 'Indicador'],
  ];
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 14, border: '1px dashed rgba(255,255,255,0.1)' }}>
      <p style={{ fontSize: 12, color: 'var(--c-text-muted)', marginBottom: 10 }}>➕ Agregar actividad al cronograma</p>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
        {fields.map(([key, label]) => (
          <div key={key}>
            <label style={{ fontSize: 11, color: 'var(--c-text-muted)', display: 'block', marginBottom: 3 }}>{label}</label>
            <input value={row[key] as string} onChange={e => setR(key, e.target.value)} placeholder={label} style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'var(--c-text)', fontSize: 11 }} />
          </div>
        ))}
      </div>
      <button onClick={() => { onAdd({ ...row }); setRow({ actividad: '', objetivo: 'Obj. 1', responsable: 'Supervisor + ATP', mes: 'Ago 2026', recursos: '', indicador: '' }); }} className="btn btn-secondary btn-sm">Agregar actividad</button>
    </div>
  );
}
