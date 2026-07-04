// src/app/dashboard/page.tsx
'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getKPIs, getCohortRetention } from '@/utils/api';
import { KPIs, CohortRetentionRecord } from '@/types';
import FilterBar from '@/components/FilterBar';
import MetricCard from '@/components/MetricCard';
import CohortHeatmap from '@/components/CohortHeatmap';
import { Users, RotateCw, AlertTriangle, DollarSign, TrendingDown, TrendingUp, Info } from 'lucide-react';

export default function DashboardPage() {
  const searchParams = useSearchParams();
  
  // Read query params for filter bindings
  const channel = searchParams.get('channel') || '';
  const country = searchParams.get('country') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  
  const { data: kpis, isLoading: kpisLoading, error: kpisError } = useQuery({
    queryKey: ['kpis', channel, country, startDate, endDate],
    queryFn: () => getKPIs({ channel, country, startDate, endDate }),
  });

  const { data: cohortData, isLoading: cohortLoading, error: cohortError } = useQuery({
    queryKey: ['cohorts', 'monthly', channel, country, startDate, endDate],
    queryFn: () => getCohortRetention('monthly', { channel, country, startDate, endDate }),
  });

  const loading = kpisLoading || cohortLoading;
  const error = (kpisError as Error)?.message || (cohortError as Error)?.message || null;

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-border pb-4 dark:border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Cohort Retention Overview</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time cohort behavior analysis, repeat orders and blended churn monitoring.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar />

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-xs text-destructive flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4" />
          <span>Error loading data: {error}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Active Customers"
          value={loading ? '...' : kpis?.active_customers.toLocaleString() || '0'}
          icon={Users}
          description="Placed at least 1 order"
          tooltipText="The count of unique customers who placed at least one completed or returned order under the active filters."
          loading={loading}
        />
        
        <MetricCard
          title="Repeat Purchase Rate"
          value={loading ? '...' : `${kpis?.repeat_purchase_rate.toFixed(1)}%` || '0.0%'}
          icon={RotateCw}
          description="Customers with >= 2 orders"
          tooltipText="The percentage of customers who placed two or more orders in their customer history."
          loading={loading}
        />

        <MetricCard
          title="Blended Churn Rate"
          value={loading ? '...' : `${kpis?.blended_churn_rate.toFixed(1)}%` || '0.0%'}
          icon={TrendingDown}
          description="Inactive for last 90 days"
          tooltipText="The percentage of customers who have not placed a completed order in the trailing 90 days."
          loading={loading}
        />

        <MetricCard
          title="Average Customer LTV"
          value={loading ? '...' : `$${kpis?.average_ltv.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` || '$0.00'}
          icon={DollarSign}
          description="Net revenue per customer"
          tooltipText="Total historical net revenue (order value minus discounts and refunds) divided by total unique customers."
          loading={loading}
        />
      </div>

      {/* Cohort Heatmap Panel */}
      <div className="w-full">
        {loading ? (
          <div className="h-80 w-full animate-pulse bg-slate-200 dark:bg-slate-800 rounded-xl border border-border" />
        ) : (
          <CohortHeatmap data={cohortData} granularity="monthly" />
        )}
      </div>

      {/* Retention Insight Explainer */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm dark:border-slate-800/80">
        <h4 className="font-semibold text-sm text-slate-850 dark:text-slate-200 flex items-center space-x-1.5">
          <Info className="h-4 w-4 text-primary" />
          <span>Understanding Retention Rates</span>
        </h4>
        <div className="mt-3 text-xs text-muted-foreground leading-relaxed space-y-2">
          <p>
            The cohort retention heatmap tracks how each cohort of customers behaves over time. 
            <strong> Period M0</strong> represents their acquisition month (first purchase), which is always 100%. 
            <strong> Period M1</strong> shows what percentage of those original customers came back to place at least one order in the very next month.
          </p>
          <p>
            A typical e-commerce business sees a steep drop in Month 1 (to around 15-25%), followed by a slower decay. 
            By adjusting the <strong>Acquisition Channel</strong> filter, you can identify which channels yield high-value, highly-retained customers (e.g. Email marketing) versus those with high initial volume but low repeat purchase rates (e.g. Paid Social).
          </p>
        </div>
      </div>

    </div>
  );
}
