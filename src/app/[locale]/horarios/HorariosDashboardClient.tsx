'use client';

import { useState } from 'react';

interface Props {
  isDirector: boolean;
  teacherName: string;
}

export default function HorariosDashboardClient({ isDirector, teacherName }: Props) {
  const [modalMode, setModalMode] = useState<'semiautomatic' | 'free' | 'chat' | null>(null);

  return (
    <>
      {!isDirector ? (
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
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginTop: 20 }}>
          {/* Card 1: Modo Semiautomático (MCCEMS) */}
          <div style={{
            background: '#131324', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✨</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#60a5fa', marginBottom: 8 }}>
                Modo Semiautomático (MCCEMS 2026-2027)
              </h3>
              <p style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.5, marginBottom: 20 }}>
                Genera la plantilla horaria precargando automáticamente las asignaturas, horas semanales y contenidos oficiales del Marco Curricular Común de la DBEPA Puebla.
              </p>
            </div>
            <button
              onClick={() => alert('¡El Asistente Semiautomático de Horarios MCCEMS está listo para iniciar la confección!')}
              style={{
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff',
                border: 'none', borderRadius: 8, padding: '12px 18px', fontSize: 14,
                fontWeight: 600, cursor: 'pointer', textAlign: 'center'
              }}
            >
              🚀 Iniciar Horario Semiautomático
            </button>
          </div>

          {/* Card 2: Modo Libre / Tecnológicos */}
          <div style={{
            background: '#131324', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🛠️</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#c084fc', marginBottom: 8 }}>
                Modo Libre / Tecnológicos (CBTIS / CECYTE)
              </h3>
              <p style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.5, marginBottom: 20 }}>
                Configura docentes, grupos, materias e intensidades horarias independientes. Ideal para bachilleratos con formación técnica o talleres especiales.
              </p>
            </div>
            <button
              onClick={() => alert('¡El Asistente de Horarios Libre y Tecnológicos está listo!')}
              style={{
                background: 'rgba(255,255,255,0.1)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '12px 18px', fontSize: 14,
                fontWeight: 600, cursor: 'pointer', textAlign: 'center'
              }}
            >
              ⚙️ Iniciar Horario Libre
            </button>
          </div>

          {/* Card 3: Chatbot Co-Piloto de Horarios */}
          <div style={{
            background: '#131324', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#4ade80', marginBottom: 8 }}>
                Asistente Co-Piloto de Horarios
              </h3>
              <p style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.5, marginBottom: 20 }}>
                Conversa con la IA para indicar restricciones en lenguaje natural (ej. *"Darle los viernes libres al profesor Ramírez"*) y validar factibilidad matemática.
              </p>
            </div>
            <button
              onClick={() => alert('El Co-Piloto IA de Horarios está disponible en las herramientas de construcción.')}
              style={{
                background: 'rgba(74,222,128,0.15)', color: '#4ade80',
                border: '1px solid rgba(74,222,128,0.3)', borderRadius: 8, padding: '12px 18px', fontSize: 14,
                fontWeight: 600, cursor: 'pointer', textAlign: 'center'
              }}
            >
              💬 Probar Co-Piloto IA
            </button>
          </div>
        </div>
      )}
    </>
  );
}
