'use client';
// src/components/feedback/GenerationFeedback.tsx
// Componente reutilizable: estrellas 1-5 + comentario opcional
// Uso: <GenerationFeedback entityType="planning" entityId={id} />
import { useState, useEffect } from 'react';

interface Props {
  entityType: 'planning' | 'paec' | 'pmc' | 'pips';
  entityId: string;
  /** Texto que aparece sobre las estrellas */
  label?: string;
}

export default function GenerationFeedback({
  entityType,
  entityId,
  label = '¿Qué tan útil fue esta generación?',
}: Props) {
  const [rating, setRating] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existing, setExisting] = useState<number | null>(null);

  // Carga feedback previo al montar
  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const res = await fetch(
          `/api/generation-feedback?entity_type=${entityType}&entity_id=${entityId}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.feedback?.rating) {
            setRating(data.feedback.rating);
            setComment(data.feedback.comment ?? '');
            setExisting(data.feedback.rating);
            setSaved(true);
          }
        }
      } catch {
        // silencioso
      }
    };
    fetchExisting();
  }, [entityType, entityId]);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/generation-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_type: entityType, entity_id: entityId, rating, comment }),
      });
      if (res.ok) {
        setSaved(true);
        setExisting(rating);
      }
    } finally {
      setLoading(false);
    }
  };

  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="feedback-widget">
      <p className="feedback-label">{label}</p>

      {/* Estrellas */}
      <div className="feedback-stars" role="group" aria-label="Calificación">
        {stars.map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`${star} estrella${star > 1 ? 's' : ''}`}
            className={`feedback-star ${(hover || rating) >= star ? 'active' : ''}`}
            onClick={() => { setSaved(false); setRating(star); }}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
          >
            ★
          </button>
        ))}
      </div>

      {/* Muestra etiqueta de calificación */}
      {rating > 0 && (
        <p className="feedback-hint">
          {['', 'Necesita mejorar', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'][rating]}
        </p>
      )}

      {/* Comentario */}
      {rating > 0 && !saved && (
        <div className="feedback-comment-area">
          <textarea
            className="feedback-textarea"
            rows={2}
            placeholder="Comentario opcional (p. ej. qué mejorarías)…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={300}
          />
          <button
            type="button"
            className="feedback-submit"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Guardando…' : 'Guardar evaluación'}
          </button>
        </div>
      )}

      {/* Confirmación */}
      {saved && existing !== null && (
        <p className="feedback-saved">
          ✓ Evaluación guardada ({existing}/5).{' '}
          <button
            type="button"
            className="feedback-edit-btn"
            onClick={() => setSaved(false)}
          >
            Editar
          </button>
        </p>
      )}

      <style jsx>{`
        .feedback-widget {
          padding: 12px 16px;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          background: rgba(255,255,255,0.03);
          margin-top: 16px;
        }
        .feedback-label {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.55);
          margin-bottom: 8px;
        }
        .feedback-stars {
          display: flex;
          gap: 4px;
          margin-bottom: 6px;
        }
        .feedback-star {
          background: none;
          border: none;
          font-size: 1.6rem;
          cursor: pointer;
          color: rgba(255,255,255,0.2);
          transition: color 0.15s, transform 0.1s;
          padding: 0;
          line-height: 1;
        }
        .feedback-star.active {
          color: #f59e0b;
        }
        .feedback-star:hover {
          transform: scale(1.15);
        }
        .feedback-hint {
          font-size: 0.75rem;
          color: #f59e0b;
          margin-bottom: 8px;
        }
        .feedback-comment-area {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .feedback-textarea {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px;
          color: #fff;
          padding: 8px 10px;
          font-size: 0.8rem;
          resize: none;
          width: 100%;
        }
        .feedback-textarea::placeholder { color: rgba(255,255,255,0.3); }
        .feedback-submit {
          align-self: flex-end;
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          border: none;
          border-radius: 8px;
          color: #fff;
          cursor: pointer;
          font-size: 0.8rem;
          padding: 6px 14px;
          transition: opacity 0.2s;
        }
        .feedback-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .feedback-saved {
          font-size: 0.8rem;
          color: #34d399;
        }
        .feedback-edit-btn {
          background: none;
          border: none;
          color: rgba(255,255,255,0.4);
          cursor: pointer;
          font-size: 0.75rem;
          text-decoration: underline;
          padding: 0;
        }
      `}</style>
    </div>
  );
}
