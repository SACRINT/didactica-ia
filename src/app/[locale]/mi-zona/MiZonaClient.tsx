'use client';

import { useState, useEffect, useCallback } from 'react';

interface EscuelaItem {
  id: string;
  nombre: string;
  cct: string;
  municipio?: string;
  subsistema: string;
  director_nombre?: string;
  director_email?: string;
  activa: boolean;
}

const SUBSISTEMAS = ['BGE', 'CBTA', 'CBTIS', 'CECyTE', 'COBACH', 'COBAO', 'COLEGIO', 'OTRO'];

interface MiZonaClientProps {
  supervisorName: string;
  zoneName: string;
  isAdmin: boolean;
}

interface FormState {
  nombre: string;
  cct: string;
  municipio: string;
  subsistema: string;
  directorNombre: string;
  directorEmail: string;
  activa: boolean;
}

const EMPTY_FORM: FormState = {
  nombre: '',
  cct: '',
  municipio: '',
  subsistema: 'BGE',
  directorNombre: '',
  directorEmail: '',
  activa: true,
};

export default function MiZonaClient({ supervisorName, zoneName, isAdmin }: MiZonaClientProps) {
  const [escuelas, setEscuelas] = useState<EscuelaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchEscuelas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/supervisor-escuelas');
      const data = await res.json();
      if (data.escuelas) setEscuelas(data.escuelas);
    } catch {
      setError('No se pudo cargar las escuelas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEscuelas(); }, [fetchEscuelas]);

  const openNew = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  const openEdit = (e: EscuelaItem) => {
    setEditId(e.id);
    setForm({
      nombre: e.nombre,
      cct: e.cct,
      municipio: e.municipio || '',
      subsistema: e.subsistema,
      directorNombre: e.director_nombre || '',
      directorEmail: e.director_email || '',
      activa: e.activa,
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.cct.trim()) {
      setError('Nombre y CCT son requeridos.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = editId ? { id: editId, ...form } : form;
      const res = await fetch('/api/supervisor-escuelas', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al guardar.'); return; }
      setSuccess(editId ? 'Plantel actualizado.' : 'Plantel agregado a tu zona.');
      setShowModal(false);
      fetchEscuelas();
      setTimeout(() => setSuccess(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/supervisor-escuelas?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEscuelas(prev => prev.filter(e => e.id !== id));
        setDeleteConfirm(null);
        setSuccess('Plantel eliminado de tu zona.');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch {
      setError('Error al eliminar.');
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    background: '#0f172a', border: '1px solid #334155',
    borderRadius: '8px', color: '#f8fafc', fontSize: '0.9rem',
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

      {/* STATS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px', marginBottom: '24px',
      }}>
        {[
          { label: 'Planteles en zona', value: escuelas.length, color: '#3b82f6', icon: '🏫' },
          { label: 'Activos', value: escuelas.filter(e => e.activa).length, color: '#10b981', icon: '✅' },
          { label: 'Con director', value: escuelas.filter(e => e.director_nombre).length, color: '#f59e0b', icon: '👔' },
          { label: 'Zona', value: zoneName, color: '#8b5cf6', icon: '📍' },
        ].map((stat, i) => (
          <div key={i} style={{
            background: 'var(--card-bg, #1e293b)',
            border: `1px solid ${stat.color}40`,
            borderRadius: '12px', padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: '4px',
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

      {/* TOOLBAR */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <button
          onClick={openNew}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            color: '#fff', border: 'none', borderRadius: '10px',
            fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
          }}
        >
          ＋ Agregar plantel
        </button>
      </div>

      {/* FEEDBACK */}
      {success && (
        <div style={{
          background: '#065f4620', border: '1px solid #10b981',
          color: '#6ee7b7', borderRadius: '8px', padding: '10px 16px',
          marginBottom: '16px', fontWeight: 600,
        }}>{success}</div>
      )}

      {/* GRID DE PLANTELES */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '60px' }}>Cargando planteles...</div>
      ) : escuelas.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          background: '#1e293b', borderRadius: '16px',
          border: '1px dashed #334155',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🏫</div>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '1rem' }}>
            Aún no has registrado planteles en tu zona. Haz clic en "+ Agregar plantel" para comenzar.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px',
        }}>
          {escuelas.map(e => (
            <div key={e.id} style={{
              background: '#1e293b',
              border: `1px solid ${e.activa ? '#334155' : '#1e293b'}`,
              borderRadius: '14px', padding: '18px',
              opacity: e.activa ? 1 : 0.6,
              transition: 'border-color 0.2s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div>
                  <h3 style={{ color: '#f8fafc', margin: '0 0 4px', fontSize: '1rem', fontWeight: 700 }}>
                    {e.nombre}
                  </h3>
                  <code style={{
                    color: '#818cf8', fontSize: '0.75rem',
                    background: '#0f172a', padding: '2px 8px', borderRadius: '4px',
                  }}>{e.cct}</code>
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700,
                  background: e.activa ? '#10b98120' : '#6b728020',
                  color: e.activa ? '#34d399' : '#9ca3af',
                  border: `1px solid ${e.activa ? '#10b98140' : '#6b728040'}`,
                  flexShrink: 0,
                }}>{e.activa ? 'Activo' : 'Inactivo'}</span>
              </div>

              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {e.municipio && (
                  <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>📍 {e.municipio}</span>
                )}
                <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
                  🏛️ {e.subsistema}
                </span>
                {e.director_nombre && (
                  <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
                    👔 {e.director_nombre}
                    {e.director_email && <span style={{ color: '#60a5fa' }}> · {e.director_email}</span>}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                <button
                  onClick={() => openEdit(e)}
                  style={{
                    flex: 1, padding: '7px', borderRadius: '8px',
                    background: '#3b82f620', color: '#60a5fa',
                    border: '1px solid #3b82f640', cursor: 'pointer',
                    fontSize: '0.8rem', fontWeight: 600,
                  }}
                >✏️ Editar</button>
                <button
                  onClick={() => setDeleteConfirm(e.id)}
                  style={{
                    padding: '7px 12px', borderRadius: '8px',
                    background: '#ef444420', color: '#f87171',
                    border: '1px solid #ef444440', cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                >🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL AGREGAR/EDITAR */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: '#00000080', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '20px',
        }}>
          <div style={{
            background: '#1e293b', borderRadius: '16px',
            border: '1px solid #334155', padding: '28px',
            width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto',
          }}>
            <h2 style={{ color: '#f8fafc', margin: '0 0 20px', fontSize: '1.2rem', fontWeight: 700 }}>
              {editId ? '✏️ Editar Plantel' : '➕ Agregar Plantel a mi Zona'}
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
                { label: 'Nombre del plantel *', key: 'nombre' as keyof FormState, placeholder: 'Ej. COBACH Plantel 15' },
                { label: 'CCT *', key: 'cct' as keyof FormState, placeholder: 'Ej. 21EBH0015X' },
                { label: 'Municipio', key: 'municipio' as keyof FormState, placeholder: 'Ej. Puebla' },
                { label: 'Nombre del Director', key: 'directorNombre' as keyof FormState, placeholder: 'Ej. Juan Pérez García' },
                { label: 'Email del Director', key: 'directorEmail' as keyof FormState, placeholder: 'director@plantel.edu.mx' },
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
                    style={inputStyle}
                  />
                </div>
              ))}

              <div>
                <label style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '5px' }}>
                  Subsistema
                </label>
                <select
                  value={form.subsistema}
                  onChange={e => setForm(prev => ({ ...prev, subsistema: e.target.value }))}
                  style={{ ...inputStyle, boxSizing: 'border-box' }}
                >
                  {SUBSISTEMAS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {editId && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    id="activa-check"
                    type="checkbox"
                    checked={form.activa}
                    onChange={e => setForm(prev => ({ ...prev, activa: e.target.checked }))}
                    style={{ width: '18px', height: '18px', accentColor: '#8b5cf6', cursor: 'pointer' }}
                  />
                  <label htmlFor="activa-check" style={{ color: '#e2e8f0', fontSize: '0.9rem', cursor: 'pointer' }}>
                    Plantel activo en mi zona
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
                    background: saving ? '#334155' : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                    color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                  }}
                >
                  {saving ? 'Guardando...' : editId ? 'Actualizar' : 'Agregar plantel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINAR */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1100,
          background: '#00000090', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '20px',
        }}>
          <div style={{
            background: '#1e293b', borderRadius: '16px',
            border: '1px solid #ef4444', padding: '28px',
            maxWidth: '400px', width: '100%', textAlign: 'center',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⚠️</div>
            <h3 style={{ color: '#f8fafc', margin: '0 0 10px' }}>¿Quitar plantel de tu zona?</h3>
            <p style={{ color: '#94a3b8', margin: '0 0 20px', fontSize: '0.9rem' }}>
              Esta acción no se puede deshacer. El plantel será removido de tu zona de supervisión.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  padding: '10px 22px', borderRadius: '8px',
                  background: 'transparent', border: '1px solid #334155',
                  color: '#94a3b8', cursor: 'pointer', fontWeight: 600,
                }}
              >Cancelar</button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                style={{
                  padding: '10px 22px', borderRadius: '8px',
                  background: '#ef4444', color: '#fff',
                  border: 'none', cursor: 'pointer', fontWeight: 700,
                }}
              >Sí, quitar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
