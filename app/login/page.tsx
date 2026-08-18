'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { gsap } from 'gsap';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Animation Refs
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);

  // Set page defaults on mount
  useEffect(() => {
    document.title = "Login — Infinity Go Rentcar";
    
    // Initial entrance animation for form elements
    gsap.fromTo(formContainerRef.current, 
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, delay: 0.2, ease: 'power3.out' }
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Username atau password salah.');
      }

      // GSAP smooth transition timeline
      const tl = gsap.timeline({
        onComplete: () => {
          const callbackUrl = searchParams.get('callbackUrl') || '/dashboard2';
          router.push(callbackUrl);
          router.refresh();
        }
      });

      // 1. Fade out the form elements
      tl.to(formContainerRef.current, {
        opacity: 0,
        y: -25,
        duration: 0.35,
        ease: 'power2.in'
      });

      // 2. Pane sweep animation
      const isMobile = window.innerWidth <= 868;
      if (!isMobile) {
        tl.to(rightPaneRef.current, {
          xPercent: 100,
          opacity: 0,
          duration: 0.55,
          ease: 'power3.inOut'
        }, '-=0.15');
        tl.to(leftPaneRef.current, {
          flex: '10',
          duration: 0.55,
          ease: 'power3.inOut'
        }, '-=0.55');
      } else {
        tl.to(rightPaneRef.current, {
          opacity: 0,
          scale: 0.95,
          duration: 0.45,
          ease: 'power2.inOut'
        }, '-=0.15');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#ffffff',
      fontFamily: 'var(--font), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      width: '100%',
      overflow: 'hidden'
    }} className="login-page-container">
      {/* LEFT SIDE: Sleek Architectural Dark Image Background */}
      <div style={{
        flex: '1.2',
        position: 'relative',
        background: 'url("/images/login_bg.jpg") center/cover no-repeat',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '3rem',
        color: '#ffffff',
        transition: 'flex 0.55s ease',
      }} className="login-left-pane" ref={leftPaneRef}>
        {/* Top-Left Pill Overlay */}
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '50px',
            padding: '0.625rem 1.25rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: '#ffffff',
              color: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.75rem'
            }}>∞</div>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.2 }}>Superadmin Login</span>
              <span style={{ fontSize: '0.625rem', color: '#94a3b8', lineHeight: 1.2 }}>Setup Fleet, Manage Agreements & Contracts...</span>
            </div>
          </div>
        </div>

        {/* Bottom Left Branding & Copyrights */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.8125rem',
          color: 'rgba(255, 255, 255, 0.6)',
          width: '100%'
        }}>
          {/* Logo Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ffffff' }}>∞</span>
            <span style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#ffffff', letterSpacing: '-0.02em' }}>
              Infinity Go<span style={{ fontWeight: 300 }}>™</span>
            </span>
          </div>
          <div>
            <span>© Infinity Go Travel 2026</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Clean White Login Form */}
      <div style={{
        flex: '1',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '3.5rem 4rem',
        background: '#ffffff',
        position: 'relative',
        zIndex: 10
      }} className="login-right-pane" ref={rightPaneRef}>
        {/* Top Branding Header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', textAlign: 'left' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Infinity Go Travel™
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Sistem Manajemen Rental Mobil
          </span>
        </div>

        {/* Middle Form Body */}
        <div style={{ width: '100%', maxWidth: '420px', margin: 'auto 0' }} ref={formContainerRef}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 800,
            color: '#0f172a',
            lineHeight: '1.15',
            letterSpacing: '-0.03em',
            marginBottom: '2.25rem',
            textAlign: 'left'
          }}>
            Welcome, login to<br />your account.
          </h1>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                color: '#dc2626',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                fontSize: '0.8125rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                lineHeight: 1.4,
                textAlign: 'left'
              }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Username Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left' }}>
              <label htmlFor="username" style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155' }}>
                Username or Email Address:
              </label>
              <input
                id="username"
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="name@domain.com"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.875rem 1.25rem',
                  background: '#f1f5f9',
                  border: '1px solid transparent',
                  borderRadius: '100px',
                  color: '#0f172a',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'background-color 0.2s, border-color 0.2s',
                }}
                onFocus={(e) => {
                  e.target.style.backgroundColor = '#ffffff';
                  e.target.style.borderColor = '#0f172a';
                }}
                onBlur={(e) => {
                  e.target.style.backgroundColor = '#f1f5f9';
                  e.target.style.borderColor = 'transparent';
                }}
              />
            </div>

            {/* Password Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left' }}>
              <label htmlFor="password" style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155' }}>
                Password:
              </label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your Password"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.875rem 3.5rem 0.875rem 1.25rem',
                    background: '#f1f5f9',
                    border: '1px solid transparent',
                    borderRadius: '100px',
                    color: '#0f172a',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'background-color 0.2s, border-color 0.2s',
                  }}
                  onFocus={(e) => {
                    e.target.style.backgroundColor = '#ffffff';
                    e.target.style.borderColor = '#0f172a';
                  }}
                  onBlur={(e) => {
                    e.target.style.backgroundColor = '#f1f5f9';
                    e.target.style.borderColor = 'transparent';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '1.25rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                  }}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Action Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '0.75rem',
              width: '100%'
            }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '0.875rem 2.25rem',
                  background: '#0f172a',
                  border: 'none',
                  borderRadius: '100px',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'opacity 0.2s',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                {loading ? 'Processing...' : 'Sign In Here'}
              </button>

              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Silakan hubungi administrator IT untuk mereset password.');
                }}
                style={{
                  fontSize: '0.8125rem',
                  color: '#0f172a',
                  fontWeight: 600,
                  textDecoration: 'underline'
                }}
              >
                Lost your password?
              </a>
            </div>
          </form>
        </div>

        {/* Right Pane Bottom Footer */}
        <div style={{ textAlign: 'left', fontSize: '0.75rem', color: '#64748b' }}>
          <span>www.infinitygotravel.co</span>
        </div>
      </div>

      {/* Inline styles for responsive layout */}
      <style jsx global>{`
        @media (max-width: 868px) {
          .login-left-pane {
            display: none !important;
          }
          .login-right-pane {
            padding: 3rem 2rem !important;
            flex: 1 !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffffff',
        color: '#0f172a',
        fontFamily: 'var(--font)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite', color: '#0f172a' }}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }}></circle>
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Loading...</span>
        </div>
        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    }>
      <LoginFormContent />
    </Suspense>
  );
}
