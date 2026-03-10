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

  // Not logged in and trying to access protected page → login
  if (!session && !isPublic) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Logged in and on root or dashboard → redirect to login to let app handle routing
  if (session && (pathname === '/' || pathname === '/dashboard')) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};