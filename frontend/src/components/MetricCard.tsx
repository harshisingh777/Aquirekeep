// src/components/MetricCard.tsx
import React from 'react';
import { LucideIcon, Info } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  tooltipText?: string;
  loading?: boolean;
  trend?: { value: number; label: string };
}

export default function MetricCard({
  title, value, icon: Icon, description, tooltipText, loading = false, trend,
}: MetricCardProps) {
  return (
    <div className="relative overflow-visible rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 w-1/3 bg-[var(--secondary)] rounded" />
          <div className="h-8 w-2/3 bg-[var(--secondary)] rounded" />
          <div className="h-4 w-1/2 bg-[var(--secondary)] rounded" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--muted-foreground)]">{title}</span>
            <div className="flex items-center gap-2">
              {tooltipText && (
                <div className="tooltip-wrap cursor-help">
                  <Info className="h-4 w-4 text-[var(--muted-foreground)] hover:text-primary transition-colors" />
                  <div className="tooltip-box">{tooltipText}</div>
                </div>
              )}
              <div className="rounded-lg bg-[var(--secondary)] p-2 text-primary">
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-[var(--foreground)] tabular-nums">
              {value}
            </span>
            {trend && (
              <span className={`text-xs font-semibold ${trend.value >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
            )}
          </div>

          {description && (
            <p className="mt-1.5 text-xs text-[var(--muted-foreground)]">{description}</p>
          )}

          {/* Bottom accent line */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />
        </>
      )}
    </div>
  );
}
