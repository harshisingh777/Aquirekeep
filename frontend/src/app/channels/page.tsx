// src/app/channels/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { getChannelPerformance } from '@/utils/api';
import { ChannelPerformanceRecord } from '@/types';
import FilterBar from '@/components/FilterBar';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Sector,
} from 'recharts';
import { Layers, AlertTriangle, BadgeDollarSign, HelpCircle, ArrowUpRight, TrendingUp } from 'lucide-react';

const CHART_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#6366f1', '#ef4444', '#06b6d4'];

function roundToTwo(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

const getRoiStyle = (ratio: number) => {
  if (ratio >= 3.0) return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
  if (ratio >= 1.5) return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
  if (ratio > 0)   return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
  return 'bg-[var(--secondary)] text-[var(--muted-foreground)] border-[var(--border)]';
};

const getRoiLabel = (ratio: number) => {
  if (ratio >= 3.0) return 'High ROI';
  if (ratio >= 1.5) return 'Healthy';
  if (ratio > 0)   return 'Underperforming';
  return 'N/A';
};

// Custom active pie sector
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;
  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" fill={fill} className="text-sm font-bold">
        {payload.channel}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="currentColor" className="text-xs" style={{ fontSize: 11 }}>
        {(percent * 100).toFixed(1)}%
      </text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  );
};

