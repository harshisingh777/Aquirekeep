// src/components/FilterBar.tsx
'use client';

import React, { useTransition, useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { getFilterOptions } from '@/utils/api';
import { Calendar, Filter, RotateCcw, ChevronDown } from 'lucide-react';

interface FilterOptions {
  channels: string[];
  countries: string[];
  date_range: { min: string; max: string } | null;
}

interface FilterBarProps {
  hideCountry?: boolean;
  hideDates?: boolean;
}

export default function FilterBar({ hideCountry = false, hideDates = false }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ channels: [], countries: [], date_range: null });
  const [optionsLoaded, setOptionsLoaded] = useState(false);

  const activeChannel = searchParams.get('channel') || '';
  const activeCountry = searchParams.get('country') || '';
  const activeStartDate = searchParams.get('startDate') || '';
  const activeEndDate = searchParams.get('endDate') || '';

  // Fetch dynamic filter options from the dataset
  useEffect(() => {
    getFilterOptions()
      .then((opts) => {
        setFilterOptions(opts);
        setOptionsLoaded(true);
      })
      .catch(() => {
        // fallback to empty — silently fail
        setOptionsLoaded(true);
      });
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleClearFilters = () => {
    startTransition(() => router.push(pathname));
  };

  const hasActiveFilters = activeChannel || activeCountry || activeStartDate || activeEndDate;

  const selectClass = `
    appearance-none rounded-lg border border-[var(--border)] bg-[var(--card)] py-2 pl-3 pr-8 text-xs font-medium
    text-[var(--foreground)] shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
    transition-all cursor-pointer min-w-[150px]
  `;

  return (
    <div className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-sm mb-6">
      <div className="flex flex-wrap items-center gap-3">

        {/* Label */}
        <div className="flex items-center gap-1.5 text-[var(--muted-foreground)] shrink-0">
          <Filter className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-bold uppercase tracking-wider">Filters</span>
          {isPending && (
            <div className="h-3 w-3 border border-primary/40 border-t-primary rounded-full animate-spin ml-1" />
          )}
        </div>

        {/* Separator */}
        <div className="h-5 w-px bg-[var(--border)] shrink-0" />

        {/* Channel Dropdown */}
        <div className="relative">
          <select
            value={activeChannel}
            onChange={(e) => handleFilterChange('channel', e.target.value)}
            className={selectClass}
            disabled={!optionsLoaded}
          >
            <option value="">All Channels</option>
            {filterOptions.channels.map((ch) => (
              <option key={ch} value={ch}>{ch}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--muted-foreground)] pointer-events-none" />
        </div>

        {/* Country Dropdown */}
        {!hideCountry && (
          <div className="relative">
            <select
              value={activeCountry}
              onChange={(e) => handleFilterChange('country', e.target.value)}
              className={selectClass}
              disabled={!optionsLoaded}
            >
              <option value="">All Countries</option>
              {filterOptions.countries.map((ct) => (
                <option key={ct} value={ct}>{ct}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--muted-foreground)] pointer-events-none" />
          </div>
        )}

        {/* Date Pickers */}
        {!hideDates && (
          <>
            <div className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--foreground)]">
              <Calendar className="h-3.5 w-3.5 text-[var(--muted-foreground)] shrink-0" />
              <input
                type="date"
                value={activeStartDate}
                min={filterOptions.date_range?.min?.slice(0, 10)}
                max={filterOptions.date_range?.max?.slice(0, 10)}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="bg-transparent border-none text-xs focus:outline-none text-[var(--foreground)] max-w-[120px]"
                title="Start Date"
              />
            </div>
            <span className="text-[var(--muted-foreground)] text-xs">→</span>
            <div className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--foreground)]">
              <Calendar className="h-3.5 w-3.5 text-[var(--muted-foreground)] shrink-0" />
              <input
                type="date"
                value={activeEndDate}
                min={filterOptions.date_range?.min?.slice(0, 10)}
                max={filterOptions.date_range?.max?.slice(0, 10)}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="bg-transparent border-none text-xs focus:outline-none text-[var(--foreground)] max-w-[120px]"
                title="End Date"
              />
            </div>
          </>
        )}

        {/* Active filter badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {activeChannel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
              {activeChannel}
              <button onClick={() => handleFilterChange('channel', '')} className="hover:text-primary/60 ml-0.5">×</button>
            </span>
          )}
          {activeCountry && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
              {activeCountry}
              <button onClick={() => handleFilterChange('country', '')} className="hover:text-primary/60 ml-0.5">×</button>
            </span>
          )}
          {(activeStartDate || activeEndDate) && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
              {activeStartDate || '…'} → {activeEndDate || '…'}
              <button onClick={() => { handleFilterChange('startDate', ''); handleFilterChange('endDate', ''); }} className="hover:text-primary/60 ml-0.5">×</button>
            </span>
          )}
        </div>

        {/* Reset */}
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] transition-all border border-transparent hover:border-[var(--border)]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear All
          </button>
        )}
      </div>
    </div>
  );
}
