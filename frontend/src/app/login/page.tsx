// src/app/login/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/utils/api';
import { BarChart3, Mail, Lock, ArrowRight, Globe, AlertCircle, Eye, EyeOff, Shield, User } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [demoLoading, setDemoLoading] = useState<'admin' | 'viewer' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      localStorage.setItem('authToken', data.access_token);
      localStorage.setItem('userRole', data.role);
      localStorage.setItem('userEmail', data.email);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'admin' | 'viewer') => {
    setError('');
    setDemoLoading(role);
    const credentials = {
      admin: { email: 'admin@demo.com', password: 'admin123' },
      viewer: { email: 'viewer@demo.com', password: 'viewer123' },
    };
    try {
      const data = await login(credentials[role].email, credentials[role].password);
      localStorage.setItem('authToken', data.access_token);
      localStorage.setItem('userRole', data.role);
      localStorage.setItem('userEmail', data.email);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setDemoLoading(null);
    }
  };

  const handleGoogleLogin = () => {
    // Navigate to backend → Google OAuth → /api/auth/google/callback → /auth/callback
    window.location.href = 'http://127.0.0.1:8000/api/auth/google';
  };

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      {/* Left Panel — Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)' }}
      >
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">Retention Analytics</span>
        </div>

        {/* Center Content */}
        <div className="relative space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Turn customer data<br />into growth insights
            </h1>
            <p className="mt-4 text-indigo-200 text-base leading-relaxed max-w-sm">
              Cohort retention, RFM segmentation, LTV modeling, and channel performance analytics — all in one place.
            </p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Customers Tracked', value: '99K+' },
              { label: 'Avg Retention Lift', value: '34%' },
              { label: 'Data Points', value: '112K+' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white/10 backdrop-blur-sm p-4 text-center">
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-indigo-300 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-indigo-400">© 2024 Retention Analytics Platform. Enterprise-grade e-commerce intelligence.</p>
      </div>

      {/* Right Panel — Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8 animate-fade-in">

          {/* Header */}
          <div>
            <div className="flex items-center gap-2 lg:hidden mb-6">
              <BarChart3 className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg text-[var(--foreground)]">Retention Analytics</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">Sign in</h2>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Access your analytics dashboard
            </p>
          </div>

          {/* OAuth Button */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] shadow-sm hover:bg-[var(--secondary)] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <Globe className="h-4 w-4 text-blue-500" />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative flex items-center">
            <div className="flex-1 border-t border-[var(--border)]" />
            <span className="px-3 text-xs text-[var(--muted-foreground)] font-medium">or sign in with email</span>
            <div className="flex-1 border-t border-[var(--border)]" />
          </div>

          {/* Error Alert */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wide">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] py-3 pl-10 pr-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] py-3 pl-10 pr-10 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-md shadow-primary/25 hover:opacity-90 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo Access */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--secondary)] p-4 space-y-3">
            <p className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wide">
              Demo Access — No Account Needed
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleDemoLogin('viewer')}
                disabled={!!demoLoading}
                className="flex items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--background)] transition-all disabled:opacity-60"
              >
                {demoLoading === 'viewer' ? (
                  <div className="h-3.5 w-3.5 border-2 border-[var(--muted-foreground)]/30 border-t-[var(--muted-foreground)] rounded-full animate-spin" />
                ) : (
                  <User className="h-3.5 w-3.5 text-blue-500" />
                )}
                Viewer Demo
              </button>
              <button
                onClick={() => handleDemoLogin('admin')}
                disabled={!!demoLoading}
                className="flex items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--background)] transition-all disabled:opacity-60"
              >
                {demoLoading === 'admin' ? (
                  <div className="h-3.5 w-3.5 border-2 border-[var(--muted-foreground)]/30 border-t-[var(--muted-foreground)] rounded-full animate-spin" />
                ) : (
                  <Shield className="h-3.5 w-3.5 text-indigo-500" />
                )}
                Admin Demo
              </button>
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)]">
              Admin: admin@demo.com / admin123 &nbsp;·&nbsp; Viewer: viewer@demo.com / viewer123
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
