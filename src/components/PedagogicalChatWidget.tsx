'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  RefreshCw,
  Trash2,
  Volume2,
  Play,
  Pause,
  Square,
  Bot
} from 'lucide-react';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const PREGUNTAS_SUGERIDAS = [
  '¿Cómo estructurar los 3 momentos de una Secuencia Didáctica?',
  '¿Cómo vincular mi planeación con el PAEC comunitario?',
  '¿Qué instrumentos de evaluación formativa sugiere el MCCEMS?',
  '¿Cómo formular propósitos formativos y metas de aprendizaje?'
];

function TTSControls({ text }: { text: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const charIndexRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (utteranceRef.current) {
        utteranceRef.current.onend = null;
        utteranceRef.current.onerror = null;
        utteranceRef.current.onboundary = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handlePlay = (rate: number, startPos: number = 0) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
      utteranceRef.current.onboundary = null;
    }
    window.speechSynthesis.cancel();

    // Pequeño retardo para procesar el cancel() en los navegadores
    setTimeout(() => {
      const remainingText = text.substring(startPos);
      if (!remainingText.trim()) {
        setIsPlaying(false);
        setIsPaused(false);
        charIndexRef.current = 0;
        return;
      }

      const utterance = new SpeechSynthesisUtterance(remainingText);
      utteranceRef.current = utterance;
      utterance.lang = 'es-MX';
      utterance.rate = rate;

      utterance.onboundary = (e) => {
        charIndexRef.current = startPos + e.charIndex;
      };

      utterance.onend = () => {
        setIsPlaying(false);
        setIsPaused(false);
        charIndexRef.current = 0;
      };

      utterance.onerror = (e: any) => {
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.error('TTS error:', e);
          setIsPlaying(false);
          setIsPaused(false);
        }
      };

      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
      setIsPaused(false);
    }, 120);
  };

  const handlePlayPause = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isPlaying) {
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
    } else {
      handlePlay(speed, 0);
    }
  };

  const handleStop = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (utteranceRef.current) {
        utteranceRef.current.onend = null;
        utteranceRef.current.onerror = null;
      }
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
      charIndexRef.current = 0;
    }
  };

  const cycleSpeed = () => {
    const newSpeed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(newSpeed);
    if (isPlaying) {
      handlePlay(newSpeed, charIndexRef.current);
    }
  };

  if (!isPlaying) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          type="button"
          onClick={handlePlayPause}
          title="Escuchar respuesta con voz"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '2px 4px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.72rem',
            borderRadius: '4px',
            transition: 'color 0.2s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#60a5fa')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
        >
          <Volume2 style={{ width: '13px', height: '13px' }} />
          <span>Leer respuesta</span>
        </button>
        <button
          type="button"
          onClick={cycleSpeed}
          title="Velocidad de lectura"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '0.68rem',
            fontWeight: 700
          }}
        >
          {speed}x
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <button
        type="button"
        onClick={handlePlayPause}
        title={isPaused ? 'Reanudar' : 'Pausar'}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#60a5fa',
          cursor: 'pointer',
          padding: '2px 4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.72rem',
          fontWeight: 600
        }}
      >
        {isPaused ? <Play style={{ width: '13px', height: '13px' }} /> : <Pause style={{ width: '13px', height: '13px' }} />}
        <span>{isPaused ? 'Reanudar' : 'Pausar'}</span>
      </button>
      <button
        type="button"
        onClick={handleStop}
        title="Detener lectura"
        style={{
          background: 'transparent',
          border: 'none',
          color: '#f87171',
          cursor: 'pointer',
          padding: '2px 4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.72rem'
        }}
      >
        <Square style={{ width: '13px', height: '13px' }} />
        <span>Detener</span>
      </button>
      <button
        type="button"
        onClick={cycleSpeed}
        title="Velocidad de lectura"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '0.68rem',
          fontWeight: 700
        }}
      >
        {speed}x
      </button>
    </div>
  );
}

const GREETING_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: '¡Hola! 👋 Soy SIGPDA Bot, tu Asistente Técnico-Pedagógico de SIGPDA-EMS.\n\nPuedo orientarte en cualquier momento sobre secuencias didácticas, momentos metodológicos (apertura, desarrollo y cierre), rúbricas de evaluación formativa, vinculación con el PAEC o lineamientos del MCCEMS. ¿En qué te puedo apoyar hoy?'
};