export default function ChannelPerformancePage() {
  const searchParams = useSearchParams();
  const [channelData, setChannelData] = useState<ChannelPerformanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const channelFilter = searchParams.get('channel') || '';

  useEffect(() => {
    setLoading(true);
    setError(null);
    getChannelPerformance({ channel: channelFilter })
      .then(setChannelData)
      .catch((err: any) => setError(err.message || 'Failed to load channel performance.'))
      .finally(() => setLoading(false));
  }, [channelFilter]);

  const aggregatedChannelData = useMemo(() => {
    if (!channelData || channelData.length === 0) return [];
    const map: Record<string, { cohort_size: number; total_spend: number; historical_revenue: number; predicted_revenue: number }> = {};
    channelData.forEach((row) => {
      if (!map[row.channel]) map[row.channel] = { cohort_size: 0, total_spend: 0, historical_revenue: 0, predicted_revenue: 0 };
      map[row.channel].cohort_size += row.cohort_size;
      map[row.channel].total_spend += row.total_spend;
      map[row.channel].historical_revenue += row.avg_historical_ltv * row.cohort_size;
      map[row.channel].predicted_revenue += row.avg_predicted_ltv_12mo * row.cohort_size;
    });
    return Object.keys(map).map((chan) => {
      const info = map[chan];
      const blended_cac = info.cohort_size > 0 ? info.total_spend / info.cohort_size : 0;
      const avg_historical_ltv = info.cohort_size > 0 ? info.historical_revenue / info.cohort_size : 0;
      const avg_predicted_ltv_12mo = info.cohort_size > 0 ? info.predicted_revenue / info.cohort_size : 0;
      const ltv_to_cac_ratio = blended_cac > 0 ? avg_historical_ltv / blended_cac : 0;
      return {
        channel: chan,
        cohort_size: info.cohort_size,
        total_spend: info.total_spend,
        blended_cac: roundToTwo(blended_cac),
        avg_historical_ltv: roundToTwo(avg_historical_ltv),
        avg_predicted_ltv_12mo: roundToTwo(avg_predicted_ltv_12mo),
        ltv_to_cac_ratio: roundToTwo(ltv_to_cac_ratio),
      };
    });
  }, [channelData]);

  // Pie data: customer acquisition share
  const pieData = aggregatedChannelData.map((d) => ({ channel: d.channel, value: d.cohort_size }));

  const tooltipStyle = {
    backgroundColor: 'var(--card)',
    color: 'var(--foreground)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    fontSize: '11px',
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border)] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Marketing Channel Performance</h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Audit acquisition efficiency, blended CAC, customer lifetime value, and marketing ROI.
          </p>
        </div>
      </div>

      <FilterBar hideCountry />

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/30 p-4 text-xs text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Bar Chart — spans 3 cols */}
        <div className="lg:col-span-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <h3 className="font-semibold text-sm text-[var(--foreground)] mb-5 flex items-center gap-2">
            <BadgeDollarSign className="h-4 w-4 text-primary" />
            Unit Economics — CAC vs. LTV
          </h3>
          {loading ? (
            <div className="h-72 w-full animate-pulse bg-[var(--secondary)] rounded-lg" />
          ) : aggregatedChannelData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aggregatedChannelData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                  <XAxis dataKey="channel" stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
                  <YAxis stroke="var(--muted-foreground)" unit="$" tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v) => [`$${Number(v).toFixed(2)}`, '']}
                    contentStyle={tooltipStyle}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="blended_cac" name="Blended CAC" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avg_historical_ltv" name="Avg Historical LTV" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avg_predicted_ltv_12mo" name="Predicted LTV (12mo)" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-72 items-center justify-center text-[var(--muted-foreground)] text-sm">
              No data available.
            </div>
          )}
        </div>

        {/* Pie Chart — spans 2 cols */}
        <div className="lg:col-span-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <h3 className="font-semibold text-sm text-[var(--foreground)] mb-5 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Customer Acquisition Share
          </h3>
          {loading ? (
            <div className="h-64 w-full animate-pulse bg-[var(--secondary)] rounded-full mx-auto" style={{ borderRadius: '50%', maxWidth: 200 }} />
          ) : pieData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    activeShape={renderActiveShape}
                    data={pieData}
                    dataKey="value"
                    nameKey="channel"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => [Number(v).toLocaleString(), 'Customers']}
                    contentStyle={tooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-[var(--muted-foreground)] text-sm">
              No data available.
            </div>
          )}
          {/* Legend */}
          {!loading && pieData.length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {pieData.map((d, i) => (
                <div key={d.channel} className="flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)]">
                  <div className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="truncate">{d.channel}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ROI Insights */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <h4 className="font-semibold text-sm text-[var(--foreground)] flex items-center gap-2 mb-4">
          <ArrowUpRight className="h-4 w-4 text-primary" />
          Acquisition ROI Insights
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-[var(--muted-foreground)]">
          <p><strong className="text-[var(--foreground)]">Organic & Direct:</strong> Zero CAC channels. Focus on SEO and brand awareness to maximize these.</p>
          <p><strong className="text-[var(--foreground)]">Email Marketing:</strong> Highest retention and lowest send cost. The most efficient ROI channel.</p>
          <p><strong className="text-[var(--foreground)]">Paid Social:</strong> High acquisition volume but lower repeat rate. Retarget these customers via email to improve LTV.</p>
        </div>
      </div>

      {/* Data Table */}
      <div className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h3 className="font-semibold text-sm text-[var(--foreground)] flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Channel Performance Ledger
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse data-table">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)] font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-5">Channel</th>
                <th className="py-3 px-5 text-right">Customers</th>
                <th className="py-3 px-5 text-right">Total Spend</th>
                <th className="py-3 px-5 text-right">Blended CAC</th>
                <th className="py-3 px-5 text-right">Avg Historical LTV</th>
                <th className="py-3 px-5 text-right">Avg Predicted LTV</th>
                <th className="py-3 px-5 text-center">LTV:CAC</th>
                <th className="py-3 px-5">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--foreground)]">
              {loading ? (
                <tr><td colSpan={8} className="py-8 text-center text-[var(--muted-foreground)] animate-pulse">Loading…</td></tr>
              ) : aggregatedChannelData.length > 0 ? (
                aggregatedChannelData.map((item, i) => (
                  <tr key={item.channel} className="hover:bg-[var(--secondary)] transition-colors">
                    <td className="py-3.5 px-5 font-semibold flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      {item.channel}
                    </td>
                    <td className="py-3.5 px-5 text-right tabular-nums">{item.cohort_size.toLocaleString()}</td>
                    <td className="py-3.5 px-5 text-right tabular-nums">${item.total_spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-3.5 px-5 text-right font-semibold text-red-500 tabular-nums">${item.blended_cac.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-3.5 px-5 text-right font-semibold text-primary tabular-nums">${item.avg_historical_ltv.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-3.5 px-5 text-right font-semibold text-emerald-500 tabular-nums">${item.avg_predicted_ltv_12mo.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-3.5 px-5 text-center font-bold tabular-nums">{item.blended_cac > 0 ? `${item.ltv_to_cac_ratio.toFixed(2)}x` : '∞'}</td>
                    <td className="py-3.5 px-5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getRoiStyle(item.blended_cac > 0 ? item.ltv_to_cac_ratio : 99)}`}>
                        {getRoiLabel(item.blended_cac > 0 ? item.ltv_to_cac_ratio : 99)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={8} className="py-8 text-center text-[var(--muted-foreground)]">No data matching filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Explainer */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <h4 className="font-semibold text-sm text-[var(--foreground)] flex items-center gap-2 mb-3">
          <HelpCircle className="h-4 w-4 text-primary" />
          Understanding Channel Unit Economics
        </h4>
        <div className="text-xs text-[var(--muted-foreground)] leading-relaxed space-y-2">
          <p><strong className="text-[var(--foreground)]">Blended CAC</strong> = Total channel ad spend / Customers acquired. <strong className="text-[var(--foreground)]">LTV:CAC Ratio</strong> = Avg Customer LTV / Blended CAC. A ratio of <strong>3.0x or higher</strong> is considered healthy.</p>
        </div>
      </div>
    </div>
  );
}
