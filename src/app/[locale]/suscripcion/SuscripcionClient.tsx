'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  locale: string;
}

export default function SuscripcionClient({ locale }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const plans = [
    { id: 'basic', name: 'Básico', price: 99, limit: 1, color: '#3b82f6', desc: 'Ideal para probar la herramienta en una sola materia.' },
    { id: 'standard', name: 'Estándar', price: 249, limit: 3, color: '#8b5cf6', desc: 'Perfecto para la carga docente promedio.' },
    { id: 'advanced', name: 'Avanzado', price: 399, limit: 5, color: '#ec4899', desc: 'Para docentes con múltiples grupos y materias.' },
    { id: 'complete', name: 'Completo', price: 699, limit: 10, color: '#f59e0b', desc: 'Solución total para tiempo completo.' },
  ];

  const handleSubscribe = async (planId: string, planName: string, price: number) => {
    try {
      setLoading(planId);
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, planName, price }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Error al procesar el pago');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      padding: '60px 24px',
      background: 'linear-gradient(160deg, #0d1530 0%, #080c18 60%, #020408 100%)',
      color: '#fff',
      fontFamily: 'Inter, sans-serif'
    }}>
      <style>{`
        .plan-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          padding: 32px 24px;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: transform 0.3s, box-shadow 0.3s, border-color 0.3s;
          cursor: pointer;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .plan-card:hover {
          transform: translateY(-10px);
          box-shadow: var(--hover-shadow);
          border-color: var(--hover-border);
        }
        .plan-btn {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          background: rgba(255,255,255,0.1);
          border: none;
          color: #fff;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.2s, opacity 0.2s;
        }
        .plan-card:hover .plan-btn:not(:disabled) {
          background: var(--hover-bg);
        }
        .plan-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h1 style={{ fontSize: '42px', fontWeight: 800, marginBottom: '16px', background: 'linear-gradient(to right, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Elige tu plan de Suscripción Mensual
          </h1>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.6)', maxWidth: '600px', margin: '0 auto' }}>
            Accede a la generación ilimitada de planeaciones para tus materias seleccionadas. 
            Todas las planeaciones están alineadas a la NEM (Generación 2025-2028).
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '24px',
          alignItems: 'stretch'
        }}>
          {plans.map((plan) => (
            <div key={plan.name} className="plan-card" style={{
              '--hover-shadow': `0 20px 40px ${plan.color}30`,
              '--hover-border': `${plan.color}50`
            } as any}>
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, height: '4px',
                background: plan.color
              }}></div>
              
              <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: plan.color }}>
                {plan.name}
              </h3>
              
              <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '16px' }}>
                <span style={{ fontSize: '42px', fontWeight: 'bold' }}>${plan.price}</span>
                <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', marginLeft: '4px' }}>/mes</span>
              </div>
              
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginBottom: '32px', flexGrow: 1 }}>
                {plan.desc}
              </p>
              
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0' }}>
                <li style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', fontSize: '14px' }}>
                  <span style={{ color: plan.color, marginRight: '8px' }}>✓</span>
                  Hasta <strong>&nbsp;{plan.limit}&nbsp;{plan.limit === 1 ? 'materia' : 'materias'}</strong>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', fontSize: '14px' }}>
                  <span style={{ color: plan.color, marginRight: '8px' }}>✓</span>
                  Descarga ilimitada en PDF
                </li>
                <li style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                  <span style={{ color: plan.color, marginRight: '8px' }}>✓</span>
                  Soporte técnico
                </li>
              </ul>
              
              <button 
                className="plan-btn" 
                style={{ '--hover-bg': plan.color } as any}
                onClick={() => handleSubscribe(plan.id, plan.name, plan.price)}
                disabled={loading === plan.id}
              >
                {loading === plan.id ? 'Procesando...' : 'Suscribirme'}
              </button>
            </div>
          ))}
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '60px' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
            Pagos procesados de forma segura mediante Stripe. Cancela en cualquier momento.
          </p>
        </div>
      </div>
    </div>
  );
}

