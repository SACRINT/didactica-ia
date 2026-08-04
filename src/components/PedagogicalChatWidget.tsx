'use client';

import { useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function PedagogicalChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola! 👋 Soy DidactecaBot, tu asistente técnico-pedagógico. ¿En qué te puedo apoyar hoy con tus planeaciones o secuencias didácticas?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/pedagogical-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al conectar');
      setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
    } catch (err: any) {
      setMessages([...newMessages, { role: 'assistant', content: `⚠️ ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 900,
          background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
          color: '#fff', border: 'none', borderRadius: '50%',
          width: 56, height: 56, cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(37,99,235,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, transition: 'all 0.2s ease'
        }}
        title="Asistente Pedagógico IA"
      >
        {isOpen ? '✕' : '🤖'}
      </button>

      {/* Chat Box */}
      {isOpen && (
        <div style={{
          position: 'fixed', bottom: 90, right: 24, zIndex: 900,
          width: 360, height: 500, background: '#131324',
          border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px', background: 'rgba(255,255,255,0.04)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: '#2563eb',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16
            }}>
              🤖
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>DidactecaBot IA</div>
              <div style={{ fontSize: 11, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80' }} /> MCCEMS 2026-2027
              </div>
            </div>
          </div>

          {/* Messages list */}
          <div style={{ flex: 1, padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%', padding: '10px 14px', borderRadius: 12,
                  fontSize: 13, lineHeight: 1.4,
                  background: m.role === 'user' ? '#2563eb' : 'rgba(255,255,255,0.06)',
                  color: '#fff', border: m.role === 'assistant' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', fontSize: 12, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
                Escribiendo sugerencias pedagógicas...
              </div>
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={sendMessage} style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Escribe tu duda pedagógica..."
              style={{
                flex: 1, background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
                padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                background: '#2563eb', color: '#fff', border: 'none',
                borderRadius: 8, padding: '8px 14px', fontWeight: 600,
                fontSize: 13, cursor: 'pointer', opacity: loading || !input.trim() ? 0.5 : 1
              }}
            >
              Enviar
            </button>
          </form>
        </div>
      )}
    </>
  );
}
