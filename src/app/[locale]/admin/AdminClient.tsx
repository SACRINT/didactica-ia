'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface ApiKey {
  id: string; label: string; provider: string; model_default: string | null;
  key_preview: string; is_active: boolean; priority: number;
  usage_count: number; error_count: number; last_used_at: string | null;
  last_error_at: string | null;
}
interface PlatformConfig { [key: string]: string; }
interface Stats {
  totals: { teachers: number; plannings: number; paec: number; pmc: number; todayActivity: number };
  activityByDay: { date: string; count: number; action: string }[];
  providerStats: { provider_used: string; model_used: string; count: number; successes: number; failures: number }[];
  topUsers: { teacher_email: string; total_actions: number }[];
}
interface Teacher {
  id: string; name: string; email: string; school_name: string;
  planning_count: number; paec_count: number; pmc_count: number;
  doc_count: number; last_active: string | null; is_blocked: boolean;
  role: string; is_premium: boolean;
}
interface Prompt { id: string; label: string; content: string; is_active: boolean; updated_at: string; updated_by: string | null; }
interface UserDoc { id: string; teacher_email: string; doc_type: string; label: string; uac_name: string | null; file_name: string | null; used_count: number; created_at: string; }
interface ActivityEntry { id: string; teacher_email: string; action: string; provider_used: string | null; model_used: string | null; success: boolean; error_msg: string | null; created_at: string; }

const PROVIDERS = ['gemini', 'claude', 'openai', 'nvidia', 'qwen', 'mistral', 'openrouter'];

// Modelos disponibles por proveedor para USO ESTÁNDAR (cuota gratuita masiva 500 RPD / 15 RPM)
const STANDARD_MODELS: Record<string, { id: string; label: string }[]> = {
  gemini:  [
    { id: 'gemini-3.5-flash-lite', label: 'gemini-3.5-flash-lite — 500 RPD / 15 RPM ✓' },
    { id: 'gemini-3.1-flash-lite', label: 'gemini-3.1-flash-lite — 500 RPD / 15 RPM ✓' },
  ],
  claude:  [{ id: 'claude-haiku-4-5', label: 'claude-haiku-4-5 — 50 RPD (free tier)' }],
  openai:  [
    { id: 'gpt-4o-mini', label: 'gpt-4o-mini — Free tier limitado' },
    { id: 'gpt-3.5-turbo', label: 'gpt-3.5-turbo — Free tier limitado' },
  ],
  nvidia:  [
    { id: 'meta/llama-3.1-70b-instruct', label: 'llama-3.1-70b — 40 RPM / 1000 RPD (free)' },
    { id: 'microsoft/phi-3-mini-4k-instruct', label: 'phi-3-mini — 40 RPM / 1000 RPD (free)' },
  ],
  qwen:    [{ id: 'qwen-turbo', label: 'qwen-turbo — Free tier' }],
  mistral: [{ id: 'mistral-small-latest', label: 'mistral-small-latest — Free tier' }],
  openrouter: [
    { id: 'meta-llama/llama-3.1-8b-instruct:free', label: 'llama-3.1-8b — Gratis (OpenRouter)' },
    { id: 'mistralai/mistral-7b-instruct:free', label: 'mistral-7b — Gratis (OpenRouter)' },
    { id: 'deepseek/deepseek-r1:free', label: 'deepseek-r1 — Gratis (OpenRouter)' },
  ],
};

// Modelos disponibles por proveedor para USO PREMIUM (APIs de paga / avanzadas)
const PREMIUM_MODELS: Record<string, { id: string; label: string }[]> = {
  gemini: [
    { id: 'gemini-3.5-flash-lite', label: 'gemini-3.5-flash-lite — 500 RPD / 15 RPM (Gratuito)' },
    { id: 'gemini-3.1-flash-lite', label: 'gemini-3.1-flash-lite — 500 RPD / 15 RPM (Gratuito)' },
    { id: 'gemini-3.5-flash',      label: 'gemini-3.5-flash — 1000 RPD / 15 RPM (Pago recomendado)' },
    { id: 'gemini-3.1-flash',      label: 'gemini-3.1-flash — 1000 RPD / 15 RPM (Pago)' },
  ],
  claude: [
    { id: 'claude-haiku-4-5',   label: 'claude-haiku-4-5 — 50 RPD (free) / ∞ con API key' },
    { id: 'claude-sonnet-4-5',  label: 'claude-sonnet-4-5 — API de paga' },
    { id: 'claude-opus-4-5',    label: 'claude-opus-4-5 — API de paga (más capaz)' },
  ],
  openai: [
    { id: 'gpt-4o-mini', label: 'gpt-4o-mini — API de paga (económico)' },
    { id: 'gpt-4o',      label: 'gpt-4o — API de paga (avanzado)' },
    { id: 'gpt-3.5-turbo', label: 'gpt-3.5-turbo — API de paga (rápido)' },
  ],
  nvidia: [
    { id: 'meta/llama-3.1-70b-instruct',       label: 'llama-3.1-70b — 40 RPM / 1000 RPD (free)' },
    { id: 'microsoft/phi-3-mini-4k-instruct',  label: 'phi-3-mini — 40 RPM / 1000 RPD (free)' },
  ],
  qwen: [
    { id: 'qwen-turbo', label: 'qwen-turbo — Free tier' },
    { id: 'qwen-plus',  label: 'qwen-plus — API de paga' },
    { id: 'qwen-max',   label: 'qwen-max — API de paga (más capaz)' },
  ],
  mistral: [
    { id: 'mistral-small-latest', label: 'mistral-small-latest — Free tier' },
    { id: 'mistral-large-latest', label: 'mistral-large-latest — API de paga' },
  ],
  openrouter: [
    { id: 'meta-llama/llama-3.1-8b-instruct:free',     label: 'llama-3.1-8b — Gratis' },
    { id: 'mistralai/mistral-7b-instruct:free',        label: 'mistral-7b — Gratis' },
    { id: 'deepseek/deepseek-r1:free',                 label: 'deepseek-r1 — Gratis' },
    { id: 'anthropic/claude-sonnet-4-5',               label: 'claude-sonnet-4-5 — De paga' },
    { id: 'openai/gpt-4o',                             label: 'gpt-4o — De paga' },
  ],
};

