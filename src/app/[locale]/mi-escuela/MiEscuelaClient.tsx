'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { parsearExcelPersonal, descargarPlantillaExcelDocentes, DocenteImportado } from '@/lib/excel-plantilla';

interface PersonalItem {
  id: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
  email?: string;
  cargo: string;
  horas_base: number;
  activo: boolean;
}

const CARGOS = ['DOCENTE', 'DIRECTIVO', 'PREFECTO', 'ORIENTADOR', 'ADMINISTRATIVO', 'OTRO'];

const CARGO_LABELS: Record<string, string> = {
  DOCENTE: 'Docente',
  DIRECTIVO: 'Directivo',
  PREFECTO: 'Prefecto',
  ORIENTADOR: 'Orientador',
  ADMINISTRATIVO: 'Administrativo',
  OTRO: 'Otro',
};

const CARGO_COLORS: Record<string, string> = {
  DOCENTE: '#3b82f6',
  DIRECTIVO: '#8b5cf6',
  PREFECTO: '#f59e0b',
  ORIENTADOR: '#10b981',
  ADMINISTRATIVO: '#6b7280',
  OTRO: '#ec4899',
};

interface MiEscuelaClientProps {
  teacherName: string;
  schoolName: string;
  cct: string;
  isAdmin: boolean;
}

interface FormState {
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  email: string;
  cargo: string;
  horasBase: number;
  activo: boolean;
}

const EMPTY_FORM: FormState = {
  nombre: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  email: '',
  cargo: 'DOCENTE',
  horasBase: 20,
  activo: true,
};

