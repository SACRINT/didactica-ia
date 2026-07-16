// src/components/dashboard/CustomKeyCard.tsx
'use client';

import { useState, useEffect } from 'react';

type Props = {
  locale: string;
};

export default function CustomKeyCard({ locale }: Props) {
  const [hasKey, setHasKey] = useState(false);
  const [provider, setProvider] = useState('gemini');
  const [keyPreview, setKeyPreview] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null);

  // Cargar estado inicial
  useEffect(() => {
    fetch('/api/teacher-key')
      .then((r) => r.json())
      .then((data) => {
        if (data.hasKey) {
          setHasKey(true);
          setProvider(data.provider || 'gemini');
          setKeyPreview(data.preview);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error cargando llave del docente:', err);
        setLoading(false);
      });
  }, []);

  const showMsg = (text: string, success = true) => {
    setMessage({ text, success });
    setTimeout(() => setMessage(null), 3000);
  };

  async function handleSave() {
    if (!apiKey.trim() && !hasKey) {
      showMsg('Por favor ingresa un valor válido', false);
      return;
    }

    setSaving(true);
    try {
      const r = await fetch('/api/teacher-key', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customApiKey: apiKey.trim(),
          customApiProvider: provider,
        }),
      });

      if (r.ok) {
        const d = await r.json();
        setHasKey(d.hasKey);
        setProvider(d.provider || 'gemini');
        setKeyPreview(apiKey.trim() ? `...${apiKey.trim().slice(-4)}` : null);
        setApiKey('');
        setIsOpen(false);
        showMsg(d.hasKey ? '¡Clave guardada exitosamente! ✓' : 'Clave de API eliminada');
      } else {
        showMsg('Error al guardar la clave', false);
      }
    } catch {
      showMsg('Error de red', false);
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm('¿Estás seguro de que deseas eliminar tu clave personal? La plataforma volverá a usar el pool público.')) return;
    setSaving(true);
    try {
      const r = await fetch('/api/teacher-key', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customApiKey: '',
          customApiProvider: '',
        }),
      });

      if (r.ok) {
        setHasKey(false);
        setKeyPreview(null);
        setApiKey('');
        setIsOpen(false);
        showMsg('Clave personal eliminada');
      } else {
        showMsg('Error al eliminar', false);
      }
    } catch {
      showMsg('Error de red', false);
    }
    setSaving(false);
  }

  if (loading) {
    return <div style={{ minHeight: '60px', opacity: 0.5, display: 'flex', alignItems: 'center' }}>Cargando configuración de IA...</div>;
  }

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '16px',
      padding: '20px',
      marginTop: '32px',
      marginBottom: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      transition: 'all 0.3s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f0f4ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔑 Clave de API de IA Personal
            {hasKey && <span style={{ fontSize: '11px', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(52, 211, 153, 0.2)' }}>Activa ({provider})</span>}
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.4' }}>
            {hasKey
              ? `Tu cuenta tiene configurada la clave personal ${keyPreview}. Las peticiones prioritarias la usarán.`
              : 'Opcional. Agrega tu clave gratuita de Google AI Studio (Gemini) para evitar límites de uso.'
            }
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="btn btn-secondary btn-sm"
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent',
              color: '#f0f4ff',
            }}
          >
            {isOpen ? 'Cancelar' : hasKey ? 'Cambiar Clave' : 'Configurar'}
          </button>
          {hasKey && (
            <button
              onClick={handleDelete}
              className="btn btn-danger btn-sm"
              disabled={saving}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
              }}
            >
              🗑️ Quitar
            </button>
          )}
        </div>
      </div>

      {message && (
        <div style={{
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '12px',
          background: message.success ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: message.success ? '1px solid rgba(52, 211, 153, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
          color: message.success ? '#34d399' : '#f87171',
        }}>
          {message.text}
        </div>
      )}

      {isOpen && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '16px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '12px',
          marginTop: '4px',
        }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '120px' }}>
              <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 550 }}>Proveedor</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                style={{
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '8px',
                  color: '#f0f4ff',
                  fontSize: '13px',
                }}
              >
                <option value="gemini">Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="claude">Claude</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '200px' }}>
              <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 550 }}>Clave de API (API Key)</label>
              <input
                type="password"
                placeholder={hasKey ? 'Ingresa una nueva API Key para cambiar la actual' : 'AIzaSy... (Tu clave de API)'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                style={{
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#f0f4ff',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary btn-sm"
              style={{ padding: '6px 16px', fontSize: '12px' }}
            >
              {saving ? 'Guardando...' : 'Guardar Clave'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
