'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PLANS } from '@/lib/stripe';

type Plan = typeof PLANS[number];

interface SubscriptionInfo {
  id: string;
  planName: string;
  planSubjects: number;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
}

interface SubjectInfo {
  id: string;
  uacName: string;
  semester: number;
  component: string;
}

interface Props {
  locale: string;
  plans: Plan[];
  extraSubjectPriceMXN: number;
  currentSubscription: SubscriptionInfo | null;
  currentSubjects: SubjectInfo[];
  canceled: boolean;
  teacherSchool: string;
}

export default function SuscripcionClient({
  locale,
  plans,
  extraSubjectPriceMXN,
  currentSubscription,
  currentSubjects,
  canceled,
  teacherSchool,
}: Props) {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [managingPortal, setManagingPortal] = useState(false);

  const handleSubscribe = async (planId: string) => {
    setSelectedPlan(planId);
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, selectedSubjects: [] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear sesión de pago');
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar el pago');
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  const handleManagePortal = async () => {
    setManagingPortal(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setManagingPortal(false);
    }
  };

  const planColors: Record<string, string> = {
    basico: '#6366f1',
    estandar: '#10b981',
    avanzado: '#f59e0b',
    completo: '#f43f5e',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0d1530 0%, #080c18 60%, #020408 100%)',
      backgroundAttachment: 'fixed',
      padding: '40px 24px',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🎓</div>
          <h1 style={{
            fontSize: 34, fontWeight: 800, color: '#f0f4ff',
            letterSpacing: '-0.8px', marginBottom: 12,
          }}>
            Elige tu plan de DidácticaIA
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(240,244,255,0.55)', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
            Paga por las materias que necesitas planear. Revisiones, ajustes y
            descargas <strong style={{ color: '#818cf8' }}>ilimitadas</strong> para las materias de tu plan.
          </p>
          {teacherSchool && (
            <div style={{
              display: 'inline-block',
              marginTop: 16,
              padding: '6px 16px',
              background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 20,
              fontSize: 13, color: '#818cf8',
            }}>
              🏫 {teacherSchool}
            </div>
          )}
        </div>

        {/* Canceled Alert */}
        {canceled && (
          <div style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 12, padding: '16px 20px',
            marginBottom: 32, fontSize: 14, color: '#fcd34d',
            display: 'flex', gap: 12, alignItems: 'center',
          }}>
            ⚠️ <span>Pago cancelado. Tu suscripción no fue activada. Puedes intentarlo de nuevo.</span>
          </div>
        )}

        {/* Suscripción actual */}
        {currentSubscription && (
          <div style={{
            background: 'rgba(16,185,129,0.06)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 16, padding: '24px',
            marginBottom: 40,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <p style={{ fontSize: 12, color: 'rgba(240,244,255,0.45)', marginBottom: 6 }}>SUSCRIPCIÓN ACTIVA</p>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#f0f4ff', marginBottom: 4 }}>
                  Plan {currentSubscription.planName.charAt(0).toUpperCase() + currentSubscription.planName.slice(1)}
                </h3>
                <p style={{ fontSize: 13, color: 'rgba(240,244,255,0.55)' }}>
                  {currentSubscription.planSubjects} materia{currentSubscription.planSubjects !== 1 ? 's' : ''} · {' '}
                  {currentSubscription.currentPeriodEnd
                    ? `Renueva el ${new Date(currentSubscription.currentPeriodEnd).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}`
                    : 'Activa'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {currentSubjects.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {currentSubjects.map((s) => (
                      <span key={s.id} style={{
                        padding: '4px 12px',
                        background: 'rgba(16,185,129,0.12)',
                        border: '1px solid rgba(16,185,129,0.25)',
                        borderRadius: 20, fontSize: 12, color: '#34d399',
                      }}>
                        {s.uacName}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  onClick={handleManagePortal}
                  disabled={managingPortal}
                  style={{
                    padding: '10px 20px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 10, color: '#f0f4ff',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {managingPortal ? '⏳...' : '⚙️ Gestionar suscripción'}
                </button>
                <button
                  onClick={() => router.push(`/${locale}/dashboard`)}
                  style={{
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                    border: 'none', borderRadius: 10, color: '#fff',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Ir al dashboard →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(244,63,94,0.08)',
            border: '1px solid rgba(244,63,94,0.2)',
            borderRadius: 10, padding: '14px 18px',
            fontSize: 14, color: '#f87171', marginBottom: 24,
          }}>
            ❌ {error}
          </div>
        )}

        {/* Plans Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 20,
          marginBottom: 40,
        }}>
          {plans.map((plan) => {
            const accentColor = planColors[plan.id] || '#6366f1';
            const isPopular = 'popular' in plan && plan.popular;
            const isCurrent = currentSubscription?.planName === plan.id;
            const isLoading = loading && selectedPlan === plan.id;

            return (
              <div
                key={plan.id}
                style={{
                  position: 'relative',
                  background: isCurrent
                    ? `rgba(${accentColor === '#10b981' ? '16,185,129' : '99,102,241'},0.08)`
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isCurrent ? accentColor + '50' : isPopular ? accentColor + '40' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 20,
                  padding: '28px 24px',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer',
                  transform: isPopular ? 'scale(1.03)' : 'none',
                  boxShadow: isPopular ? `0 8px 40px ${accentColor}25` : '0 4px 20px rgba(0,0,0,0.3)',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = isPopular ? 'scale(1.03)' : 'none'; }}
              >
                {/* Popular badge */}
                {isPopular && (
                  <div style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    background: `linear-gradient(135deg, ${accentColor}, #10b981)`,
                    borderRadius: 20, padding: '4px 16px',
                    fontSize: 11, fontWeight: 700, color: '#fff',
                    whiteSpace: 'nowrap',
                  }}>
                    ⭐ MÁS POPULAR
                  </div>
                )}

                {isCurrent && (
                  <div style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    background: `linear-gradient(135deg, #10b981, #059669)`,
                    borderRadius: 20, padding: '4px 16px',
                    fontSize: 11, fontWeight: 700, color: '#fff',
                    whiteSpace: 'nowrap',
                  }}>
                    ✅ PLAN ACTUAL
                  </div>
                )}

                {/* Plan header */}
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `${accentColor}20`,
                  border: `1px solid ${accentColor}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, marginBottom: 16,
                }}>
                  {plan.id === 'basico' ? '📗' : plan.id === 'estandar' ? '📘' : plan.id === 'avanzado' ? '📙' : '📕'}
                </div>

                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f0f4ff', marginBottom: 4 }}>
                  {plan.name}
                </h3>
                <p style={{ fontSize: 13, color: 'rgba(240,244,255,0.45)', marginBottom: 20 }}>
                  {plan.description}
                </p>

                {/* Price */}
                <div style={{ marginBottom: 24 }}>
                  <span style={{ fontSize: 38, fontWeight: 800, color: accentColor }}>
                    ${plan.priceMonthlyMXN}
                  </span>
                  <span style={{ fontSize: 13, color: 'rgba(240,244,255,0.45)' }}> MXN/mes</span>
                </div>

                {/* Features */}
                <ul style={{ listStyle: 'none', padding: 0, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {plan.features.map((f, i) => (
                    <li key={i} style={{
                      display: 'flex', gap: 8, alignItems: 'flex-start',
                      fontSize: 13, color: 'rgba(240,244,255,0.7)',
                    }}>
                      <span style={{ color: accentColor, flexShrink: 0, marginTop: 1 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => !isCurrent && handleSubscribe(plan.id)}
                  disabled={loading || isCurrent}
                  style={{
                    width: '100%', padding: '13px',
                    background: isCurrent
                      ? 'rgba(16,185,129,0.15)'
                      : isLoading
                      ? 'rgba(99,102,241,0.3)'
                      : `linear-gradient(135deg, ${accentColor}dd, ${accentColor})`,
                    border: isCurrent ? `1px solid rgba(16,185,129,0.3)` : 'none',
                    borderRadius: 12, color: isCurrent ? '#34d399' : '#fff',
                    fontSize: 14, fontWeight: 700,
                    cursor: isCurrent || loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: isCurrent || loading ? 'none' : `0 4px 20px ${accentColor}40`,
                  }}
                >
                  {isCurrent ? '✅ Plan actual' : isLoading ? '⏳ Redirigiendo...' : 'Suscribirme ahora →'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Extra Subject Info */}
        <div style={{
          background: 'rgba(99,102,241,0.05)',
          border: '1px solid rgba(99,102,241,0.15)',
          borderRadius: 16, padding: '20px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 16, marginBottom: 40,
        }}>
          <div>
            <h4 style={{ fontSize: 16, fontWeight: 700, color: '#f0f4ff', marginBottom: 4 }}>
              ➕ Materia adicional
            </h4>
            <p style={{ fontSize: 13, color: 'rgba(240,244,255,0.5)' }}>
              ¿Necesitas una materia extra fuera de tu plan? Agrégala por un pago único mensual.
            </p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: '#818cf8' }}>
              ${extraSubjectPriceMXN}
            </span>
            <span style={{ fontSize: 12, color: 'rgba(240,244,255,0.4)' }}> MXN/mes</span>
          </div>
        </div>

        {/* Guarantees */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16, marginBottom: 32,
        }}>
          {[
            { icon: '🔒', title: 'Pago seguro', desc: 'Procesado por Stripe con cifrado SSL' },
            { icon: '🔄', title: 'Cancela cuando quieras', desc: 'Sin compromisos ni penalidades' },
            { icon: '📲', title: 'Acceso inmediato', desc: 'Actívate al instante tras el pago' },
            { icon: '🇲🇽', title: 'MXN nativo', desc: 'Precios en pesos mexicanos, sin sorpresas' },
          ].map((g) => (
            <div key={g.title} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 12, padding: '16px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{g.icon}</div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#f0f4ff', marginBottom: 4 }}>{g.title}</p>
              <p style={{ fontSize: 12, color: 'rgba(240,244,255,0.4)' }}>{g.desc}</p>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(240,244,255,0.2)' }}>
          DidácticaIA · DBEPA Puebla 2026-2027 · Los precios no incluyen IVA
        </p>
      </div>
    </div>
  );
}