export default function MiEscuelaClient({ teacherName, schoolName, cct, isAdmin }: MiEscuelaClientProps) {
  const [personal, setPersonal] = useState<PersonalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [filterCargo, setFilterCargo] = useState<string>('TODOS');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Estados para Importación Masiva Excel / CSV
  const [showImportModal, setShowImportModal] = useState(false);
  const [archivoExcel, setArchivoExcel] = useState<File | null>(null);
  const [docentesParseados, setDocentesParseados] = useState<DocenteImportado[]>([]);
  const [cargandoArchivo, setCargandoArchivo] = useState(false);
  const [guardandoBulk, setGuardandoBulk] = useState(false);
  const [resumenImportacion, setResumenImportacion] = useState<{ total: number; insertados: number; actualizados: number; errores: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPersonal = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/escuela-personal');
      const data = await res.json();
      if (data.personal) setPersonal(data.personal);
    } catch {
      setError('No se pudo cargar el personal.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPersonal(); }, [fetchPersonal]);

  const openNew = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  const openEdit = (p: PersonalItem) => {
    setEditId(p.id);
    setForm({
      nombre: p.nombre,
      apellidoPaterno: p.apellido_paterno,
      apellidoMaterno: p.apellido_materno || '',
      email: p.email || '',
      cargo: p.cargo,
      horasBase: p.horas_base,
      activo: p.activo,
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.apellidoPaterno.trim()) {
      setError('Nombre y apellido paterno son requeridos.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = editId
        ? { id: editId, ...form }
        : form;
      const res = await fetch('/api/escuela-personal', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al guardar.'); return; }
      setSuccess(editId ? 'Personal actualizado.' : 'Personal agregado.');
      setShowModal(false);
      fetchPersonal();
      setTimeout(() => setSuccess(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleCargarArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setArchivoExcel(file);
    setCargandoArchivo(true);
    setError('');
    try {
      const parsed = await parsearExcelPersonal(file);
      setDocentesParseados(parsed);
      if (parsed.length === 0) {
        setError('No se encontraron registros de docentes en el archivo.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Error al procesar el archivo Excel/CSV. Verifique el formato.');
    } finally {
      setCargandoArchivo(false);
    }
  };

  const handleConfirmarImportacion = async () => {
    const validos = docentesParseados.filter(d => d.valido);
    if (validos.length === 0) {
      setError('No hay registros válidos para importar.');
      return;
    }
    setGuardandoBulk(true);
    setError('');
    try {
      const res = await fetch('/api/escuela-personal/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personal: validos }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al guardar la plantilla.');
        return;
      }
      setResumenImportacion({
        total: data.totalProcesados,
        insertados: data.insertados,
        actualizados: data.actualizados,
        errores: data.errores || [],
      });
      fetchPersonal();
      setSuccess(`¡Carga exitosa! ${data.insertados} nuevo(s), ${data.actualizados} actualizado(s).`);
      setTimeout(() => setSuccess(''), 4000);
    } catch {
      setError('Error de conexión al importar personal.');
    } finally {
      setGuardandoBulk(false);
    }
  };

  const cerrarModalImportacion = () => {
    setShowImportModal(false);
    setArchivoExcel(null);
    setDocentesParseados([]);
    setResumenImportacion(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/escuela-personal?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPersonal(prev => prev.filter(p => p.id !== id));
        setDeleteConfirm(null);
        setSuccess('Personal eliminado.');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch {
      setError('Error al eliminar.');
    }
  };

  const filtered = filterCargo === 'TODOS'
    ? personal
    : personal.filter(p => p.cargo === filterCargo);

  const counts = CARGOS.reduce((acc, c) => {
    acc[c] = personal.filter(p => p.cargo === c).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

      {/* ── HEADER STATS ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px',
        marginBottom: '24px',
      }}>
        {[
          { label: 'Total personal', value: personal.length, color: '#3b82f6', icon: '👥' },
          { label: 'Activos', value: personal.filter(p => p.activo).length, color: '#10b981', icon: '✅' },
          { label: 'Docentes', value: counts['DOCENTE'] || 0, color: '#6366f1', icon: '👨‍🏫' },
          { label: 'Plantel', value: schoolName, color: '#f59e0b', icon: '🏫' },
        ].map((stat, i) => (
          <div key={i} style={{
            background: 'var(--card-bg, #1e293b)',
            border: `1px solid ${stat.color}40`,
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}>
            <span style={{ fontSize: '20px' }}>{stat.icon}</span>
            <span style={{ color: stat.color, fontWeight: 700, fontSize: '1.4rem', lineHeight: 1 }}>
              {stat.value}
            </span>
            <span style={{ color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── TOOLBAR ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '12px',
        alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['TODOS', ...CARGOS].map(c => (
            <button
              key={c}
              onClick={() => setFilterCargo(c)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: filterCargo === c
                  ? `2px solid ${CARGO_COLORS[c] || '#3b82f6'}`
                  : '1px solid #334155',
                background: filterCargo === c ? `${CARGO_COLORS[c] || '#3b82f6'}20` : 'transparent',
                color: filterCargo === c ? (CARGO_COLORS[c] || '#3b82f6') : '#94a3b8',
                fontWeight: filterCargo === c ? 700 : 400,
                cursor: 'pointer',
                fontSize: '0.78rem',
                transition: 'all 0.2s',
              }}
            >
              {c === 'TODOS' ? `Todos (${personal.length})` : `${CARGO_LABELS[c]} (${counts[c] || 0})`}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => descargarPlantillaExcelDocentes()}
            title="Descargar plantilla de Excel (.xlsx) con el formato y columnas recomendadas"
            style={{
              padding: '9px 14px',
              background: '#1e293b',
              color: '#38bdf8',
              border: '1px solid #0284c7',
              borderRadius: '10px',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.82rem',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            📄 Plantilla Excel
          </button>

          <button
            type="button"
            onClick={() => {
              setError('');
              setShowImportModal(true);
            }}
            title="Subir archivo Excel o CSV con la plantilla docente completa"
            style={{
              padding: '9px 16px',
              background: '#047857',
              color: '#ffffff',
              border: '1px solid #10b981',
              borderRadius: '10px',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
            }}
          >
            📥 Importar Excel / CSV
          </button>

          <button
            type="button"
            onClick={openNew}
            style={{
              padding: '9px 18px',
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 2px 8px rgba(59,130,246,0.3)',
            }}
          >
            ＋ Agregar personal
          </button>
        </div>
      </div>

      {/* ── FEEDBACK ── */}
      {success && (
        <div style={{
          background: '#065f4620', border: '1px solid #10b981',
          color: '#6ee7b7', borderRadius: '8px', padding: '10px 16px',
          marginBottom: '16px', fontWeight: 600,
        }}>{success}</div>
      )}
      {error && !showModal && (
        <div style={{
          background: '#7f1d1d20', border: '1px solid #ef4444',
          color: '#fca5a5', borderRadius: '8px', padding: '10px 16px',
          marginBottom: '16px',
        }}>{error}</div>
      )}

      {/* ── TABLA ── */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '60px' }}>Cargando personal...</div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          background: '#1e293b', borderRadius: '16px',
          border: '1px dashed #334155',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>👥</div>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '1rem' }}>
            {filterCargo === 'TODOS'
              ? 'Aún no has registrado personal. Haz clic en "+ Agregar personal" para comenzar.'
              : `No hay personal con cargo "${CARGO_LABELS[filterCargo]}" registrado.`}
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0f172a' }}>
                {['Nombre completo', 'Cargo', 'Email', 'Hrs/base', 'Estatus', 'Acciones'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left',
                    color: '#64748b', fontWeight: 700,
                    fontSize: '0.75rem', textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '1px solid #1e293b',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id} style={{
                  background: i % 2 === 0 ? '#1e293b' : '#1a2741',
                  transition: 'background 0.15s',
                }}>
                  <td style={{ padding: '12px 16px', color: '#e2e8f0', fontWeight: 600 }}>
                    {p.apellido_paterno} {p.apellido_materno} {p.nombre}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: '20px',
                      background: `${CARGO_COLORS[p.cargo] || '#6b7280'}20`,
                      color: CARGO_COLORS[p.cargo] || '#94a3b8',
                      fontSize: '0.75rem', fontWeight: 700,
                      border: `1px solid ${CARGO_COLORS[p.cargo] || '#6b7280'}60`,
                    }}>
                      {CARGO_LABELS[p.cargo] || p.cargo}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '0.85rem' }}>
                    {p.email || '—'}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8', textAlign: 'center' }}>
                    {p.horas_base}h
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: '20px',
                      background: p.activo ? '#10b98120' : '#6b728020',
                      color: p.activo ? '#34d399' : '#9ca3af',
                      fontSize: '0.75rem', fontWeight: 700,
                    }}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => openEdit(p)}
                        style={{
                          padding: '5px 12px', borderRadius: '6px',
                          background: '#3b82f620', color: '#60a5fa',
                          border: '1px solid #3b82f640', cursor: 'pointer',
                          fontSize: '0.8rem', fontWeight: 600,
                        }}
                      >✏️ Editar</button>
                      <button
                        onClick={() => setDeleteConfirm(p.id)}
                        style={{
                          padding: '5px 12px', borderRadius: '6px',
                          background: '#ef444420', color: '#f87171',
                          border: '1px solid #ef444440', cursor: 'pointer',
                          fontSize: '0.8rem', fontWeight: 600,
                        }}
                      >🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL AGREGAR/EDITAR ── */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: '#00000080', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '20px',
        }}>
          <div style={{
            background: '#1e293b', borderRadius: '16px',
            border: '1px solid #334155', padding: '28px',
            width: '100%', maxWidth: '540px',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <h2 style={{ color: '#f8fafc', margin: '0 0 20px', fontSize: '1.2rem', fontWeight: 700 }}>
              {editId ? '✏️ Editar Personal' : '➕ Agregar Personal'}
            </h2>

            {error && (
              <div style={{
                background: '#7f1d1d20', border: '1px solid #ef4444',
                color: '#fca5a5', borderRadius: '8px', padding: '10px 14px',
                marginBottom: '16px', fontSize: '0.85rem',
              }}>{error}</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { label: 'Nombre(s) *', key: 'nombre' as keyof FormState, placeholder: 'Ej. María José' },
                { label: 'Apellido Paterno *', key: 'apellidoPaterno' as keyof FormState, placeholder: 'Ej. García' },
                { label: 'Apellido Materno', key: 'apellidoMaterno' as keyof FormState, placeholder: 'Ej. López' },
                { label: 'Email institucional', key: 'email' as keyof FormState, placeholder: 'docente@escuela.edu.mx' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '5px' }}>
                    {label}
                  </label>
                  <input
                    type="text"
                    value={form[key] as string}
                    onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={{
                      width: '100%', padding: '10px 14px',
                      background: '#0f172a', border: '1px solid #334155',
                      borderRadius: '8px', color: '#f8fafc', fontSize: '0.9rem',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '5px' }}>
                    Cargo *
                  </label>
                  <select
                    value={form.cargo}
                    onChange={e => setForm(prev => ({ ...prev, cargo: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 14px',
                      background: '#0f172a', border: '1px solid #334155',
                      borderRadius: '8px', color: '#f8fafc', fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  >
                    {CARGOS.map(c => (
                      <option key={c} value={c}>{CARGO_LABELS[c]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '5px' }}>
                    Horas base
                  </label>
                  <input
                    type="number"
                    min={1} max={50}
                    value={form.horasBase}
                    onChange={e => setForm(prev => ({ ...prev, horasBase: Number(e.target.value) }))}
                    style={{
                      width: '100%', padding: '10px 14px',
                      background: '#0f172a', border: '1px solid #334155',
                      borderRadius: '8px', color: '#f8fafc', fontSize: '0.9rem',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {editId && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    id="activo-check"
                    type="checkbox"
                    checked={form.activo}
                    onChange={e => setForm(prev => ({ ...prev, activo: e.target.checked }))}
                    style={{ width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
                  />
                  <label htmlFor="activo-check" style={{ color: '#e2e8f0', fontSize: '0.9rem', cursor: 'pointer' }}>
                    Personal activo
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  onClick={() => { setShowModal(false); setError(''); }}
                  style={{
                    padding: '10px 22px', borderRadius: '8px',
                    background: 'transparent', border: '1px solid #334155',
                    color: '#94a3b8', cursor: 'pointer', fontWeight: 600,
                  }}
                >Cancelar</button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: '10px 22px', borderRadius: '8px',
                    background: saving ? '#334155' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                    color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                  }}
                >
                  {saving ? 'Guardando...' : editId ? 'Actualizar' : 'Agregar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL IMPORTAR EXCEL / CSV ── */}
      {showImportModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1100,
          background: '#00000095', backdropFilter: 'blur(4px)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '20px',
        }}>
          <div style={{
            background: '#1e293b', borderRadius: '16px',
            border: '1px solid #334155', padding: '28px',
            width: '100%', maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.75rem' }}>📥</span>
                <div>
                  <h2 style={{ color: '#f8fafc', margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                    Carga Masiva de Personal Docente
                  </h2>
                  <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.8rem' }}>
                    Sube un archivo Excel (.xlsx, .xls) o CSV con tu plantilla escolar.
                  </p>
                </div>
              </div>
              <button
                onClick={cerrarModalImportacion}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {error && (
              <div style={{
                background: '#7f1d1d20', border: '1px solid #ef4444',
                color: '#fca5a5', borderRadius: '8px', padding: '10px 14px',
                marginBottom: '16px', fontSize: '0.85rem',
              }}>{error}</div>
            )}

            {resumenImportacion ? (
              <div style={{
                background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981',
                borderRadius: '12px', padding: '20px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🎉</div>
                <h3 style={{ color: '#ffffff', margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 800 }}>
                  ¡Plantilla Importada Correctamente!
                </h3>
                <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: '0 0 16px' }}>
                  Se procesaron <strong>{resumenImportacion.total}</strong> registros:
                  <br />
                  <span style={{ color: '#4ade80', fontWeight: 700 }}>+{resumenImportacion.insertados} nuevos docentes</span> y{' '}
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>{resumenImportacion.actualizados} actualizados</span>.
                </p>
                {resumenImportacion.errores.length > 0 && (
                  <div style={{ textAlign: 'left', background: '#0f172a', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.75rem', color: '#f87171' }}>
                    <strong>Observaciones:</strong>
                    <ul style={{ margin: '4px 0 0', paddingLeft: '20px' }}>
                      {resumenImportacion.errores.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <button
                  onClick={cerrarModalImportacion}
                  style={{
                    padding: '10px 24px', borderRadius: '8px',
                    background: '#10b981', color: '#ffffff',
                    border: 'none', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Aceptar y Ver Plantilla
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Zona de Subida y Descarga de plantilla */}
                <div style={{
                  border: '2px dashed #475569', borderRadius: '12px',
                  padding: '24px', textAlign: 'center', background: '#0f172a',
                }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleCargarArchivo}
                    style={{ display: 'none' }}
                    id="excel-file-input"
                  />
                  <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📑</div>
                  <p style={{ color: '#f8fafc', margin: '0 0 6px', fontWeight: 700, fontSize: '0.95rem' }}>
                    {archivoExcel ? archivoExcel.name : 'Selecciona o arrastra tu archivo Excel / CSV'}
                  </p>
                  <p style={{ color: '#94a3b8', margin: '0 0 16px', fontSize: '0.8rem' }}>
                    Columnas detectadas automáticamente: Nombre, Apellidos, Cargo/Rol, Horas Base y Email.
                  </p>

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        padding: '9px 18px', borderRadius: '8px',
                        background: '#2563eb', color: '#ffffff',
                        border: 'none', fontWeight: 700, fontSize: '0.85rem',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                      }}
                    >
                      📁 {archivoExcel ? 'Cambiar Archivo' : 'Seleccionar Archivo'}
                    </button>

                    <button
                      type="button"
                      onClick={() => descargarPlantillaExcelDocentes()}
                      style={{
                        padding: '9px 16px', borderRadius: '8px',
                        background: '#334155', color: '#38bdf8',
                        border: '1px solid #475569', fontWeight: 700, fontSize: '0.85rem',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                      }}
                    >
                      ⬇️ Descargar Formato de Ejemplo
                    </button>
                  </div>
                </div>

                {cargandoArchivo && (
                  <div style={{ textAlign: 'center', color: '#38bdf8', padding: '12px', fontWeight: 600 }}>
                    ⏳ Leyendo y analizando hoja de cálculo...
                  </div>
                )}

                {/* Previsualización de datos leídos */}
                {docentesParseados.length > 0 && (
                  <div>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      marginBottom: '8px',
                    }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                        Vista Previa ({docentesParseados.filter(d => d.valido).length} válidos de {docentesParseados.length} encontrados)
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        Solo se importarán los registros válidos
                      </span>
                    </div>

                    <div style={{
                      maxHeight: '260px', overflowY: 'auto', border: '1px solid #334155',
                      borderRadius: '8px', background: '#0f172a',
                    }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}>
                            <th style={{ padding: '8px 10px', textAlign: 'left', color: '#94a3b8' }}>#</th>
                            <th style={{ padding: '8px 10px', textAlign: 'left', color: '#94a3b8' }}>Nombre Completo</th>
                            <th style={{ padding: '8px 10px', textAlign: 'left', color: '#94a3b8' }}>Cargo</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center', color: '#94a3b8' }}>Horas</th>
                            <th style={{ padding: '8px 10px', textAlign: 'left', color: '#94a3b8' }}>Email</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center', color: '#94a3b8' }}>Estatus</th>
                          </tr>
                        </thead>
                        <tbody>
                          {docentesParseados.map((d, idx) => (
                            <tr key={idx} style={{
                              borderBottom: '1px solid #1e293b',
                              background: !d.valido ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                            }}>
                              <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}</td>
                              <td style={{ padding: '8px 10px', color: '#ffffff', fontWeight: 700 }}>
                                {d.apellidoPaterno} {d.apellidoMaterno} {d.nombre}
                              </td>
                              <td style={{ padding: '8px 10px' }}>
                                <span style={{
                                  fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px',
                                  background: '#1e293b', color: CARGO_COLORS[d.cargo] || '#38bdf8',
                                  fontWeight: 700, border: '1px solid #334155',
                                }}>
                                  {CARGO_LABELS[d.cargo] || d.cargo}
                                </span>
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#4ade80', fontWeight: 700 }}>
                                {d.horasBase}h
                              </td>
                              <td style={{ padding: '8px 10px', color: '#94a3b8' }}>
                                {d.email || '—'}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                {d.valido ? (
                                  <span style={{ color: '#4ade80', fontWeight: 800 }}>✓ Listo</span>
                                ) : (
                                  <span style={{ color: '#f87171', fontWeight: 700 }} title={d.motivoInvalido}>⚠️ Incompleto</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Acciones */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={cerrarModalImportacion}
                    style={{
                      padding: '10px 20px', borderRadius: '8px',
                      background: 'transparent', border: '1px solid #334155',
                      color: '#94a3b8', cursor: 'pointer', fontWeight: 600,
                    }}
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmarImportacion}
                    disabled={guardandoBulk || docentesParseados.filter(d => d.valido).length === 0}
                    style={{
                      padding: '10px 24px', borderRadius: '8px',
                      background: guardandoBulk || docentesParseados.filter(d => d.valido).length === 0
                        ? '#334155'
                        : 'linear-gradient(135deg, #059669, #10b981)',
                      color: '#ffffff', border: 'none',
                      cursor: guardandoBulk || docentesParseados.filter(d => d.valido).length === 0 ? 'not-allowed' : 'pointer',
                      fontWeight: 800, fontSize: '0.9rem',
                      boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                    }}
                  >
                    {guardandoBulk
                      ? 'Importando a BD...'
                      : `Confirmar e Importar (${docentesParseados.filter(d => d.valido).length} Docentes)`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
