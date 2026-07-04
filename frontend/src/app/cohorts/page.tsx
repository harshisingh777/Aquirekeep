// src/app/cohorts/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { getCohortRetention } from '@/utils/api';
import { CohortRetentionRecord } from '@/types';
import FilterBar from '@/components/FilterBar';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertTriangle, HelpCircle } from 'lucide-react';

export default function CohortsPage() {
  const searchParams = useSearchParams();
  const [cohortData, setCohortData] = useState<CohortRetentionRecord[]>([]);
  const [granularity, setGranularity] = useState<'monthly' | 'weekly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Read search params
  const channel = searchParams.get('channel') || '';
  const country = searchParams.get('country') || '';

  useEffect(() => {
    async function loadCohortData() {
      setLoading(true);
      setError(null);
      try {
        const res = await getCohortRetention(granularity, { channel, country });
        setCohortData(res);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load cohort curves.');
      } finally {
        setLoading(false);
      }
    }

    loadCohortData();
  }, [granularity, channel, country]);

  // Pivot data for Recharts Line Chart
  // We want to pivot from flat rows to: [{ period: 0, '2024-01': 100, '2024-02': 100 }, ...]
  const chartData = useMemo(() => {
    if (!cohortData || cohortData.length === 0) return { pivotedData: [], displayedCohorts: [] };

    // 1. Group values by period
    const periodMap: { [period: number]: { [cohort: string]: number } } = {};
    const cohortsSet = new Set<string>();

    cohortData.forEach((row) => {
      cohortsSet.add(row.cohort);
      if (!periodMap[row.period]) {
        periodMap[row.period] = {};
      }
      periodMap[row.period][row.cohort] = row.retention_rate;
    });

    // 2. Select last 6 cohorts to avoid cluttering the line chart
    const sortedCohorts = Array.from(cohortsSet).sort();
    const cohortsToDisplay = sortedCohorts.slice(-6); // Last 6 cohorts

    // 3. Format as array for Recharts
    const maxPeriod = Math.max(...cohortData.map((d) => d.period));
    const result = [];
    
    // We only show up to period 12 for readability
    const limitPeriod = Math.min(maxPeriod, 12);

    for (let p = 0; p <= limitPeriod; p++) {
      const point: any = { period: p };
      let hasData = false;
      
      cohortsToDisplay.forEach((cohort) => {
        if (periodMap[p] && periodMap[p][cohort] !== undefined) {
          point[cohort] = periodMap[p][cohort];
          hasData = true;
        }
      });
      
      if (hasData) {
        result.push(point);
      }
    }

    return {
      pivotedData: result,
      displayedCohorts: cohortsToDisplay,
    };
  }, [cohortData]);

  // Distinct qualitative colors for lines
  const colors = ['#2e5bff', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4 dark:border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Cohort Retention Curves</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Visualize customer decay curves over time. Compare cohort life-cycle behaviors.
          </p>
        </div>
        
        {/* Granularity Toggle */}
        <div className="mt-3 sm:mt-0 flex rounded-lg border border-border bg-card p-1 shadow-sm dark:border-slate-800/80">
          <button
            onClick={() => setGranularity('monthly')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              granularity === 'monthly'
                ? 'bg-primary text-white'
                : 'text-slate-600 hover:text-slate-850 dark:text-slate-350 dark:hover:text-slate-100'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setGranularity('weekly')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              granularity === 'weekly'
                ? 'bg-primary text-white'
                : 'text-slate-600 hover:text-slate-850 dark:text-slate-350 dark:hover:text-slate-100'
            }`}
          >
            Weekly
          </button>
        </div>
      </div>

      {/* Filters */}
      <FilterBar />

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-xs text-destructive flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4" />
          <span>Error loading cohort curves: {error}</span>
        </div>
      )}

      {/* Chart Panel */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm dark:border-slate-800/80">
        <h3 className="font-semibold text-sm text-slate-800 mb-6 dark:text-slate-150 flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span>Retention Decay Rate Comparison (Latest 6 Cohorts)</span>
        </h3>
        
        {loading ? (
          <div className="h-96 w-full animate-pulse bg-slate-200 dark:bg-slate-800 rounded-lg" />
        ) : chartData.pivotedData && chartData.pivotedData.length > 0 ? (
          <div className="h-96 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData.pivotedData}
                margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" opacity={0.5} />
                <XAxis
                  dataKey="period"
                  label={{ value: granularity === 'monthly' ? 'Months since First Order' : 'Weeks since First Order', position: 'bottom', offset: -5 }}
                  stroke="#94a3b8"
                />
                <YAxis
                  label={{ value: 'Retention Rate (%)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                  stroke="#94a3b8"
                  domain={[0, 100]}
                />
                <Tooltip
                  formatter={(value: any) => [value !== undefined ? `${Number(value).toFixed(1)}%` : '-', 'Retention']}
                  labelFormatter={(label) => `Period: ${label} ${granularity === 'monthly' ? 'Month(s)' : 'Week(s)'}`}
                  contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px', border: 'none' }}
                />
                <Legend verticalAlign="top" height={36} />
                {chartData.displayedCohorts.map((cohort, index) => (
                  <Line
                    key={cohort}
                    type="monotone"
                    dataKey={cohort}
                    name={cohort}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2.5}
                    activeDot={{ r: 6 }}
                    dot={{ r: 3, strokeWidth: 1 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            No retention curve data available for active filters.
          </div>
        )}
      </div>

      {/* Curve Interpretation Explainer */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm dark:border-slate-800/80">
        <h4 className="font-semibold text-sm text-slate-850 dark:text-slate-200 flex items-center space-x-1.5">
          <HelpCircle className="h-4 w-4 text-primary" />
          <span>Interpreting the Retention Curve</span>
        </h4>
        <div className="mt-3 text-xs text-muted-foreground leading-relaxed space-y-2">
          <p>
            A **Retention Curve** shows the rate at which customer engagement decays over time. The steeper the initial drop-off (from Period 0 to Period 1), the harder it is to retain a customer after their first purchase.
          </p>
          <p>
            Ideally, we want the retention curves to **flatten out** rather than decay to zero. A curve that flattens at 15-20% means your business has a stable segment of repeat buyers who continue to provide repeat purchases year after year. 
          </p>
          <p>
            <strong>Compare Cohorts:</strong> If recent cohorts (the lines representing the most recent dates) lie *above* older cohorts, it indicates that your product updates, email nurturing campaigns, or customer satisfaction measures are successfully improving retention.
          </p>
        </div>
      </div>

    </div>
  );
}
