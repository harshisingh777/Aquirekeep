// src/app/methodology/page.tsx
'use client';

import React from 'react';
import { METRIC_FORMULAS } from '@/constants';
import { HelpCircle, ClipboardCheck, BookOpen, AlertCircle } from 'lucide-react';

export default function MethodologyPage() {
  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4 dark:border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Analytics Methodology</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Detailed formulas, definitions, and business logic explanation for the platform metrics.
          </p>
        </div>
      </div>

      {/* Intro Panel */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm dark:border-slate-800/80 flex items-start gap-4">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <BookOpen className="h-6 w-6" />
        </div>
        <div className="text-xs text-slate-700 dark:text-slate-350 leading-relaxed">
          <h4 className="font-bold text-sm text-slate-850 dark:text-slate-200 mb-1">Methodology and Data Standards</h4>
          <p>
            To ensure data integrity, every metric on this dashboard is calculated using SQL transformations in our DuckDB database (mirroring standard dbt production transformations). Business teams can query this data with confidence knowing that cancellations, refunds, and discounts are handled uniformly across all views.
          </p>
        </div>
      </div>

      {/* Metrics List Accordion / Card Grid */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-150 flex items-center gap-1.5 px-1">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          <span>Metric Definitions & Calculations</span>
        </h3>

        <div className="grid grid-cols-1 gap-4">
          {METRIC_FORMULAS.map((metric) => (
            <div
              key={metric.name}
              className="rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-800/80"
            >
              <h4 className="font-bold text-sm text-primary">{metric.name}</h4>
              
              {/* Formula Block */}
              <div className="mt-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 p-3 font-mono text-[10px] text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800/50">
                <span className="font-semibold text-slate-400 mr-2 uppercase text-[9px] tracking-wider select-none">
                  Formula:
                </span>
                {metric.formula}
              </div>

              {/* Explanation */}
              <div className="mt-3.5 text-xs text-muted-foreground leading-relaxed">
                <p>{metric.explanation}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimers & Notes */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-6 dark:border-amber-900/30 dark:bg-amber-950/10">
        <h4 className="font-semibold text-sm text-amber-800 dark:text-amber-400 flex items-center space-x-1.5">
          <AlertCircle className="h-4 w-4" />
          <span>Data Ingestion & Integrity Notes</span>
        </h4>
        <ul className="mt-3 text-xs text-amber-700 dark:text-amber-550 leading-relaxed list-disc list-inside space-y-1.5">
          <li>
            <strong>Cancelled Orders:</strong> Orders marked as <code>cancelled</code> are filtered out from all metrics, including cohort sizing, CAC, and LTV.
          </li>
          <li>
            <strong>Refunds:</strong> Customer lifetime value (LTV) is calculated net of refunds. If an order is fully returned, the net amount is $0.00.
          </li>
          <li>
            <strong>Acquisition Assignment:</strong> A customer&apos;s cohort is fixed by their absolute first completed order date. Filters on date ranges affect the transactions plotted but do not change the cohort size of the historical cohort groups.
          </li>
        </ul>
      </div>

    </div>
  );
}
