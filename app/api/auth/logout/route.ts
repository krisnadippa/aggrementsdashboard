import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const response = NextResponse.json({ success: true, redirectUrl: '/login' }, { status: 200 });
    
    // Clear session cookie by setting max-age to 0
    const isProd = process.env.NODE_ENV === 'production';
    response.cookies.set('session_token', '', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (err) {
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}
