import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(n: string) { return request.cookies.get(n)?.value; },
        set() {},
        remove() {},
      },
    }
  );

  const { data: { session } } = await sb.auth.getSession();
  const { pathname } = request.nextUrl;

  const isPublic = pathname.startsWith('/auth') || pathname.startsWith('/api');

  // Pas connecté → login
  if (!session && !isPublic) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Connecté sur root ou dashboard → vérifier is_active
  if (session && (pathname === '/' || pathname === '/dashboard')) {
    // Vérifier si le compte est actif
    const { data: userData } = await sb
      .from('users')
      .select('is_active, role')
      .eq('id', session.user.id)
      .maybeSingle();

    // Compte inactif → déconnecter et rediriger vers login
    if (userData && !userData.is_active && userData.role !== 'super_admin') {
      const response = NextResponse.redirect(new URL('/auth/login', request.url));
      // Supprimer les cookies de session
      response.cookies.delete('sb-access-token');
      response.cookies.delete('sb-refresh-token');
      return response;
    }

    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Connecté sur une page protégée → vérifier is_active
  if (session && !isPublic) {
    const { data: userData } = await sb
      .from('users')
      .select('is_active, role')
      .eq('id', session.user.id)
      .maybeSingle();

    if (userData && !userData.is_active && userData.role !== 'super_admin') {
      const response = NextResponse.redirect(new URL('/auth/login', request.url));
      response.cookies.delete('sb-access-token');
      response.cookies.delete('sb-refresh-token');
      return response;
    }
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};