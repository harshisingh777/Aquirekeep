// src/app/auth/callback/page.tsx
// Google OAuth 2.0 callback handler — backend redirects here after token exchange
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Database, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const role  = searchParams.get('role');
    const email = searchParams.get('email');
    const error = searchParams.get('error');

    if (error) {
      // Decode common OAuth error messages
      const friendly: Record<string, string> = {
        access_denied: 'You declined the Google sign-in request.',
        no_code:       'No authorization code received from Google.',
      };
      setErrorMessage(friendly[error] ?? decodeURIComponent(error));
      setStatus('error');
      return;
    }

    if (token && role) {
      localStorage.setItem('authToken', token);
      localStorage.setItem('userRole', role);
      if (email) localStorage.setItem('userEmail', email);
      setStatus('success');

      // Brief success flash, then redirect
      setTimeout(() => router.replace('/dashboard'), 1200);
    } else {
      setErrorMessage('Authentication failed — no token received.');
      setStatus('error');
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="w-full max-w-sm text-center space-y-6 p-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xl animate-fade-in">

        {/* Brand mark */}
        <div className="mx-auto h-12 w-12 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}>
          <Database className="h-6 w-6 text-white" />
        </div>

        {status === 'loading' && (
          <>
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)]">Signing you in…</h2>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">Verifying your Google account</p>
            </div>
            <div className="flex justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)]">Signed in successfully!</h2>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">Redirecting to your dashboard…</p>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)]">Sign-in Failed</h2>
              <p className="text-sm text-red-500 dark:text-red-400 mt-2">{errorMessage}</p>
            </div>
            <button
              onClick={() => router.replace('/login')}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:opacity-90 transition-all"
            >
              Back to Login
            </button>
          </>
        )}

      </div>
    </div>
  );
}
