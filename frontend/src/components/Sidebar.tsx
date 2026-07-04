// src/components/Sidebar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { triggerRefresh } from '@/utils/api';
import { useTheme } from './ThemeProvider';
import {
  BarChart3, TrendingUp, Users2, Layers, HelpCircle,
  LogOut, RefreshCw, Lock, Database, Sun, Moon, Monitor,
  ChevronRight, Shield, User,
} from 'lucide-react';

const navItems = [
  { name: 'Overview', href: '/dashboard', icon: BarChart3 },
  { name: 'Cohort Explorer', href: '/cohorts', icon: TrendingUp },
  { name: 'RFM Segments', href: '/rfm', icon: Users2 },
  { name: 'Channel Performance', href: '/channels', icon: Layers },
  { name: 'Methodology', href: '/methodology', icon: HelpCircle },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [role, setRole] = useState<string>('viewer');
  const [email, setEmail] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    setRole(localStorage.getItem('userRole') || 'viewer');
    setEmail(localStorage.getItem('userEmail') || '');
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userEmail');
    router.push('/login');
  };

  const handleRefresh = async () => {
    if (role !== 'admin') return;
    setIsRefreshing(true);
    setRefreshStatus(null);
    try {
      await triggerRefresh(role);
      setRefreshStatus({ type: 'success', message: 'Data refreshed successfully!' });
      setTimeout(() => window.location.reload(), 800);
    } catch (err: any) {
      setRefreshStatus({ type: 'error', message: err.message || 'Failed to refresh.' });
    } finally {
      setIsRefreshing(false);
    }
  };

  const themeOptions: { value: typeof theme; icon: React.ReactNode; label: string }[] = [
    { value: 'light', icon: <Sun className="h-3.5 w-3.5" />, label: 'Light' },
    { value: 'dark', icon: <Moon className="h-3.5 w-3.5" />, label: 'Dark' },
    { value: 'system', icon: <Monitor className="h-3.5 w-3.5" />, label: 'System' },
  ];

  return (
    <aside
      className="w-60 flex flex-col h-screen sticky top-0 shrink-0"
      style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-5 gap-3" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
        <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(255,255,255,0.12)' }}>
          <Database className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white leading-none truncate">Retention</p>
          <p className="text-[10px] font-medium mt-0.5 truncate" style={{ color: 'rgba(199,210,254,0.6)' }}>Analytics Platform</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-2 text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(199,210,254,0.4)' }}>
          Navigation
        </p>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                isActive
                  ? 'text-white'
                  : 'hover:text-white'
              }`}
              style={{
                background: isActive ? 'var(--sidebar-accent)' : 'transparent',
                color: isActive ? 'white' : 'rgba(199,210,254,0.65)',
                boxShadow: isActive ? '0 2px 8px rgba(79,70,229,0.35)' : 'none',
              }}
              onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.07)'; }}
              onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4 shrink-0" />
                {item.name}
              </span>
              {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
            </Link>
          );
        })}

        {/* Admin link */}
        {role === 'admin' && (
          <>
            <p className="px-3 pt-5 mb-2 text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(199,210,254,0.4)' }}>
              Admin
            </p>
            <Link
              href="/admin"
              className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150"
              style={{
                background: pathname === '/admin' ? 'var(--sidebar-accent)' : 'transparent',
                color: pathname === '/admin' ? 'white' : 'rgba(199,210,254,0.65)',
              }}
              onMouseEnter={(e) => { if (pathname !== '/admin') (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.07)'; }}
              onMouseLeave={(e) => { if (pathname !== '/admin') (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
            >
              <span className="flex items-center gap-3">
                <Database className="h-4 w-4 shrink-0" />
                Dataset Manager
              </span>
            </Link>
          </>
        )}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 space-y-3" style={{ borderTop: '1px solid var(--sidebar-border)' }}>

        {/* Theme Toggle */}
        <div className="rounded-lg p-1 flex gap-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              title={opt.label}
              className="flex-1 flex items-center justify-center py-1.5 rounded-md text-[10px] gap-1 font-medium transition-all"
              style={{
                background: theme === opt.value ? 'var(--sidebar-accent)' : 'transparent',
                color: theme === opt.value ? 'white' : 'rgba(199,210,254,0.5)',
              }}
            >
              {opt.icon}
            </button>
          ))}
        </div>

        {/* Refresh Pipeline */}
        <div className="rounded-lg p-3 space-y-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(199,210,254,0.45)' }}>
              Data Pipeline
            </span>
            {role !== 'admin' && (
              <span className="flex items-center gap-1 text-[9px] text-amber-400 font-semibold">
                <Lock className="h-2.5 w-2.5" /> Admin only
              </span>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={role !== 'admin' || isRefreshing}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-150 focus:outline-none"
            style={{
              background: role === 'admin' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
              color: role === 'admin' ? 'rgba(199,210,254,0.9)' : 'rgba(199,210,254,0.3)',
              cursor: role === 'admin' ? 'pointer' : 'not-allowed',
            }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Running ETL…' : 'Refresh Data'}
          </button>
          {refreshStatus && (
            <p className={`text-[10px] font-medium ${refreshStatus.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
              {refreshStatus.message}
            </p>
          )}
        </div>

        {/* User Info */}
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: role === 'admin' ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.1)' }}>
            {role === 'admin' ? <Shield className="h-4 w-4 text-indigo-300" /> : <User className="h-4 w-4 text-slate-300" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{email || 'Session User'}</p>
            <p className="text-[10px] capitalize font-medium" style={{ color: 'rgba(199,210,254,0.5)' }}>{role}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: 'rgba(199,210,254,0.5)' }}
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>

      </div>
    </aside>
  );
}
