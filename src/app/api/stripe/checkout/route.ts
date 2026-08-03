import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTeacherByEmail } from '@/lib/db';
import { createStripeCheckoutSession, PLANS, type PlanId } from '@/lib/stripe';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const teacher = await getTeacherByEmail(session.user.email);
    if (!teacher) {
      return NextResponse.json({ error: 'Docente no encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const { planId, selectedSubjects } = body as {
      planId: PlanId;
      selectedSubjects: Array<{ uacName: string; semester: number; component: string }>;
    };

    if (!planId) {
      return NextResponse.json({ error: 'planId requerido' }, { status: 400 });
    }

    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) {
      return NextResponse.json({ error: 'Plan no válido' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const checkoutSession = await createStripeCheckoutSession({
      teacherId: teacher.id as string,
      teacherEmail: session.user.email,
      planId,
      selectedSubjects: selectedSubjects || [],
      successUrl: `${appUrl}/es/suscripcion/exito?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/es/suscripcion?canceled=1`,
      existingCustomerId: undefined, // TODO: pasar stripe_customer_id si ya existe
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error('[Stripe Checkout] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
