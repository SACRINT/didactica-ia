import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { neon } from '@neondatabase/serverless';
import Link from 'next/link';

export default async function SuscripcionPage({ params }: { params: { locale: string } }) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect(`/${params.locale}/ingresar`);
  }

  const db = neon(process.env.DATABASE_URL!);
  const existing = await db`
    SELECT role, profile_completed
    FROM teachers
    WHERE email = ${session.user.email}
    LIMIT 1
  `;

  if (!existing.length || !existing[0].profile_completed) {
    redirect(`/${params.locale}/configurar-perfil`);
  }

  const teacher = existing[0];

  // Si es administrador, lo dejamos pasar al dashboard
  if (teacher.role === 'administrador') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #0d1530 0%, #080c18 60%, #020408 100%)',
        color: '#fff',
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
        padding: 24
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          padding: '40px',
          borderRadius: '24px',
          border: '1px solid rgba(99,102,241,0.3)',
          backdropFilter: 'blur(10px)',
          maxWidth: '500px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>👑</div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Acceso Administrativo</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '32px', lineHeight: '1.6' }}>
            Tu cuenta tiene rol de administrador. Tienes acceso completo a todas las funciones sin necesidad de una suscripción.
          </p>
          <Link href={`/${params.locale}/dashboard`} style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '12px',
            fontWeight: 'bold',
            transition: 'transform 0.2s',
          }}>
            Ir al Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const plans = [
    { name: 'Básico', price: 99, limit: 1, color: '#3b82f6', desc: 'Ideal para probar la herramienta en una sola materia.' },
    { name: 'Estándar', price: 249, limit: 3, color: '#8b5cf6', desc: 'Perfecto para la carga docente promedio.' },
    { name: 'Avanzado', price: 399, limit: 5, color: '#ec4899', desc: 'Para docentes con múltiples grupos y materias.' },
    { name: 'Completo', price: 699, limit: 10, color: '#f59e0b', desc: 'Solución total para tiempo completo.' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      padding: '60px 24px',
      background: 'linear-gradient(160deg, #0d1530 0%, #080c18 60%, #020408 100%)',
      color: '#fff',
      fontFamily: 'Inter, sans-serif'
    }}>
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
            <div key={plan.name} style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid rgba(255,255,255,0.08)`,
              borderRadius: '24px',
              padding: '32px 24px',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.3s, box-shadow 0.3s',
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-10px)';
              e.currentTarget.style.boxShadow = `0 20px 40px ${plan.color}30`;
              e.currentTarget.style.border = `1px solid ${plan.color}50`;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
              e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)';
            }}>
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
              
              <button style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseOver={(e) => e.currentTarget.style.background = plan.color}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >
                Suscribirme
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
