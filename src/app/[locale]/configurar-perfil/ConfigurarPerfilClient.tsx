'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  locale: string;
  teacherName: string;
  teacherEmail: string;
  currentData: {
    schoolName: string;
    municipality: string;
    subsystem: string;
  };
}

const SUBSYSTEMS = [
  'Bachillerato General Estatal (BGE)',
  'Bachillerato General Digital (BGD)',
  'EMSAD',
  'COBAEP',
  'CECYTEP',
  'CONALEP',
  'Otro',
];

export default function ConfigurarPerfilClient({ locale, teacherName, teacherEmail, currentData }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    schoolName: currentData.schoolName || '',
    municipality: currentData.municipality || '',
    subsystem: currentData.subsystem || '',
    teacherFullName: teacherName || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.schoolName.trim() || !form.municipality.trim() || !form.subsystem) {
      setError('Por favor completa todos los campos.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/teacher-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName: form.schoolName.trim(),
          municipality: form.municipality.trim(),
          subsystem: form.subsystem,
          name: form.teacherFullName.trim(),
          lockProfile: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar');
      }
      router.push(`/${locale}/suscripcion`);
    } catch (err: any) {
      setError(err.message || 'Error al guardar. Intenta de nuevo.');
      setSaving(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(160deg, #0d1530 0%, #080c18 60%, #020408 100%)',
      backgroundAttachment: 'fixed',
      padding: '24px',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 540 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📚</div>
          <h1 style={{
            fontSize: 28, fontWeight: 800, color: '#f0f4ff',
            letterSpacing: '-0.5px', marginBottom: 8,
          }}>
            Configura tu perfil docente
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(240,244,255,0.55)', lineHeight: 1.6 }}>
            Esta información es <strong style={{ color: '#818cf8' }}>permanente</strong> y vincula
            tus planeaciones a tu escuela. Solo podrás cambiarla con un pago adicional.
          </p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20,
          padding: '36px 32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}>
          {/* Warning Banner */}
          <div style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 28,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <p style={{ fontSize: 13, color: '#fcd34d', lineHeight: 1.5, margin: 0 }}>
              <strong>Importante:</strong> Una vez guardado, el nombre de tu escuela y subsistema
              quedarán bloqueados. Esto evita que la plataforma sea usada para generar
              planeaciones de múltiples escuelas con una sola cuenta.
            </p>
          </div>

          {/* Nombre completo */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(240,244,255,0.7)', marginBottom: 8 }}>
              Nombre completo del docente
            </label>
            <input
              type="text"
              value={form.teacherFullName}
              onChange={(e) => setForm({ ...form, teacherFullName: e.target.value })}
              placeholder="Ej: María González Pérez"
              style={{
                width: '100%', padding: '12px 16px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10, color: '#f0f4ff', fontSize: 15,
                outline: 'none', transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#6366f1'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
            />
          </div>

          {/* Subsistema */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(240,244,255,0.7)', marginBottom: 8 }}>
              Subsistema educativo *
            </label>
            <select
              value={form.subsystem}
              onChange={(e) => setForm({ ...form, subsystem: e.target.value })}
              required
              style={{
                width: '100%', padding: '12px 16px',
                background: 'rgba(13,21,48,0.9)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10, color: form.subsystem ? '#f0f4ff' : 'rgba(240,244,255,0.35)',
                fontSize: 15, cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="">Selecciona tu subsistema...</option>
              {SUBSYSTEMS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Nombre de escuela */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(240,244,255,0.7)', marginBottom: 8 }}>
              Nombre oficial de tu plantel *
            </label>
            <input
              type="text"
              value={form.schoolName}
              onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
              placeholder="Ej: Bachillerato General Estatal No. 12"
              required
              style={{
                width: '100%', padding: '12px 16px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10, color: '#f0f4ff', fontSize: 15,
                outline: 'none', transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#6366f1'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
            />
          </div>

          {/* Municipio */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(240,244,255,0.7)', marginBottom: 8 }}>
              Municipio *
            </label>
            <input
              type="text"
              value={form.municipality}
              onChange={(e) => setForm({ ...form, municipality: e.target.value })}
              placeholder="Ej: Puebla de Zaragoza"
              required
              style={{
                width: '100%', padding: '12px 16px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10, color: '#f0f4ff', fontSize: 15,
                outline: 'none', transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#6366f1'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(244,63,94,0.1)',
              border: '1px solid rgba(244,63,94,0.25)',
              borderRadius: 8, padding: '10px 16px',
              fontSize: 13, color: '#f87171',
              marginBottom: 20,
            }}>
              {error}
            </div>
          )}

          {/* Email display (read-only) */}
          <div style={{
            background: 'rgba(99,102,241,0.06)',
            border: '1px solid rgba(99,102,241,0.15)',
            borderRadius: 8, padding: '10px 16px',
            fontSize: 12, color: 'rgba(240,244,255,0.45)',
            marginBottom: 24,
          }}>
            🔒 Cuenta vinculada: <strong style={{ color: 'rgba(240,244,255,0.65)' }}>{teacherEmail}</strong>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%', padding: '14px',
              background: saving ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #6366f1, #818cf8)',
              border: 'none', borderRadius: 12,
              color: '#fff', fontSize: 16, fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: saving ? 'none' : '0 4px 20px rgba(99,102,241,0.4)',
            }}
          >
            {saving ? '⏳ Guardando...' : '✅ Guardar y continuar →'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'rgba(240,244,255,0.25)' }}>
          DidácticaIA · DBEPA Puebla 2026-2027
        </p>
      </div>
    </div>
  );
}
