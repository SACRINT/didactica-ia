'use client';

import { useState, useEffect } from 'react';

interface UserDoc {
  id: string; doc_type: string; label: string; uac_name: string | null;
  semester: number | null; file_name: string | null; used_count: number;
  last_used_at: string | null; created_at: string; updated_at: string;
  school_name: string | null; municipality: string | null;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  program_pdf:  '📄 Programa PDF',
  paec_context: '🏫 Contexto PAEC',
  pmc_context:  '📈 Contexto PMC',
};

const DOC_TYPE_COLORS: Record<string, string> = {
  program_pdf:  'badge-blue',
  paec_context: 'badge-green',
  pmc_context:  'badge-yellow',
};

function relDate(d: string) {
  return new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MisDocumentosClient() {
  const [docs, setDocs]       = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { loadDocs(); }, []);

  async function loadDocs() {
    setLoading(true);
    const r = await fetch('/api/user-documents');
    const d = await r.json();
    setDocs(d.documents || []);
    setLoading(false);
  }

  async function deleteDoc(id: string, label: string) {
    if (!confirm(`¿Eliminar "${label}"?\nEsto no afecta las planeaciones que ya se generaron con este documento.`)) return;
    setDeleting(id);
    const r = await fetch('/api/user-documents', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setDeleting(null);
    if (r.ok) {
      setDocs(prev => prev.filter(d => d.id !== id));
      setMsg('Documento eliminado correctamente');
      setTimeout(() => setMsg(null), 3000);
    }
  }

  const filtered = docs.filter(d =>
    !filter ||
    d.label.toLowerCase().includes(filter.toLowerCase()) ||
    (d.uac_name || '').toLowerCase().includes(filter.toLowerCase()) ||
    (d.school_name || '').toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="page-container">
      <style>{`
        .page-container { max-width: 900px; margin: 0 auto; }
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
        .page-header h1 { font-size: 26px; font-weight: 800; color: #f0f4ff; }
        .page-header p  { font-size: 14px; color: rgba(255,255,255,0.5); margin-top: 4px; }
        .search-bar { position: relative; margin-bottom: 24px; }
        .search-bar input { width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 10px 16px 10px 40px; color: #f0f4ff; font-size: 14px; outline: none; }
        .search-bar input:focus { border-color: #6366f1; }
        .search-bar::before { content: '🔍'; position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-size: 14px; }
        .doc-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 20px 24px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; gap: 16px; transition: all 0.2s; }
        .doc-card:hover { border-color: rgba(99,102,241,0.3); background: rgba(99,102,241,0.05); }
        .doc-info { flex: 1; }
        .doc-label { font-size: 15px; font-weight: 700; color: #f0f4ff; margin-bottom: 6px; }
        .doc-meta  { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
        .doc-meta span { font-size: 12px; color: rgba(255,255,255,0.45); }
        .badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .badge-blue   { background: rgba(99,102,241,0.15); color: #818cf8; }
        .badge-green  { background: rgba(34,197,94,0.15);  color: #4ade80; }
        .badge-yellow { background: rgba(234,179,8,0.15);  color: #facc15; }
        .doc-actions { display: flex; gap: 8px; }
        .btn-del { background: rgba(239,68,68,0.12); color: #f87171; border: none; border-radius: 8px; padding: 7px 14px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .btn-del:hover { background: rgba(239,68,68,0.25); }
        .btn-del:disabled { opacity: 0.4; cursor: not-allowed; }
        .empty-state { text-align: center; padding: 64px 24px; }
        .empty-state .icon { font-size: 48px; margin-bottom: 16px; }
        .empty-state h3 { font-size: 18px; font-weight: 700; color: #f0f4ff; margin-bottom: 8px; }
        .empty-state p  { font-size: 14px; color: rgba(255,255,255,0.4); line-height: 1.6; }
        .toast { position: fixed; bottom: 24px; right: 24px; background: rgba(34,197,94,0.9); color: #fff; padding: 12px 20px; border-radius: 10px; font-size: 13px; font-weight: 600; z-index: 9999; }
        .summary { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
        .summary-pill { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 6px 16px; font-size: 12px; color: rgba(255,255,255,0.6); }
        .summary-pill strong { color: #818cf8; }
      `}</style>

      <div className="page-header">
        <div>
          <h1>📁 Mis Documentos</h1>
          <p>Documentos guardados que puedes reutilizar al crear nuevas planeaciones, PAEC o PMC.</p>
        </div>
      </div>

      {/* Summary pills */}
      {docs.length > 0 && (
        <div className="summary">
          <div className="summary-pill">Total: <strong>{docs.length}</strong></div>
          {Object.entries(DOC_TYPE_LABELS).map(([type, label]) => {
            const count = docs.filter(d => d.doc_type === type).length;
            return count > 0 ? (
              <div key={type} className="summary-pill">{label}: <strong>{count}</strong></div>
            ) : null;
          })}
        </div>
      )}

      {/* Search */}
      {docs.length > 0 && (
        <div className="search-bar">
          <input placeholder="Buscar por nombre, UAC o escuela..." value={filter} onChange={e => setFilter(e.target.value)} />
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="empty-state"><div className="icon">⏳</div><h3>Cargando...</h3></div>
      ) : docs.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📂</div>
          <h3>No tienes documentos guardados</h3>
          <p>
            Cuando subas un PDF al crear una planeación, PAEC o PMC,<br/>
            el sistema lo guardará aquí para que no tengas que subirlo de nuevo.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><div className="icon">🔍</div><h3>Sin resultados</h3><p>No hay documentos que coincidan con tu búsqueda.</p></div>
      ) : (
        filtered.map(doc => (
          <div key={doc.id} className="doc-card">
            <div className="doc-info">
              <div className="doc-label">{doc.label}</div>
              <div className="doc-meta">
                <span className={`badge ${DOC_TYPE_COLORS[doc.doc_type] || 'badge-blue'}`}>
                  {DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}
                </span>
                {doc.uac_name && <span>📚 {doc.uac_name}{doc.semester ? ` · Sem. ${doc.semester}` : ''}</span>}
                {doc.school_name && <span>🏫 {doc.school_name}</span>}
                <span>📅 Guardado el {relDate(doc.created_at)}</span>
                <span>🔁 Usado {doc.used_count} {doc.used_count === 1 ? 'vez' : 'veces'}</span>
                {doc.file_name && <span>📎 {doc.file_name}</span>}
              </div>
            </div>
            <div className="doc-actions">
              <button className="btn-del" onClick={() => deleteDoc(doc.id, doc.label)} disabled={deleting === doc.id}>
                {deleting === doc.id ? 'Eliminando...' : '🗑️ Eliminar'}
              </button>
            </div>
          </div>
        ))
      )}

      {msg && <div className="toast">{msg}</div>}
    </div>
  );
}
