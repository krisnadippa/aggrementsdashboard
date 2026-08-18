import { NextRequest, NextResponse } from 'next/server';
import { sql, initDb } from '@/lib/db';
import { verifyPassword, signJWT } from '@/lib/auth-crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'ab43878b27f12e879a83d735fb29dc0a10c92f15a31a90c0a8767b45451bfd7890cf2c';
const SESSION_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours

export async function POST(req: NextRequest) {
  // Timing attack mitigation: ensure we take roughly the same amount of time
  const startTime = Date.now();
  const ensureDelay = async (shouldDelay: boolean) => {
    if (!shouldDelay) return;
    const elapsed = Date.now() - startTime;
    const targetDelay = 800 + Math.random() * 400; // ~800-1200ms
    if (elapsed < targetDelay) {
      await new Promise((resolve) => setTimeout(resolve, targetDelay - elapsed));
    }
  };

  try {
    if (!sql) {
      return NextResponse.json({ error: 'Database is not configured' }, { status: 500 });
    }

    // Auto-create database tables & seed user if empty on request if not done
    await initDb();

    const { username, password } = await req.json();

    // 1. Strict Input Validation
    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      await ensureDelay(true);
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 });
    }

    // 2. Query user utilizing tagged template (prevents SQL Injection)
    const users = await sql`SELECT id, username, password_hash FROM users WHERE username = ${username.trim()}`;

    if (users.length === 0) {
      // User not found. Fake verification process to avoid timing leak.
      verifyPassword(password, 'fake_salt:fake_hash_value_that_fails');
      await ensureDelay(true);
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    const user = users[0];

    // 3. Securely verify password hash
    const isValid = verifyPassword(password, user.password_hash);
    if (!isValid) {
      await ensureDelay(true);
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    // 4. Generate Edge-compatible JWT payload
    const expiry = Math.floor(Date.now() / 1000) + SESSION_EXPIRY_SECONDS;
    const sessionToken = await signJWT(
      {
        userId: user.id,
        username: user.username,
        exp: expiry,
      },
      JWT_SECRET
    );

    // 5. Create secure HTTP-Only Cookie Response
    const response = NextResponse.json({ success: true, redirectUrl: '/dashboard2' }, { status: 200 });
    
    const isProd = process.env.NODE_ENV === 'production';
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: '/',
      maxAge: SESSION_EXPIRY_SECONDS,
    });

    return response;
  } catch (err) {
    console.error('[API Login Error]:', err);
    await ensureDelay(true);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}
