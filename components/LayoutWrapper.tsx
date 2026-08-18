'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Define paths that are public or auth-related where sidebar should be hidden
  const isAuthOrPublic = 
    pathname === '/login' || 
    pathname.startsWith('/customer-sign') || 
    pathname.startsWith('/invoice/');

  if (isAuthOrPublic) {
    return (
      <div className="auth-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <main className="main-content" style={{ marginLeft: 0, width: '100%' }}>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
