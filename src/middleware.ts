import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicPaths = [
    '/auth/',
    '/driver/',
    '/api/admin/register-company',
    '/api/payments/webhook',
    '/billing',
    '/_next/',
    '/favicon',
    '/index.html',
  ];

  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  const { data: userRow } = await sb
    .from('users')
    .select('is_active, role, company_id')
    .eq('id', session.user.id)
    .maybeSingle();

  if (userRow && !userRow.is_active) {
    const redirectUrl = new URL('/auth/login', request.url);
    redirectUrl.searchParams.set('reason', 'inactive');
    const res = NextResponse.redirect(redirectUrl);
    res.cookies.delete('sb-access-token');
    res.cookies.delete('sb-refresh-token');
    return res;
  }

  // Super admin → pas de vérification abonnement
  if (userRow?.role === 'super_admin') {
    return response;
  }

  // 🚧 MODE TEST — Vérification abonnement désactivée temporairement
  /*
  const protectedRoutes = ['/real-estate', '/logistics', '/admin'];
  if (protectedRoutes.some(p => pathname.startsWith(p)) && userRow?.company_id) {
    const { data: sub } = await sb
      .from('subscriptions')
      .select('status, trial_ends_at, current_period_end')
      .eq('company_id', userRow.company_id)
      .maybeSingle();

    if (sub) {
      const now = new Date();
      if (sub.status === 'trial' && new Date(sub.trial_ends_at) < now) {
        return NextResponse.redirect(new URL('/billing?reason=trial_expired', request.url));
      }
      if (sub.status === 'expired') {
        return NextResponse.redirect(new URL('/billing?reason=subscription_expired', request.url));
      }
    } else {
      return NextResponse.redirect(new URL('/billing?reason=no_subscription', request.url));
    }
  }
  */

  return response;
}

export const config = {
  matcher: [
    '/real-estate/:path*',
    '/logistics/:path*',
    '/super-admin/:path*',
    '/admin/:path*',
    '/tenant-portal/:path*',
  ],
};