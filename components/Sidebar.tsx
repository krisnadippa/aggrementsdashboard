'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

// Clean inline SVG Icons to replace emojis
const Icons = {
  Dashboard: () => (
    <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"></rect>
      <rect x="14" y="3" width="7" height="7"></rect>
      <rect x="14" y="14" width="7" height="7"></rect>
      <rect x="3" y="14" width="7" height="7"></rect>
    </svg>
  ),
  Rentals: () => (
    <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path>
      <circle cx="7" cy="17" r="2"></circle>
      <path d="M9 17h6"></path>
      <circle cx="17" cy="17" r="2"></circle>
    </svg>
  ),
  Logout: () => (
    <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <polyline points="16 17 21 12 16 7"></polyline>
      <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  ),
  ChevronRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  )
};

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false); // Mobile drawer open/close
  const [isCollapsed, setIsCollapsed] = useState(false); // Desktop collapse

  // Toggle class on body when collapsed state changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (isCollapsed) {
        document.body.classList.add('sidebar-collapsed');
      } else {
        document.body.classList.remove('sidebar-collapsed');
      }
    }
  }, [isCollapsed]);

  const menuItems = [
    { href: '/', label: 'Dashboard', icon: <Icons.Dashboard /> },
    { href: '/dashboard2', label: 'Dashboard 2', icon: <Icons.Dashboard /> },
    { href: '/history', label: 'Rental', icon: <Icons.Rentals /> },
  ];

  const isActive = (href: string) => {
    return href === '/' ? pathname === '/' : pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <header className="mobile-header no-print">
        <Link href="/" className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src="/images/logo.png" alt="Infinity Go" style={{ height: '32px', width: 'auto' }} />
            <span style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
              Infinity Go Travel
            </span>
          </div>
        </Link>
        <button
          className="sidebar-toggle"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Buka menu"
        >
          <span className={`toggle-line ${isOpen ? 'toggle-open' : ''}`} />
          <span className={`toggle-line ${isOpen ? 'toggle-open' : ''}`} />
          <span className={`toggle-line ${isOpen ? 'toggle-open' : ''}`} />
        </button>
      </header>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="sidebar-backdrop no-print"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar navigation */}
      <aside className={`sidebar no-print ${isOpen ? 'sidebar-open' : ''} ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        
        {/* Brand Section */}
        <div className="sidebar-brand">
          <Link href="/" className="sidebar-logo" onClick={() => setIsOpen(false)}>
            {isCollapsed ? (
              <span className="logo-symbol" style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--accent)' }}>∞</span>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <img src="/images/logo.png" alt="Infinity Go Logo" style={{ height: '36px', width: 'auto', display: 'block' }} />
                <span style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                  Infinity Go Travel
                </span>
              </div>
            )}
          </Link>
          
          {/* Collapse Button (Only visible on desktop) */}
          <button
            type="button"
            className="sidebar-collapse-btn no-mobile"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Perluas Menu' : 'Sembunyikan Menu'}
          >
            {isCollapsed ? <Icons.ChevronRight /> : <Icons.ChevronLeft />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          <ul className="sidebar-menu">
            {menuItems.map((item, idx) => (
              <li key={idx}>
                <Link
                  href={item.href}
                  className={`sidebar-link ${isActive(item.href) ? 'sidebar-link-active' : ''}`}
                  onClick={() => setIsOpen(false)}
                >
                  <span className="sidebar-icon-svg">{item.icon}</span>
                  {!isCollapsed && <span className="sidebar-label">{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer Area */}
        <div className="sidebar-footer">
          <button className="sidebar-logout" onClick={() => alert('Keluar dari aplikasi')} title="Keluar">
            <span className="sidebar-icon-svg"><Icons.Logout /></span>
            {!isCollapsed && <span>Keluar</span>}
          </button>
        </div>

      </aside>
    </>
  );
}
