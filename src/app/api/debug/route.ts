// Temporary diagnostic endpoint — REMOVE BEFORE PRODUCTION LAUNCH
// Visit: https://didactica-ia.vercel.app/api/debug
export async function GET() {
  const authUrl = process.env.AUTH_URL;
  const nextauthUrl = process.env.NEXTAUTH_URL;
  const vercelUrl = process.env.VERCEL_URL;

  const effectiveBase = authUrl || nextauthUrl || (vercelUrl ? `https://${vercelUrl}` : 'UNKNOWN');

  return Response.json({
    AUTH_URL: authUrl || '(not set)',
    NEXTAUTH_URL: nextauthUrl || '(not set)',
    VERCEL_URL: vercelUrl || '(not set)',
    NODE_ENV: process.env.NODE_ENV,
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasAuthSecret: !!process.env.AUTH_SECRET,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    expectedCallbackUrl: `${effectiveBase}/api/auth/callback/google`,
    note: 'This endpoint shows what URL NextAuth will use as base. Delete this file after debugging.',
  });
}
