// src/components/AuthGuard.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Database } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const role = localStorage.getItem('userRole');

    const hasAuth = !!(token && role);

    if (!hasAuth) {
      if (pathname !== '/login') {
        router.replace('/login');
      } else {
        setLoading(false);
      }
    } else {
      setIsAuthenticated(true);
      setLoading(false);
      if (pathname === '/login' || pathname === '/') {
        router.replace('/dashboard');
      }
    }
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}>
            <Database className="h-5 w-5 text-white" />
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-2 w-2 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (pathname === '/login') return <>{children}</>;
  return isAuthenticated ? <>{children}</> : null;
}
