import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from './lib/auth-crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'ab43878b27f12e879a83d735fb29dc0a10c92f15a31a90c0a8767b45451bfd7890cf2c';

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Exclude public assets, auth APIs, Next.js assets, and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') || 
    pathname.startsWith('/images') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/customer-sign') ||
    pathname.startsWith('/invoice/')
  ) {
    return NextResponse.next();
  }

  // Allow public access to GET (single sign contract) and POST (signature/photo uploads)
  if (pathname === '/api/sign-data') {
    const id = req.nextUrl.searchParams.get('id');
    const method = req.method;
    
    // GET with ID (customer sign prefill) and POST with ID (customer signature upload) are public.
    // POST without ID (dashboard contract creation) and DELETE require active admin sessions.
    if ((method === 'POST' && id) || (method === 'GET' && id)) {
      return NextResponse.next();
    }
  }

  // 2. Retrieve and verify the cookie-based session token
  const token = req.cookies.get('session_token')?.value;
  let isValidSession = false;

  if (token) {
    const payload = await verifyJWT(token, JWT_SECRET);
    if (payload) {
      isValidSession = true;
    }
  }

  // 3. Handle routing based on session validity
  if (pathname === '/login') {
    if (isValidSession) {
      return NextResponse.redirect(new URL('/dashboard2', req.url));
    }
    return NextResponse.next();
  }

  if (!isValidSession) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Apply proxy globally
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