// Alias para formulario de agregar key
const MODELS = PREMIUM_MODELS;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** A user is considered "active" only if they had activity in the last 30 minutes */
function isRecentlyActive(lastActive: string | null): boolean {
  if (!lastActive) return false;
  return (Date.now() - new Date(lastActive).getTime()) < 30 * 60 * 1000;
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Nunca';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000) return 'Hace un momento';
  if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} h`;
  return `Hace ${Math.floor(diff / 86400000)} días`;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminClient({ locale, adminEmail }: { locale: string; adminEmail: string }) {
  const [activeTab, setActiveTab] = useState<'keys' | 'config' | 'users' | 'stats' | 'prompts' | 'docs' | 'activity'>('stats');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Data states
  const [keys, setKeys]       = useState<ApiKey[]>([]);
  const [config, setConfig]   = useState<PlatformConfig>({});
  const [stats, setStats]     = useState<Stats | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [adminDocs, setAdminDocs] = useState<UserDoc[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  // Form states
  const [newKey, setNewKey] = useState({ label: '', provider: 'gemini', apiKey: '', modelDefault: '' });
  const [editPromptId, setEditPromptId] = useState<string | null>(null);
  const [editPromptContent, setEditPromptContent] = useState('');
  const [editLabelId, setEditLabelId] = useState<string | null>(null);
  const [editLabelValue, setEditLabelValue] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [seedingPrompts, setSeedingPrompts] = useState(false);

  // Key test states
  const [keyTestResults, setKeyTestResults] = useState<Record<string, { ok: boolean; latencyMs: number; message: string }>>({});
  const [testingKeys, setTestingKeys] = useState<Set<string>>(new Set());
  const [testingAll, setTestingAll] = useState(false);

  // ── Data fetchers ────────────────────────────────────────────────────────

  const showMsg = (text: string, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 4000); };

  const loadKeys    = useCallback(() => fetch('/api/admin/api-keys').then(r => r.json()).then(d => setKeys(d.keys || [])), []);
  const loadConfig  = useCallback(() => fetch('/api/admin/config').then(r => r.json()).then(d => setConfig(d.config || {})), []);
  const loadStats   = useCallback(() => fetch('/api/admin/stats').then(r => r.json()).then(d => setStats(d)), []);
  const loadTeachers = useCallback(() => fetch('/api/admin/users').then(r => r.json()).then(d => setTeachers(d.teachers || [])), []);
  const loadPrompts = useCallback(() => fetch('/api/admin/prompts').then(r => r.json()).then(d => setPrompts(d.prompts || [])), []);
  const loadDocs    = useCallback(() => fetch('/api/admin/documents').then(r => r.json()).then(d => setAdminDocs(d.documents || [])), []);
  const loadActivity = useCallback(() => fetch('/api/admin/activity').then(r => r.json()).then(d => setActivity(d.activity || [])), []);

  useEffect(() => {
    loadStats();
    loadConfig();
    loadKeys();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') { loadTeachers().then(() => setUsersLoaded(true)); }
    if (activeTab === 'prompts') loadPrompts();
    if (activeTab === 'docs') loadDocs();
    if (activeTab === 'activity') loadActivity();
  }, [activeTab]);

  // ── Actions ───────────────────────────────────────────────────────────────

  async function saveConfig(updates: Record<string, string>) {
    setSaving(true);
    const r = await fetch('/api/admin/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
    setSaving(false);
    if (r.ok) { setConfig(c => ({ ...c, ...updates })); showMsg('Configuración guardada ✓'); }
    else showMsg('Error al guardar', false);
  }

  async function toggleUserPremium(teacherId: string, isPremium: boolean) {
    await fetch('/api/admin/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teacherId, isPremium }) });
    loadTeachers(); showMsg(isPremium ? '⭐ Acceso Premium activado' : '⚡ Revertido a Estándar');
  }

  async function addKey() {
    if (!newKey.label || !newKey.provider || !newKey.apiKey) return showMsg('Completa todos los campos', false);
    setSaving(true);
    const r = await fetch('/api/admin/api-keys', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newKey.label, provider: newKey.provider, apiKey: newKey.apiKey, modelDefault: newKey.modelDefault }),
    });
    setSaving(false);
    if (r.ok) { setNewKey({ label: '', provider: 'gemini', apiKey: '', modelDefault: '' }); loadKeys(); showMsg('API Key agregada y cifrada ✓'); }
    else { const d = await r.json(); showMsg(d.error || 'Error', false); }
  }

  async function toggleKey(id: string, isActive: boolean) {
    await fetch('/api/admin/api-keys', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, isActive }) });
    loadKeys();
  }

  async function deleteKey(id: string) {
    if (!confirm('¿Eliminar esta API Key?')) return;
    await fetch('/api/admin/api-keys', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    loadKeys(); showMsg('Key eliminada');
  }

  async function movePriority(id: string, dir: 'up' | 'down') {
    const sorted = [...keys].sort((a, b) => a.priority - b.priority);
    const idx = sorted.findIndex(k => k.id === id);
    const swap = dir === 'up' ? sorted[idx - 1] : sorted[idx + 1];
    if (!swap) return;
    await Promise.all([
      fetch('/api/admin/api-keys', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, priority: swap.priority }) }),
      fetch('/api/admin/api-keys', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: swap.id, priority: sorted[idx].priority }) }),
    ]);
    loadKeys();
  }

  async function testKey(id: string) {
    setTestingKeys(prev => new Set(prev).add(id));
    try {
      const res = await fetch('/api/admin/api-keys/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      setKeyTestResults(prev => ({ ...prev, [id]: { ok: data.ok, latencyMs: data.latencyMs, message: data.message } }));
    } catch {
      setKeyTestResults(prev => ({ ...prev, [id]: { ok: false, latencyMs: 0, message: 'Error de red' } }));
    } finally {
      setTestingKeys(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  async function testAllKeys() {
    setTestingAll(true);
    setKeyTestResults({});
    try {
      const res = await fetch('/api/admin/api-keys/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testAll: true }),
      });
      const data = await res.json();
      if (data.results) {
        const map: Record<string, { ok: boolean; latencyMs: number; message: string }> = {};
        for (const r of data.results) map[r.id] = { ok: r.ok, latencyMs: r.latencyMs, message: r.message };
        setKeyTestResults(map);
        const ok = data.results.filter((r: any) => r.ok).length;
        showMsg(`${ok}/${data.results.length} keys funcionando`, ok === data.results.length);
      }
    } catch {
      showMsg('Error al probar las keys', false);
    } finally {
      setTestingAll(false);
    }
  }

  async function toggleUser(teacherId: string, isBlocked: boolean) {
    const res = await fetch('/api/admin/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teacherId, isBlocked }) });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      showMsg(d.error || 'Error al actualizar usuario', false);
      return;
    }
    loadTeachers();
    showMsg(isBlocked ? 'Usuario bloqueado' : 'Usuario reactivado');
  }

  async function changeUserRole(teacherId: string, role: string) {
    await fetch('/api/admin/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teacherId, role }) });
    loadTeachers(); showMsg('Rol de usuario actualizado ✓');
  }

  async function saveKeyLabel(id: string) {
    if (!editLabelValue.trim()) return;
    await fetch('/api/admin/api-keys', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, label: editLabelValue.trim() }) });
    setEditLabelId(null);
    loadKeys();
    showMsg('Etiqueta actualizada ✓');
  }

  async function seedPrompts() {
    setSeedingPrompts(true);
    try {
      const r = await fetch('/api/admin/prompts/seed', { method: 'POST' });
      const d = await r.json();
      if (r.ok) { loadPrompts(); showMsg(`${d.count} prompts sembrados ✓`); }
      else showMsg(d.error || 'Error al sembrar prompts', false);
    } catch { showMsg('Error de red', false); }
    setSeedingPrompts(false);
  }

  async function savePrompt() {
    if (!editPromptId) return;
    setSaving(true);
    const r = await fetch('/api/admin/prompts', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editPromptId, content: editPromptContent }),
    });
    setSaving(false);
    if (r.ok) { setEditPromptId(null); loadPrompts(); showMsg('Prompt actualizado ✓'); }
    else showMsg('Error al guardar prompt', false);
  }

  async function deleteDoc(id: string) {
    if (!confirm('¿Eliminar este documento del usuario?')) return;
    await fetch('/api/admin/documents', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    loadDocs(); showMsg('Documento eliminado');
  }

  async function testConnection() {
    setTestResult('Probando conexión...');
    try {
      const r = await fetch('/api/admin/api-keys');
      if (r.ok) setTestResult('✅ Conexión exitosa con la base de datos');
      else setTestResult('❌ Error al conectar');
    } catch { setTestResult('❌ Error de red'); }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const tabs: { id: typeof activeTab; label: string; icon: string }[] = [
    { id: 'stats',    label: 'Estadísticas',  icon: '📊' },
    { id: 'keys',     label: 'API Keys & IA', icon: '🔑' },
    { id: 'config',   label: 'Configuración', icon: '⚙️' },
    { id: 'users',    label: 'Usuarios',      icon: '👥' },
    { id: 'prompts',  label: 'Prompts',       icon: '✏️' },
    { id: 'docs',     label: 'Documentos',    icon: '📁' },
    { id: 'activity', label: 'Actividad',     icon: '📜' },
  ];

  return (
    <div className="admin-panel">
      <style>{`
        .admin-panel { display: flex; gap: 0; min-height: 85vh; background: rgba(8,12,24,0.7); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.04) inset; backdrop-filter: blur(12px); }
        .admin-sidebar { width: 200px; flex-shrink: 0; background: rgba(255,255,255,0.025); border-right: 1px solid rgba(255,255,255,0.06); padding: 24px 0; }
        .admin-sidebar h2 { font-size: 10px; font-weight: 700; letter-spacing: 1.2px; color: rgba(240,244,255,0.3); padding: 0 20px 16px; text-transform: uppercase; }
        .admin-tab-btn { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 20px; font-size: 13px; color: rgba(240,244,255,0.5); background: none; border: none; border-left: 3px solid transparent; cursor: pointer; text-align: left; transition: all 0.18s ease; }
        .admin-tab-btn:hover { background: rgba(255,255,255,0.05); color: rgba(240,244,255,0.85); transform: translateX(2px); }
        .admin-tab-btn.active { background: rgba(99,102,241,0.12); color: #818cf8; border-left-color: #6366f1; font-weight: 600; }
        .admin-content { flex: 1; padding: 32px; overflow-y: auto; max-height: 85vh; }
        .admin-content h1 { font-size: 20px; font-weight: 800; color: #f0f4ff; margin-bottom: 24px; letter-spacing: -0.4px; display: flex; align-items: center; gap: 10px; }
        .admin-content h1::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, rgba(99,102,241,0.3), transparent); }
        .admin-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 28px; }
        .stat-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 20px 16px; text-align: center; position: relative; overflow: hidden; transition: all 0.2s ease; }
        .stat-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, rgba(99,102,241,0.6), transparent); }
        .stat-card:hover { border-color: rgba(99,102,241,0.25); transform: translateY(-2px); background: rgba(99,102,241,0.06); }
        .stat-card .num { font-size: 30px; font-weight: 800; color: #818cf8; letter-spacing: -1px; }
        .stat-card .lbl { font-size: 11px; color: rgba(240,244,255,0.4); margin-top: 6px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
        .admin-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .admin-table th { text-align: left; padding: 10px 12px; color: rgba(240,244,255,0.35); font-size: 10px; text-transform: uppercase; letter-spacing: 0.7px; font-weight: 700; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .admin-table td { padding: 10px 12px; color: rgba(240,244,255,0.75); border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: middle; }
        .admin-table tr:hover td { background: rgba(255,255,255,0.025); }
        .badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .badge-green  { background: rgba(16,185,129,0.12); color: #34d399; border: 1px solid rgba(16,185,129,0.2); }
        .badge-red    { background: rgba(244,63,94,0.12);  color: #fb7185; border: 1px solid rgba(244,63,94,0.2); }
        .badge-yellow { background: rgba(245,158,11,0.12); color: #fcd34d; border: 1px solid rgba(245,158,11,0.2); }
        .badge-blue   { background: rgba(99,102,241,0.12); color: #818cf8; border: 1px solid rgba(99,102,241,0.2); padding: 2px 8px; }
        .btn-sm { padding: 5px 12px; border-radius: 8px; border: none; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.18s ease; }
        .btn-primary { background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; box-shadow: 0 2px 8px rgba(99,102,241,0.35); }
        .btn-primary:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .btn-danger  { background: rgba(244,63,94,0.12); color: #fb7185; border: 1px solid rgba(244,63,94,0.2); }
        .btn-danger:hover  { background: rgba(244,63,94,0.22); }
        .btn-ghost   { background: rgba(255,255,255,0.05); color: rgba(240,244,255,0.6); border: 1px solid rgba(255,255,255,0.08); }
        .btn-ghost:hover   { background: rgba(255,255,255,0.09); color: rgba(240,244,255,0.9); }
        .form-row { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 20px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 140px; }
        .form-group label { font-size: 10px; color: rgba(240,244,255,0.4); font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; }
        .form-group input, .form-group select { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px 12px; color: #f0f4ff; font-size: 13px; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
        .form-group input:focus, .form-group select:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.2); }
        .form-group textarea { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 10px 12px; color: #f0f4ff; font-size: 13px; outline: none; font-family: monospace; resize: vertical; min-height: 300px; width: 100%; transition: border-color 0.2s; }
        .form-group textarea:focus { border-color: #6366f1; }
        .toast { position: fixed; bottom: 24px; right: 24px; padding: 12px 20px; border-radius: 12px; font-size: 13px; font-weight: 600; z-index: 9999; animation: toastIn 0.3s ease; backdrop-filter: blur(12px); box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
        .toast-ok  { background: rgba(16,185,129,0.9); color: #fff; border: 1px solid rgba(16,185,129,0.4); }
        .toast-err { background: rgba(244,63,94,0.9);  color: #fff; border: 1px solid rgba(244,63,94,0.4); }
        @keyframes toastIn { from { transform: translateY(16px) scale(0.95); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .divider { height: 1px; background: rgba(255,255,255,0.06); margin: 24px 0; }
        .provider-card { background: rgba(255,255,255,0.03); border: 1.5px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px 20px; cursor: pointer; transition: all 0.2s; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
        .provider-card.selected { border-color: #6366f1; background: rgba(99,102,241,0.1); }
        .provider-card:hover { border-color: rgba(99,102,241,0.4); }
        .prompt-item { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 14px 18px; margin-bottom: 10px; transition: border-color 0.2s; }
        .prompt-item:hover { border-color: rgba(99,102,241,0.25); }
        .prompt-item .prompt-label { font-weight: 600; color: #f0f4ff; font-size: 14px; margin-bottom: 4px; }
        .prompt-item .prompt-meta  { font-size: 11px; color: rgba(255,255,255,0.35); }
        .empty-state { text-align: center; padding: 48px; color: rgba(240,244,255,0.25); font-size: 14px; }
        @keyframes adminFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .admin-content > * { animation: adminFadeIn 0.25s ease forwards; }
      `}</style>

      {/* Sidebar */}
      <div className="admin-sidebar">
        <h2>Admin Panel</h2>
        {tabs.map(t => (
          <button key={t.id} className={`admin-tab-btn ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="admin-content">

        {/* ── STATS ── */}
        {activeTab === 'stats' && (
          <>
            <h1>📊 Estadísticas de la Plataforma</h1>
            {stats ? (
              <>
                <div className="admin-grid">
                  <div className="stat-card"><div className="num">{stats.totals.plannings}</div><div className="lbl">Planeaciones</div></div>
                  <div className="stat-card"><div className="num">{stats.totals.paec}</div><div className="lbl">Proyectos PAEC</div></div>
                  <div className="stat-card"><div className="num">{stats.totals.pmc}</div><div className="lbl">Planes PMC</div></div>
                  <div className="stat-card"><div className="num">{stats.totals.teachers}</div><div className="lbl">Docentes</div></div>
                  <div className="stat-card"><div className="num">{stats.totals.todayActivity}</div><div className="lbl">Acciones hoy</div></div>
                </div>
                {stats.providerStats.length > 0 && (
                  <>
                    <h3 style={{ color: '#818cf8', fontSize: 14, marginBottom: 12 }}>Uso por Proveedor</h3>
                    <table className="admin-table" style={{ marginBottom: 24 }}>
                      <thead><tr><th>Proveedor</th><th>Modelo</th><th>Usos</th><th>Exitosos</th><th>Errores</th></tr></thead>
                      <tbody>
                        {stats.providerStats.map((p, i) => (
                          <tr key={i}>
                            <td><span className="badge badge-blue">{p.provider_used}</span></td>
                            <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.model_used}</td>
                            <td>{p.count}</td>
                            <td style={{ color: '#4ade80' }}>{p.successes}</td>
                            <td style={{ color: '#f87171' }}>{p.failures}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
                {stats.topUsers.length > 0 && (
                  <>
                    <h3 style={{ color: '#818cf8', fontSize: 14, marginBottom: 12 }}>Top Docentes (últimos 30 días)</h3>
                    <table className="admin-table">
                      <thead><tr><th>#</th><th>Email</th><th>Acciones</th></tr></thead>
                      <tbody>
                        {stats.topUsers.map((u, i) => (
                          <tr key={u.teacher_email}>
                            <td style={{ color: '#818cf8' }}>#{i + 1}</td>
                            <td>{u.teacher_email}</td>
                            <td>{u.total_actions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
                {stats.providerStats.length === 0 && stats.topUsers.length === 0 && (
                  <div className="empty-state">🚀 Aún no hay actividad registrada.<br/>Las estadísticas aparecerán cuando los docentes empiecen a generar contenido.</div>
                )}
              </>
            ) : <div className="empty-state">Cargando estadísticas...</div>}
          </>
        )}

        {/* ── API KEYS & IA ── */}
        {activeTab === 'keys' && (
          <>
            <h1>🔑 Gestión de API Keys y Proveedor de IA</h1>
            
            {/* ── Modelos Activos por Perfil ── */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '20px', marginBottom: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f0f4ff', margin: '0 0 4px 0' }}>🎛️ Modelos Activos por Perfil</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '0 0 20px 0' }}>
                Configura el proveedor y modelo para cada perfil de usuario. Los cambios aplican inmediatamente a todas las generaciones.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>

                {/* Tarjeta Estándar */}
                <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 20 }}>⚡</span>
                    <div>
                      <div style={{ fontWeight: 700, color: '#c7d2fe', fontSize: 13 }}>Uso Estándar (Docentes)</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Cuota gratuita · 500 RPD / 15 RPM</div>
                    </div>
                  </div>
                  <div className="form-group" style={{ margin: '0 0 10px 0' }}>
                    <label>Proveedor</label>
                    <select
                      value={config['active_provider'] || 'gemini'}
                      onChange={e => setConfig(c => ({ ...c, active_provider: e.target.value, active_model: (STANDARD_MODELS[e.target.value] || [])[0]?.id || '' }))}
                      style={{ background: '#131324', color: '#f0f4ff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', width: '100%' }}
                    >
                      {PROVIDERS.map(p => <option key={p} value={p} style={{ background: '#131324', color: '#f0f4ff' }}>{p}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Modelo</label>
                    <select
                      value={config['active_model'] || 'gemini-3.5-flash-lite'}
                      onChange={e => setConfig(c => ({ ...c, active_model: e.target.value }))}
                      style={{ background: '#131324', color: '#f0f4ff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', width: '100%' }}
                    >
                      {(STANDARD_MODELS[config['active_provider'] || 'gemini'] || []).map(m => (
                        <option key={m.id} value={m.id} style={{ background: '#131324', color: '#f0f4ff' }}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tarjeta Premium */}
                <div style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 20 }}>⭐</span>
                    <div>
                      <div style={{ fontWeight: 700, color: '#fde68a', fontSize: 13 }}>Uso Premium (Admin + Usuarios Autorizados)</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Modelos avanzados / APIs de paga</div>
                    </div>
                  </div>
                  <div className="form-group" style={{ margin: '0 0 10px 0' }}>
                    <label>Proveedor</label>
                    <select
                      value={config['admin_provider'] || 'gemini'}
                      onChange={e => setConfig(c => ({ ...c, admin_provider: e.target.value, admin_model: (PREMIUM_MODELS[e.target.value] || [])[0]?.id || '' }))}
                      style={{ background: '#131324', color: '#fde68a', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', width: '100%' }}
                    >
                      {PROVIDERS.map(p => <option key={p} value={p} style={{ background: '#131324', color: '#f0f4ff' }}>{p}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Modelo</label>
                    <select
                      value={config['admin_model'] || 'gemini-3.5-flash-lite'}
                      onChange={e => setConfig(c => ({ ...c, admin_model: e.target.value }))}
                      style={{ background: '#131324', color: '#fde68a', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', width: '100%' }}
                    >
                      {(PREMIUM_MODELS[config['admin_provider'] || 'gemini'] || []).map(m => (
                        <option key={m.id} value={m.id} style={{ background: '#131324', color: '#f0f4ff' }}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Guardar Configuración */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
                {testResult && (
                  <span style={{ fontSize: 12, color: testResult.includes('✅') ? '#4ade80' : '#f87171' }}>
                    {testResult}
                  </span>
                )}
                <button className="btn-sm btn-ghost" onClick={testConnection} style={{ border: '1px solid rgba(255,255,255,0.1)', height: 38 }}>
                  Probar conexión a BD
                </button>
                <button
                  className="btn-sm btn-primary"
                  disabled={saving}
                  style={{ height: 38, padding: '0 20px', fontWeight: 700 }}
                  onClick={() => saveConfig({
                    active_provider: config['active_provider'] || 'gemini',
                    active_model:    config['active_model']    || 'gemini-3.5-flash-lite',
                    admin_provider:  config['admin_provider']  || 'gemini',
                    admin_model:     config['admin_model']     || 'gemini-3.5-flash-lite',
                  })}
                >
                  {saving ? 'Guardando...' : '💾 Guardar Configuración de Modelos'}
                </button>
              </div>
            </div>

            <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 24 }}>
              🔐 Las API Keys se almacenan cifradas con AES-256. Nadie puede ver su valor real desde la interfaz.
            </div>

            {/* Add form */}
            <h3 style={{ fontSize: 14, color: '#818cf8', marginBottom: 16 }}>Agregar Nueva Key</h3>
            <div className="form-row" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1, minWidth: 180 }}>
                <label>Etiqueta</label>
                <input placeholder="Ej: Gemini cuenta 2" value={newKey.label} onChange={e => setNewKey(k => ({ ...k, label: e.target.value }))} />
              </div>
              <div className="form-group" style={{ width: 140 }}>
                <label>Proveedor</label>
                <select
                  value={newKey.provider}
                  onChange={e => setNewKey(k => ({ ...k, provider: e.target.value }))}
                  style={{ background: '#131324', color: '#f0f4ff', border: '1px solid rgba(255,255,255,0.15)' }}
                >
                  {PROVIDERS.map(p => <option key={p} value={p} style={{ background: '#131324', color: '#f0f4ff' }}>{p}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ flex: 2, minWidth: 220 }}>
                <label>API Key</label>
                <input type="password" placeholder="Pega tu API Key aquí" value={newKey.apiKey} onChange={e => setNewKey(k => ({ ...k, apiKey: e.target.value }))} />
              </div>
              <div className="form-group" style={{ width: 200 }}>
                <label>Modelo por defecto (opcional)</label>
                <select
                  value={newKey.modelDefault}
                  onChange={e => setNewKey(k => ({ ...k, modelDefault: e.target.value }))}
                  style={{ background: '#131324', color: '#f0f4ff', border: '1px solid rgba(255,255,255,0.15)' }}
                >
                  <option value="" style={{ background: '#131324', color: '#f0f4ff' }}>— Usar modelo activo —</option>
                  {(MODELS[newKey.provider] || []).map(m => (
                    <option key={m.id} value={m.id} style={{ background: '#131324', color: '#f0f4ff' }}>{m.label}</option>
                  ))}
                </select>
              </div>
              <button className="btn-sm btn-primary" onClick={addKey} disabled={saving} style={{ height: 38, alignSelf: 'flex-end', minWidth: 100 }}>
                {saving ? '...' : '+ Agregar'}
              </button>
            </div>

            <div className="divider" />

            {/* Keys table */}
            {keys.length === 0 ? (
              <div className="empty-state">No hay API Keys configuradas.<br/>Agrega tu primera key arriba.</div>
            ) : (
              <>
                {/* Header bar with Test All button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                    🔑 {keys.length} {keys.length === 1 ? 'key registrada' : 'keys registradas'}
                  </span>
                  <button
                    className="btn-sm btn-primary"
                    onClick={testAllKeys}
                    disabled={testingAll}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', fontSize: 13 }}
                  >
                    {testingAll ? (
                      <><span style={{ display: 'inline-block', width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Probando todas...</>
                    ) : (
                      <>🔬 Probar Todas las Llaves</>
                    )}
                  </button>
                </div>

                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Prioridad</th><th>Proveedor</th><th>Etiqueta</th><th>Key</th>
                      <th>Estado</th><th>Usos</th><th>Errores</th><th>Último uso</th>
                      <th>Resultado Prueba</th><th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...keys].sort((a, b) => a.priority - b.priority).map((k, idx) => {
                      const testRes = keyTestResults[k.id];
                      const isTesting = testingKeys.has(k.id);
                      return (
                        <tr key={k.id}>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn-sm btn-ghost" onClick={() => movePriority(k.id, 'up')} disabled={idx === 0}>↑</button>
                              <span style={{ color: '#818cf8', fontWeight: 700 }}>#{k.priority}</span>
                              <button className="btn-sm btn-ghost" onClick={() => movePriority(k.id, 'down')} disabled={idx === keys.length - 1}>↓</button>
                            </div>
                          </td>
                          <td><span className="badge badge-blue">{k.provider}</span></td>
                          <td>
                            {editLabelId === k.id ? (
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                <input
                                  value={editLabelValue}
                                  onChange={e => setEditLabelValue(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') saveKeyLabel(k.id); if (e.key === 'Escape') setEditLabelId(null); }}
                                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid #6366f1', borderRadius: 6, padding: '4px 8px', color: '#f0f4ff', fontSize: 12, width: 180 }}
                                  autoFocus
                                />
                                <button className="btn-sm btn-primary" onClick={() => saveKeyLabel(k.id)}>✓</button>
                                <button className="btn-sm btn-ghost" onClick={() => setEditLabelId(null)}>✗</button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <span>{k.label}</span>
                                <button className="btn-sm btn-ghost" style={{ fontSize: 10, padding: '3px 8px' }}
                                  onClick={() => { setEditLabelId(k.id); setEditLabelValue(k.label); }}>✏️</button>
                              </div>
                            )}
                          </td>
                          <td style={{ fontFamily: 'monospace', color: '#facc15' }}>{k.key_preview}</td>
                          <td>
                            <span className={`badge ${k.is_active ? 'badge-green' : 'badge-yellow'}`}>
                              {k.is_active ? '✓ Activa' : '⏸ Inactiva'}
                            </span>
                          </td>
                          <td>{k.usage_count}</td>
                          <td style={{ color: k.error_count > 0 ? '#f87171' : 'inherit' }}>{k.error_count}</td>
                          <td style={{ fontSize: 11 }}>{relativeTime(k.last_used_at)}</td>

                          {/* Test result cell */}
                          <td style={{ minWidth: 130 }}>
                            {isTesting ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                                <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#818cf8', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                                Probando...
                              </span>
                            ) : testRes ? (
                              <div>
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  background: testRes.ok ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                                  border: `1px solid ${testRes.ok ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
                                  borderRadius: 6, padding: '3px 8px', fontSize: 12,
                                  color: testRes.ok ? '#4ade80' : '#f87171',
                                }}>
                                  {testRes.ok ? '✅' : '❌'}
                                  {testRes.ok ? ` ${testRes.latencyMs}ms` : ''}
                                </span>
                                {!testRes.ok && (
                                  <div style={{ fontSize: 10, color: '#f87171', marginTop: 3, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                    title={testRes.message}>{testRes.message}</div>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>—</span>
                            )}
                          </td>

                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                className="btn-sm btn-ghost"
                                onClick={() => testKey(k.id)}
                                disabled={isTesting || testingAll}
                                style={{ color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}
                                title="Probar esta API Key"
                              >
                                {isTesting ? '...' : '🔬 Probar'}
                              </button>
                              <button className="btn-sm btn-ghost" onClick={() => toggleKey(k.id, !k.is_active)}>
                                {k.is_active ? 'Pausar' : 'Activar'}
                              </button>
                              <button className="btn-sm btn-danger" onClick={() => deleteKey(k.id)}>🗑️</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}

        {/* ── CONFIG ── */}
        {activeTab === 'config' && (
          <>
            <h1>⚙️ Configuración de la Plataforma</h1>
            <div style={{ display: 'grid', gap: 20, maxWidth: 560 }}>
              <div className="form-group">
                <label>Ciclo Escolar Activo</label>
                <input value={config['school_year'] || ''} onChange={e => setConfig(c => ({ ...c, school_year: e.target.value }))}
                  onBlur={() => saveConfig({ school_year: config['school_year'] || '' })} placeholder="2026-2027" />
              </div>
              <div className="form-group">
                <label>Máximo de Planeaciones por Docente por Día</label>
                <input type="number" min="1" max="100" value={config['max_daily_plannings'] || '10'}
                  onChange={e => setConfig(c => ({ ...c, max_daily_plannings: e.target.value }))}
                  onBlur={() => saveConfig({ max_daily_plannings: config['max_daily_plannings'] || '10' })} />
              </div>
              <div className="form-group">
                <label>Mensaje de bienvenida (visible en el dashboard del docente)</label>
                <input value={config['welcome_message'] || ''}
                  onChange={e => setConfig(c => ({ ...c, welcome_message: e.target.value }))}
                  onBlur={() => saveConfig({ welcome_message: config['welcome_message'] || '' })}
                  placeholder="Ej: ¡Bienvenido al ciclo 2026-2027!" />
              </div>
              <div className="divider" />
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#f0f4ff', display: 'flex', alignItems: 'center', gap: 12 }}>
                  Modo Mantenimiento
                  <div style={{ position: 'relative' }}>
                    <input type="checkbox" id="maint" checked={config['maintenance_mode'] === 'true'}
                      onChange={e => saveConfig({ maintenance_mode: e.target.checked ? 'true' : 'false' })}
                      style={{ width: 20, height: 20, accentColor: '#6366f1' }} />
                  </div>
                  {config['maintenance_mode'] === 'true' && <span className="badge badge-yellow">⚠️ Activo</span>}
                </label>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
                  Cuando está activo, los docentes ven un mensaje de mantenimiento en lugar de la plataforma.
                </p>
              </div>
              {config['maintenance_mode'] === 'true' && (
                <div className="form-group">
                  <label>Mensaje de mantenimiento</label>
                  <input value={config['maintenance_message'] || ''}
                    onChange={e => setConfig(c => ({ ...c, maintenance_message: e.target.value }))}
                    onBlur={() => saveConfig({ maintenance_message: config['maintenance_message'] || '' })} />
                </div>
              )}
            </div>
          </>
        )}

        {/* ── USERS ── */}
        {activeTab === 'users' && (
          <>
            <div className="section-header">
              <h1>👥 Gestión de Docentes</h1>
              <button className="btn-sm btn-ghost" onClick={() => { setUsersLoaded(false); loadTeachers().then(() => setUsersLoaded(true)); }}>↺ Actualizar</button>
            </div>
            {!usersLoaded ? (
              <div className="empty-state">Cargando docentes...</div>
            ) : teachers.length === 0 ? (
              <div className="empty-state">
                No hay docentes registrados aún.<br/>
                <span style={{ fontSize: 12, opacity: 0.6 }}>Los docentes aparecen aquí cuando inician sesión por primera vez.</span>
              </div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr><th>Nombre</th><th>Email</th><th>Escuela</th><th>Rol</th><th>Acceso IA</th><th>Planes</th><th>PAEC</th><th>PMC</th><th>Docs</th><th>Última actividad</th><th>Estado</th><th>Acción</th></tr>
                </thead>
                <tbody>
                  {teachers.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.name}</td>
                      <td style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{t.email}</td>
                      <td style={{ fontSize: 12 }}>{t.school_name || '—'}</td>
                      <td>
                        <select
                          value={t.role || 'docente'}
                          onChange={e => changeUserRole(t.id, e.target.value)}
                          style={{ background: '#131324', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '4px 8px', color: '#f0f4ff', fontSize: '12px', outline: 'none' }}
                        >
                          <option value="administrador">Administrador</option>
                          <option value="supervisor">Supervisor</option>
                          <option value="atp">ATP</option>
                          <option value="director">Director</option>
                          <option value="docente">Docente</option>
                        </select>
                      </td>
                      <td>
                        <button
                          onClick={() => toggleUserPremium(t.id, !t.is_premium)}
                          title={t.is_premium ? 'Haz clic para revertir a Estándar' : 'Haz clic para dar acceso Premium'}
                          style={{
                            background: t.is_premium ? 'rgba(234,179,8,0.15)' : 'rgba(255,255,255,0.05)',
                            border: t.is_premium ? '1px solid rgba(234,179,8,0.3)' : '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
                            color: t.is_premium ? '#fde68a' : 'rgba(255,255,255,0.5)',
                            fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                          }}
                        >
                          {t.is_premium ? '⭐ Premium' : '⚡ Estándar'}
                        </button>
                      </td>
                      <td><span className="badge badge-blue">{t.planning_count}</span></td>
                      <td><span className="badge badge-blue">{t.paec_count}</span></td>
                      <td><span className="badge badge-blue">{t.pmc_count}</span></td>
                      <td>{t.doc_count}</td>
                      <td style={{ fontSize: 11 }}>
                        {relativeTime(t.last_active)}
                        {isRecentlyActive(t.last_active) && (
                          <span style={{ marginLeft: 6, display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 4px #4ade80', verticalAlign: 'middle' }} title="Activo ahora (últimos 30 min)" />
                        )}
                      </td>
                      <td><span className={`badge ${t.is_blocked ? 'badge-red' : 'badge-green'}`}>{t.is_blocked ? 'Bloqueado' : 'Habilitado'}</span></td>
                      <td>
                        <button className={`btn-sm ${t.is_blocked ? 'btn-primary' : 'btn-danger'}`}
                          onClick={() => toggleUser(t.id, !t.is_blocked)}>
                          {t.is_blocked ? 'Reactivar' : 'Bloquear'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* ── PROMPTS ── */}
        {activeTab === 'prompts' && (
          <>
            <h1>✏️ Editor de Prompts del Sistema</h1>
            <div style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 24 }}>
              ⚠️ Modificar un prompt afecta TODAS las generaciones futuras. Edita con cuidado.
            </div>
            {editPromptId ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ color: '#818cf8', fontSize: 16 }}>
                    Editando: {prompts.find(p => p.id === editPromptId)?.label}
                  </h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-sm btn-ghost" onClick={() => setEditPromptId(null)}>Cancelar</button>
                    <button className="btn-sm btn-primary" onClick={savePrompt} disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
                  </div>
                </div>
                <div className="form-group">
                  <textarea value={editPromptContent} onChange={e => setEditPromptContent(e.target.value)} style={{ minHeight: 450 }} />
                </div>
              </div>
            ) : prompts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✏️</div>
                <h3 style={{ color: '#f0f4ff', marginBottom: 8 }}>No hay prompts en la base de datos</h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 24 }}>
                  Haz clic en el botón para cargar los prompts del sistema en la base de datos.
                </p>
                <button className="btn-sm btn-primary" style={{ padding: '10px 24px', fontSize: 14 }}
                  onClick={seedPrompts} disabled={seedingPrompts}>
                  {seedingPrompts ? 'Cargando prompts...' : '🌱 Cargar Prompts del Sistema'}
                </button>
              </div>
            ) : (
              prompts.map(p => (
                <div key={p.id} className="prompt-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="prompt-label">{p.label}</div>
                      <div className="prompt-meta">
                        ID: {p.id} · {p.content.length.toLocaleString()} caracteres
                        {p.updated_by && ` · Editado por ${p.updated_by}`}
                        {p.updated_at && ` · ${new Date(p.updated_at).toLocaleDateString('es-MX')}`}
                      </div>
                    </div>
                    <button className="btn-sm btn-ghost" onClick={() => { setEditPromptId(p.id); setEditPromptContent(p.content); }}>
                      ✏️ Editar
                    </button>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* ── DOCUMENTS ── */}
        {activeTab === 'docs' && (
          <>
            <h1>📁 Documentos de Usuarios</h1>
            {adminDocs.length === 0 ? (
              <div className="empty-state">No hay documentos guardados todavía.</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr><th>Docente</th><th>Tipo</th><th>Etiqueta</th><th>UAC</th><th>Archivo</th><th>Usos</th><th>Guardado</th><th>Acción</th></tr>
                </thead>
                <tbody>
                  {adminDocs.map(d => (
                    <tr key={d.id}>
                      <td style={{ fontSize: 12 }}>{d.teacher_email}</td>
                      <td><span className="badge badge-blue">{d.doc_type}</span></td>
                      <td>{d.label}</td>
                      <td style={{ fontSize: 12 }}>{d.uac_name || '—'}</td>
                      <td style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{d.file_name || '—'}</td>
                      <td>{d.used_count}</td>
                      <td style={{ fontSize: 11 }}>{new Date(d.created_at).toLocaleDateString('es-MX')}</td>
                      <td><button className="btn-sm btn-danger" onClick={() => deleteDoc(d.id)}>🗑️</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* ── ACTIVITY ── */}
        {activeTab === 'activity' && (
          <>
            <h1>📋 Registro de Actividad</h1>
            {activity.length === 0 ? (
              <div className="empty-state">No hay actividad registrada todavía.</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr><th>Fecha</th><th>Docente</th><th>Acción</th><th>Proveedor</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {activity.map(a => (
                    <tr key={a.id}>
                      <td style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{new Date(a.created_at).toLocaleString('es-MX')}</td>
                      <td style={{ fontSize: 12 }}>{a.teacher_email}</td>
                      <td><span className="badge badge-blue">{a.action}</span></td>
                      <td style={{ fontSize: 12 }}>{a.provider_used ? `${a.provider_used} / ${a.model_used}` : '—'}</td>
                      <td>
                        {a.success
                          ? <span className="badge badge-green">✓ Éxito</span>
                          : <span className="badge badge-red" title={a.error_msg || ''}>✗ Error</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

      </div>

      {/* Toast */}
      {msg && <div className={`toast ${msg.ok ? 'toast-ok' : 'toast-err'}`}>{msg.text}</div>}
    </div>
  );
}
