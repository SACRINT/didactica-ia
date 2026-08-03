import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16' as any,
    })
  : null;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { planId, planName, price } = await req.json();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    if (!process.env.STRIPE_SECRET_KEY || !stripe) {
      console.warn('No STRIPE_SECRET_KEY found. Mocking successful checkout.');
      // Si no hay key de stripe, simulamos el éxito para desarrollo
      return NextResponse.json({ url: `${appUrl}/es/dashboard?mock_success=true` });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: session.user.email,
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: `Suscripción DidácticaIA - Plan ${planName}`,
            },
            unit_amount: price * 100, // Stripe expects cents
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        teacher_email: session.user.email,
        plan_id: planId,
      },
      success_url: `${appUrl}/es/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/es/suscripcion`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