export default function PedagogicalChatWidget({ uacContext, paecContext }: { uacContext?: string; paecContext?: string }) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING_MESSAGE]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (customText?: string) => {
    const textToSend = (customText || input).trim();
    if (!textToSend || loading) return;

    setInput('');
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: textToSend }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch('/api/pedagogical-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          uacContext,
          paecContext
        })
      });

      if (!res.ok) {
        throw new Error('Error al consultar al asistente pedagógico');
      }

      const data = await res.json();
      if (data.reply) {
        setMessages([
          ...newMessages,
          { role: 'assistant', content: data.reply }
        ]);
      }
    } catch (err: any) {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: '⚠️ Error de conexión con el Asistente SIGPDA Bot.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setMessages([
      {
        role: 'assistant',
        content: '👋 Conversación reiniciada. ¿En qué duda pedagógica o ajuste de tu planeación puedo apoyarte?'
      }
    ]);
  };

  return (
    <div style={{ position: 'fixed', bottom: '16px', right: '16px', zIndex: 9999, fontFamily: 'inherit' }}>
      {/* Panel Desplegable del Chat */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            right: 0,
            width: '390px',
            height: '570px',
            maxHeight: 'calc(100vh - 100px)',
            background: '#0f172a',
            borderRadius: '20px',
            border: '1px solid #334155',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'all 0.3s ease'
          }}
        >
          {/* Header del Chatbot */}
          <div
            style={{
              padding: '1rem 1.2rem',
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              borderBottom: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  padding: '0.45rem',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 12px rgba(37, 99, 235, 0.4)'
                }}
              >
                <Bot style={{ width: '20px', height: '20px', color: '#ffffff' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#ffffff', margin: 0, lineHeight: 1.2 }}>
                  SIGPDA Bot IA
                </h3>
                <span style={{ fontSize: '0.6875rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px #22c55e' }}></span>
                  MCCEMS • Asesor Pedagógico
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={handleClearHistory}
                title="Reiniciar conversación"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: 'none',
                  color: '#94a3b8',
                  padding: '0.4rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
              >
                <Trash2 style={{ width: '16px', height: '16px' }} />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                  }
                  setIsOpen(false);
                }}
                title="Cerrar"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.4rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s'
                }}
              >
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>
          </div>

          {/* Historial de Mensajes */}
          <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '88%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}
              >
                <div
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: m.role === 'user' ? '#2563eb' : '#1e293b',
                    color: '#f8fafc',
                    fontSize: '0.8125rem',
                    lineHeight: 1.55,
                    border: m.role === 'user' ? 'none' : '1px solid #334155',
                    whiteSpace: 'pre-wrap',
                    boxShadow: m.role === 'user' ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none'
                  }}
                >
                  {m.content}
                </div>

                {m.role === 'assistant' && (
                  <TTSControls text={m.content} />
                )}
              </div>
            ))}

            {loading && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  background: '#1e293b',
                  padding: '0.75rem 1rem',
                  borderRadius: '16px 16px 16px 4px',
                  border: '1px solid #334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#60a5fa',
                  fontSize: '0.8125rem'
                }}
              >
                <RefreshCw style={{ width: '15px', height: '15px', animation: 'spin 1s linear infinite' }} />
                <span>Consultando sugerencias pedagógicas...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Preguntas Sugeridas */}
          {messages.length <= 2 && (
            <div style={{ padding: '0.65rem 1rem', background: 'rgba(15,23,42,0.95)', borderTop: '1px solid #1e293b' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '0.45rem' }}>
                💡 Preguntas frecuentes sugeridas:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {PREGUNTAS_SUGERIDAS.map((preg, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(preg)}
                    style={{
                      textAlign: 'left',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      color: '#cbd5e1',
                      padding: '0.45rem 0.7rem',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      lineHeight: 1.3
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#60a5fa';
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#334155';
                      e.currentTarget.style.color = '#cbd5e1';
                    }}
                  >
                    {preg}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Formulario */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{
              padding: '0.85rem',
              background: '#1e293b',
              borderTop: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <input
              type="text"
              placeholder="Escribe tu duda pedagógica..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              style={{
                flex: 1,
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '10px',
                padding: '0.65rem 0.85rem',
                color: '#ffffff',
                fontSize: '0.8125rem',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              style={{
                background: input.trim() && !loading ? '#2563eb' : '#334155',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '0.65rem',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
              }}
            >
              <Send style={{ width: '16px', height: '16px' }} />
            </button>
          </form>
        </div>
      )}

      {/* Botón Flotante Principal Circular (FAB) */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={() => {
            if (isOpen && typeof window !== 'undefined' && 'speechSynthesis' in window) {
              window.speechSynthesis.cancel();
            }
            setIsOpen(!isOpen);
          }}
          title={isOpen ? 'Cerrar Asesor Didáctico' : 'Asesor Didáctico IA 24/7 (Clic para abrir)'}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: isOpen
              ? '#334155'
              : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: '#ffffff',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(37, 99, 235, 0.45)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            padding: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08)';
            e.currentTarget.style.boxShadow = '0 12px 25px rgba(37, 99, 235, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(37, 99, 235, 0.45)';
          }}
        >
          {isOpen ? (
            <X style={{ width: '22px', height: '22px' }} />
          ) : (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot style={{ width: '24px', height: '24px' }} />
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  width: '9px',
                  height: '9px',
                  background: '#22c55e',
                  borderRadius: '50%',
                  boxShadow: '0 0 6px #22c55e'
                }}
              ></span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
