'use client';

import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
      const initial = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      setTheme(initial);
      document.documentElement.setAttribute('data-theme', initial);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <button 
      type="button" 
      onClick={toggleTheme} 
      className="theme-switch-btn" 
      aria-label="Ubah Tema"
      title={theme === 'light' ? 'Ganti ke Tema Gelap' : 'Ganti ke Tema Terang'}
      style={{
        background: 'var(--bg-hover)',
        border: '1px solid var(--border)',
        borderRadius: '30px',
        width: '64px',
        height: '32px',
        position: 'relative',
        cursor: 'pointer',
        padding: '2px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'all 0.3s ease',
        outline: 'none',
        boxSizing: 'border-box'
      }}
    >
      {/* Sun icon SVG */}
      <span style={{ fontSize: '11px', marginLeft: '6px', opacity: theme === 'light' ? 1 : 0.3, transition: 'opacity 0.3s', display: 'flex', alignItems: 'center' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#e53e3e' }}>
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.07" x2="5.64" y2="17.66"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
      </span>
      {/* Moon icon SVG */}
      <span style={{ fontSize: '11px', marginRight: '6px', opacity: theme === 'dark' ? 1 : 0.3, transition: 'opacity 0.3s', display: 'flex', alignItems: 'center' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#2563eb' }}>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      </span>
      {/* Toggle circle */}
      <span 
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: 'var(--accent)',
          position: 'absolute',
          top: '3px',
          left: theme === 'light' ? '3px' : '35px',
          transition: 'left 0.3s cubic-bezier(0.25, 0.8, 0.25, 1.25)',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff'
        }}
      >
        {/* Toggle center mark */}
        <span style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: '#ffffff',
          opacity: 0.8
        }} />
      </span>
    </button>
  );
}
