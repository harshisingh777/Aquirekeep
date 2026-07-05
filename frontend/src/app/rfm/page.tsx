// src/app/rfm/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { getRFM } from '@/utils/api';
import { RFMSegmentRecord, RFMCustomerRecord } from '@/types';
import FilterBar from '@/components/FilterBar';
import DataTable from '@/components/DataTable';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  PieChart, Pie, Sector,
} from 'recharts';
import { Users2, AlertTriangle, Info } from 'lucide-react';

const SEGMENT_COLORS: Record<string, string> = {
  'Champions':                    '#10b981',
  'Loyal Customers':              '#6366f1',
  'Recent Customers':             '#3b82f6',
  'Customers Needing Attention':  '#f59e0b',
  'About to Sleep':               '#8b5cf6',
  'At Risk':                      '#e11d48',
  'Lost':                         '#64748b',
};
const DEFAULT_COLOR = '#4f46e5';

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;
  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" fill={fill} style={{ fontSize: 12, fontWeight: 700 }}>
        {payload.segment?.replace(' Customers', '') ?? payload.name}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="currentColor" style={{ fontSize: 11 }}>
        {(percent * 100).toFixed(1)}%
      </text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  );
};

const tooltipStyle = {
  backgroundColor: 'var(--card)',
  color: 'var(--foreground)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  fontSize: '11px',
};

export default function RFMPage() {
  const searchParams = useSearchParams();
  const [segments, setSegments] = useState<RFMSegmentRecord[]>([]);
  const [customers, setCustomers] = useState<RFMCustomerRecord[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const channel = searchParams.get('channel') || '';
  const country = searchParams.get('country') || '';

  useEffect(() => {
    setLoading(true);
    setError(null);
    getRFM({ channel, country })
      .then((res) => { setSegments(res.segments); setCustomers(res.customers); })
      .catch((err: any) => setError(err.message || 'Failed to load RFM data.'))
      .finally(() => setLoading(false));
  }, [channel, country]);

  useEffect(() => { setSelectedSegment('All'); }, [channel, country]);

  const filteredCustomers = useMemo(() => {
    if (selectedSegment === 'All') return customers;
    return customers.filter((c) => c.segment.toLowerCase() === selectedSegment.toLowerCase());
  }, [customers, selectedSegment]);

  return (
    <div className="space-y-6 animate-fade-in">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border)] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">RFM Customer Segmentation</h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Segment customers by Recency, Frequency, and Monetary scores to tailor marketing campaigns.
          </p>
        </div>
      </div>

      <FilterBar hideDates />

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/30 p-4 text-xs text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Bar Chart */}
        <div className="lg:col-span-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <h3 className="font-semibold text-sm text-[var(--foreground)] mb-5 flex items-center gap-2">
            <Users2 className="h-4 w-4 text-primary" />
            Segment Distribution
          </h3>
          {loading ? (
            <div className="h-64 w-full animate-pulse bg-[var(--secondary)] rounded-lg" />
          ) : segments.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={segments} margin={{ top: 5, right: 5, left: 5, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                  <XAxis dataKey="segment" tickFormatter={(t) => t.replace(' Customers', '')} stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} />
                  <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => [v, 'Customers']} contentStyle={tooltipStyle} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {segments.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={SEGMENT_COLORS[entry.segment] || DEFAULT_COLOR}
                        cursor="pointer"
                        onClick={() => setSelectedSegment(entry.segment)}
                        opacity={selectedSegment !== 'All' && selectedSegment !== entry.segment ? 0.35 : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-[var(--muted-foreground)] text-sm">No segment data.</div>
          )}
        </div>

        {/* Pie Chart */}
        <div className="lg:col-span-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <h3 className="font-semibold text-sm text-[var(--foreground)] mb-5">Segment Share</h3>
          {loading ? (
            <div className="h-48 w-full animate-pulse bg-[var(--secondary)] rounded-full mx-auto" style={{ maxWidth: 160, borderRadius: '50%' }} />
          ) : segments.length > 0 ? (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      activeShape={renderActiveShape}
                      data={segments}
                      dataKey="count"
                      nameKey="segment"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      onClick={(_, i) => setSelectedSegment(segments[i]?.segment ?? 'All')}
                    >
                      {segments.map((entry, i) => (
                        <Cell key={i} fill={SEGMENT_COLORS[entry.segment] || DEFAULT_COLOR} cursor="pointer" />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [Number(v).toLocaleString(), 'Customers']} contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-1">
                {segments.map((seg) => (
                  <div
                    key={seg.segment}
                    className="flex items-center gap-2 text-[10px] cursor-pointer rounded px-1 py-0.5 hover:bg-[var(--secondary)] transition-colors"
                    onClick={() => setSelectedSegment(seg.segment)}
                  >
                    <div className="h-2 w-2 rounded-sm shrink-0" style={{ background: SEGMENT_COLORS[seg.segment] || DEFAULT_COLOR }} />
                    <span className="text-[var(--muted-foreground)] truncate">{seg.segment.replace(' Customers', '')} ({seg.count})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-48 items-center justify-center text-[var(--muted-foreground)] text-sm">No data.</div>
          )}
        </div>
      </div>

      {/* RFM Guide */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <h4 className="font-semibold text-sm text-[var(--foreground)] flex items-center gap-2 mb-4">
          <Info className="h-4 w-4 text-primary" />
          RFM Action Guide
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-[11px]">
          {[
            { label: 'Champions', color: '#10b981', action: 'Reward loyalty, invite to VIP program.' },
            { label: 'Loyal Customers', color: '#6366f1', action: 'Upsell premium products, request reviews.' },
            { label: 'At Risk', color: '#e11d48', action: 'Send win-back email offers or discount codes.' },
            { label: 'Lost', color: '#64748b', action: 'Low-cost re-engagement only. Do not over-invest.' },
          ].map((g) => (
            <div key={g.label} className="rounded-lg bg-[var(--secondary)] p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-sm" style={{ background: g.color }} />
                <span className="font-bold text-[var(--foreground)]">{g.label}</span>
              </div>
              <p className="text-[var(--muted-foreground)] leading-normal">{g.action}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Segment Tabs */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setSelectedSegment('All')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
            selectedSegment === 'All'
              ? 'bg-primary text-white border-primary shadow-sm'
              : 'bg-[var(--card)] hover:bg-[var(--secondary)] border-[var(--border)] text-[var(--foreground)]'
          }`}
        >
          All ({customers.length})
        </button>
        {segments.map((seg) => (
          <button
            key={seg.segment}
            onClick={() => setSelectedSegment(seg.segment)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
              selectedSegment === seg.segment
                ? 'text-white border-transparent'
                : 'bg-[var(--card)] hover:bg-[var(--secondary)] border-[var(--border)] text-[var(--foreground)]'
            }`}
            style={{
              background: selectedSegment === seg.segment ? SEGMENT_COLORS[seg.segment] : undefined,
              borderColor: selectedSegment === seg.segment ? SEGMENT_COLORS[seg.segment] : undefined,
            }}
          >
            {seg.segment.replace(' Customers', '')} ({seg.count})
          </button>
        ))}
      </div>

      {/* Customer Table */}
      <div className="w-full">
        {loading ? (
          <div className="h-64 w-full animate-pulse bg-[var(--secondary)] rounded-xl" />
        ) : (
          <DataTable data={filteredCustomers} />
        )}
      </div>
    </div>
  );
}
