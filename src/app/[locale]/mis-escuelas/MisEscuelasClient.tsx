'use client';

import { useState, useEffect } from 'react';

interface School {
  id: string; school_name: string; school_cct: string | null;
  municipality: string | null; subsystem: string; is_primary: boolean; created_at: string;
}

const SUBSYSTEMS = ['BGE', 'Bachillerato Tecnológico', 'Bachillerato Digital', 'EMSAD', 'COBACH', 'CECYTEP', 'Otro'];

export default function MisEscuelasClient() {
  const [schools, setSchools]     = useState<School[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState<School | null>(null);
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState<{ text: string; ok: boolean } | null>(null);

  const emptyForm = { schoolName: '', schoolCct: '', municipality: '', subsystem: 'BGE', isPrimary: false };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { loadSchools(); }, []);

  async function loadSchools() {
    setLoading(true);
    const r = await fetch('/api/teacher-schools');
    const d = await r.json();
    setSchools(d.schools || []);
    setLoading(false);
  }

  function showMsg(text: string, ok = true) { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3500); }

  function startEdit(s: School) {
    setEditing(s);
    setForm({ schoolName: s.school_name, schoolCct: s.school_cct || '', municipality: s.municipality || '', subsystem: s.subsystem, isPrimary: s.is_primary });
    setShowForm(true);
  }

  async function saveSchool() {
    if (!form.schoolName.trim()) return showMsg('El nombre de la escuela es requerido', false);
    setSaving(true);
    const body = { schoolName: form.schoolName.trim(), schoolCct: form.schoolCct.trim() || null, municipality: form.municipality.trim() || null, subsystem: form.subsystem, isPrimary: form.isPrimary };

    const r = editing
      ? await fetch('/api/teacher-schools', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...body }) })
      : await fetch('/api/teacher-schools', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

    setSaving(false);
    if (r.ok) { setShowForm(false); setEditing(null); setForm(emptyForm); loadSchools(); showMsg(editing ? 'Escuela actualizada ✓' : 'Escuela agregada ✓'); }
    else { const d = await r.json(); showMsg(d.error || 'Error', false); }
  }

  async function deleteSchool(id: string, name: string) {
    if (!confirm(`¿Eliminar "${name}"? Los documentos asociados se conservarán.`)) return;
    const r = await fetch('/api/teacher-schools', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (r.ok) { loadSchools(); showMsg('Escuela eliminada'); }
  }

  return (
    <div className="page-container">
      <style>{`
        .page-container { max-width: 800px; margin: 0 auto; }
        h1 { font-size: 26px; font-weight: 800; color: #f0f4ff; margin-bottom: 6px; }
        .subtitle { font-size: 14px; color: rgba(255,255,255,0.5); margin-bottom: 28px; }
        .school-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 20px 24px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
        .school-card.primary { border-color: rgba(99,102,241,0.4); background: rgba(99,102,241,0.06); }
        .school-name { font-size: 16px; font-weight: 700; color: #f0f4ff; margin-bottom: 6px; display: flex; align-items: center; gap: 10px; }
        .school-meta { font-size: 13px; color: rgba(255,255,255,0.5); }
        .badge { display: inline-flex; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
        .badge-primary { background: rgba(99,102,241,0.2); color: #818cf8; }
        .badge-sub { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); }
        .card-actions { display: flex; gap: 8px; flex-shrink: 0; }
        .btn { padding: 7px 14px; border-radius: 8px; border: none; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s; }
        .btn-primary { background: #6366f1; color: #fff; }
        .btn-primary:hover { background: #4f52d3; }
        .btn-ghost { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.7); }
        .btn-ghost:hover { background: rgba(255,255,255,0.1); }
        .btn-danger { background: rgba(239,68,68,0.12); color: #f87171; }
        .btn-danger:hover { background: rgba(239,68,68,0.25); }
        .form-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(99,102,241,0.3); border-radius: 14px; padding: 24px; margin-bottom: 24px; }
        .form-card h3 { font-size: 16px; font-weight: 700; color: #818cf8; margin-bottom: 20px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group.full { grid-column: 1 / -1; }
        .form-group label { font-size: 11px; color: rgba(255,255,255,0.4); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .form-group input, .form-group select { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 8px 12px; color: #f0f4ff; font-size: 14px; outline: none; }
        .form-group input:focus, .form-group select:focus { border-color: #6366f1; }
        .checkbox-row { display: flex; align-items: center; gap: 10px; margin-top: 4px; }
        .checkbox-row input { width: 16px; height: 16px; accent-color: #6366f1; }
        .checkbox-row label { font-size: 13px; color: rgba(255,255,255,0.7); cursor: pointer; }
        .form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
        .empty-state { text-align: center; padding: 64px 24px; }
        .empty-state .icon { font-size: 48px; margin-bottom: 16px; }
        .empty-state h3 { font-size: 18px; font-weight: 700; color: #f0f4ff; margin-bottom: 8px; }
        .empty-state p { font-size: 14px; color: rgba(255,255,255,0.4); }
        .toast { position: fixed; bottom: 24px; right: 24px; padding: 12px 20px; border-radius: 10px; font-size: 13px; font-weight: 600; z-index: 9999; }
        .toast-ok  { background: rgba(34,197,94,0.9); color: #fff; }
        .toast-err { background: rgba(239,68,68,0.9); color: #fff; }
      `}</style>

      <h1>🏫 Mis Escuelas</h1>
      <p className="subtitle">Registra las escuelas donde trabajas. Cada una puede tener su propio contexto de PAEC y PMC.</p>

      {/* Add button */}
      {!showForm && (
        <button className="btn btn-primary" style={{ marginBottom: 24 }} onClick={() => { setShowForm(true); setEditing(null); setForm(emptyForm); }}>
          + Agregar escuela
        </button>
      )}

      {/* Form */}
      {showForm && (
        <div className="form-card">
          <h3>{editing ? '✏️ Editar escuela' : '➕ Nueva escuela'}</h3>
          <div className="form-grid">
            <div className="form-group full">
              <label>Nombre de la escuela *</label>
              <input placeholder="Ej: CBTIS 86 Venustiano Carranza" value={form.schoolName} onChange={e => setForm(f => ({ ...f, schoolName: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>CCT (Clave de Centro de Trabajo)</label>
              <input placeholder="Ej: 21EBH0123A" value={form.schoolCct} onChange={e => setForm(f => ({ ...f, schoolCct: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Municipio</label>
              <input placeholder="Ej: Venustiano Carranza" value={form.municipality} onChange={e => setForm(f => ({ ...f, municipality: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Subsistema</label>
              <select value={form.subsystem} onChange={e => setForm(f => ({ ...f, subsystem: e.target.value }))}>
                {SUBSYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ justifyContent: 'flex-end' }}>
              <div className="checkbox-row">
                <input type="checkbox" id="primary" checked={form.isPrimary} onChange={e => setForm(f => ({ ...f, isPrimary: e.target.checked }))} />
                <label htmlFor="primary">Escuela principal (se selecciona por defecto)</label>
              </div>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => { setShowForm(false); setEditing(null); }}>Cancelar</button>
            <button className="btn btn-primary" onClick={saveSchool} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </div>
      )}

      {/* School list */}
      {loading ? (
        <div className="empty-state"><div className="icon">⏳</div><h3>Cargando...</h3></div>
      ) : schools.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🏫</div>
          <h3>No tienes escuelas registradas</h3>
          <p>Agrega las escuelas donde trabajas para organizar mejor tus documentos y planeaciones.</p>
        </div>
      ) : (
        schools.map(s => (
          <div key={s.id} className={`school-card ${s.is_primary ? 'primary' : ''}`}>
            <div>
              <div className="school-name">
                {s.school_name}
                {s.is_primary && <span className="badge badge-primary">⭐ Principal</span>}
                <span className="badge badge-sub">{s.subsystem}</span>
              </div>
              <div className="school-meta">
                {s.school_cct && <span>CCT: {s.school_cct} · </span>}
                {s.municipality && <span>📍 {s.municipality}</span>}
              </div>
            </div>
            <div className="card-actions">
              <button className="btn btn-ghost" onClick={() => startEdit(s)}>✏️ Editar</button>
              <button className="btn btn-danger" onClick={() => deleteSchool(s.id, s.school_name)}>🗑️</button>
            </div>
          </div>
        ))
      )}

      {msg && <div className={`toast ${msg.ok ? 'toast-ok' : 'toast-err'}`}>{msg.text}</div>}
    </div>
  );
}
