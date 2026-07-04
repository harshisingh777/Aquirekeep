// src/components/CohortHeatmap.tsx
'use client';

import React, { useState } from 'react';
import { CohortRetentionRecord } from '@/types';

interface CohortHeatmapProps {
  data: CohortRetentionRecord[];
  granularity: 'monthly' | 'weekly';
}

export default function CohortHeatmap({ data, granularity }: CohortHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ cohort: string; period: number } | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card p-6 text-muted-foreground shadow-sm">
        No cohort retention data available for current filters.
      </div>
    );
  }

  // 1. Pivot the data: group by cohort
  const cohortMap: {
    [cohort: string]: {
      size: number;
      periods: { [period: number]: { active: number; rate: number } };
    };
  } = {};

  let maxPeriod = 0;

  data.forEach((item) => {
    if (!cohortMap[item.cohort]) {
      cohortMap[item.cohort] = {
        size: item.cohort_size,
        periods: {},
      };
    }
    // Set size to the size at period 0 if available, otherwise fallback
    if (item.period === 0) {
      cohortMap[item.cohort].size = item.cohort_size;
    }
    cohortMap[item.cohort].periods[item.period] = {
      active: item.active_customers,
      rate: item.retention_rate,
    };
    if (item.period > maxPeriod) {
      maxPeriod = item.period;
    }
  });

  const cohorts = Object.keys(cohortMap).sort();
  // Cap max periods shown to 12 for readability (especially on weekly)
  const periodsToShow = Array.from({ length: Math.min(maxPeriod + 1, 13) }, (_, i) => i);

  // Helper to calculate cell background opacity based on retention rate
  const getCellBg = (rate: number) => {
    if (rate === 100) return 'rgb(46, 91, 255)'; // Full brand indigo for Period 0
    
    // Scale rate opacity for a clean primary brand gradient
    // Opacity goes from 0.05 to 0.85 for rates from 0.1% to 50%
    const minOpacity = 0.05;
    const maxOpacity = 0.85;
    const scale = rate / 45.0; // Assume 45% is a very high retention
    const opacity = Math.min(minOpacity + scale * (maxOpacity - minOpacity), maxOpacity);
    
    return `rgba(46, 91, 255, ${opacity})`;
  };

  const getCellTextColor = (rate: number) => {
    // White text for high retention (period 0 / deep colors), dark slate otherwise
    return rate > 30 ? 'text-white font-medium' : 'text-slate-800 dark:text-slate-200';
  };

  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-200">
      <div className="border-b border-border px-6 py-4">
        <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100">Cohort Retention Heatmap</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          % of cohort customers who place at least one order in period N
        </p>
      </div>

      <div className="overflow-x-auto p-4">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 px-3 font-semibold text-slate-500 uppercase tracking-wider min-w-[90px]">Cohort</th>
              <th className="py-2 px-3 font-semibold text-slate-500 uppercase tracking-wider text-right border-r border-border pr-4 min-w-[80px]">Size</th>
              {periodsToShow.map((p) => (
                <th key={p} className="py-2 px-1 font-semibold text-slate-500 uppercase tracking-wider text-center min-w-[50px]">
                  {granularity === 'monthly' ? `M${p}` : `W${p}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {cohorts.map((cohort) => {
              const cohortInfo = cohortMap[cohort];
              return (
                <tr key={cohort} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                    {cohort}
                  </td>
                  <td className="py-2.5 px-3 text-right pr-4 border-r border-border font-semibold tabular-nums text-slate-600 dark:text-slate-400">
                    {cohortInfo.size.toLocaleString()}
                  </td>
                  {periodsToShow.map((period) => {
                    const cell = cohortInfo.periods[period];
                    if (!cell) {
                      return (
                        <td key={period} className="py-2.5 px-1 bg-slate-50/20 dark:bg-slate-800/10 text-center text-slate-300 dark:text-slate-700">
                          -
                        </td>
                      );
                    }
                    
                    const isHovered = hoveredCell?.cohort === cohort && hoveredCell?.period === period;
                    
                    return (
                      <td
                        key={period}
                        className="p-0.5 relative text-center group cursor-pointer"
                        onMouseEnter={() => setHoveredCell({ cohort, period })}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        <div
                          style={{ backgroundColor: getCellBg(cell.rate) }}
                          className={`py-2 px-1 rounded-sm text-[11px] transition-all duration-150 tabular-nums ${getCellTextColor(cell.rate)} ${
                            isHovered ? 'scale-105 shadow-sm ring-1 ring-slate-400 dark:ring-slate-500' : ''
                          }`}
                        >
                          {cell.rate.toFixed(1)}%
                        </div>
                        
                        {/* Tooltip */}
                        {isHovered && (
                          <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white rounded-lg p-2.5 shadow-xl text-left border border-slate-700 pointer-events-none animate-fade-in">
                            <div className="font-semibold text-[10px] uppercase text-indigo-400 tracking-wider">
                              Cohort Details
                            </div>
                            <div className="text-xs font-medium mt-1">
                              Cohort: <span className="font-normal text-slate-300">{cohort}</span>
                            </div>
                            <div className="text-xs font-medium">
                              Period: <span className="font-normal text-slate-300">
                                {period} {granularity === 'monthly' ? 'month(s)' : 'week(s)'}
                              </span>
                            </div>
                            <div className="text-xs font-medium border-t border-slate-800 mt-1.5 pt-1.5 flex justify-between">
                              <span>Cohort Size:</span>
                              <span className="text-slate-300 tabular-nums">{cohortInfo.size}</span>
                            </div>
                            <div className="text-xs font-medium flex justify-between">
                              <span>Active Users:</span>
                              <span className="text-slate-300 tabular-nums">{cell.active}</span>
                            </div>
                            <div className="text-xs font-semibold flex justify-between text-emerald-400 mt-0.5">
                              <span>Retention:</span>
                              <span className="tabular-nums">{cell.rate.toFixed(2)}%</span>
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
