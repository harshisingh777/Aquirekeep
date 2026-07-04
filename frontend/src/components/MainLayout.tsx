// src/components/MainLayout.tsx
'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import AuthGuard from './AuthGuard';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <AuthGuard>
      {isLoginPage ? (
        <main className="w-screen h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
          {children}
        </main>
      ) : (
        <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-8 relative">
            <div className="max-w-6xl mx-auto w-full animate-fade-in">
              {children}
            </div>
          </main>
        </div>
      )}
    </AuthGuard>
  );
}
