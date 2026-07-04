// src/components/DataTable.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { RFMCustomerRecord } from '@/types';
import { ChevronLeft, ChevronRight, Download, Search, SlidersHorizontal } from 'lucide-react';

interface DataTableProps {
  data: RFMCustomerRecord[];
}

type SortField = 'customer_id' | 'channel' | 'country' | 'recency_days' | 'frequency_count' | 'monetary_total' | 'segment';
type SortOrder = 'asc' | 'desc';

export default function DataTable({ data }: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('monetary_total');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Handle Search and Filtering
  const filteredData = useMemo(() => {
    return data.filter(
      (item) =>
        item.customer_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.segment.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  // Handle Sorting
  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredData, sortField, sortOrder]);

  // Handle Pagination
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc'); // Default to descending
    }
    setCurrentPage(1);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Customer ID', 'Acquisition Channel', 'Country', 'Recency (Days)', 'Frequency (Orders)', 'Monetary (LTV)', 'RFM Segment'];
    const rows = sortedData.map((item) => [
      item.customer_id,
      item.channel,
      item.country,
      item.recency_days,
      item.frequency_count,
      item.monetary_total.toFixed(2),
      item.segment,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `customer_retention_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get segment badge styling
  const getSegmentStyle = (seg: string) => {
    const normalSeg = seg.toLowerCase();
    if (normalSeg === 'champions') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
    }
    if (normalSeg === 'loyal customers') {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20';
    }
    if (normalSeg === 'recent customers') {
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
    }
    if (normalSeg === 'at risk') {
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
    }
    if (normalSeg === 'lost') {
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
    }
    return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  };

  return (
    <div className="w-full rounded-xl border border-border bg-card shadow-sm overflow-hidden dark:border-slate-800/80">
      
      {/* Table Controls (Search, Export) */}
      <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800/80">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search customer ID or segment..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-4 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:text-slate-200"
          />
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center justify-center space-x-1.5 rounded-lg border border-border bg-white py-2 px-4 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors focus:outline-none dark:bg-slate-850 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Download className="h-4 w-4 text-primary" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Table Element */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border bg-slate-50/50 dark:bg-slate-800/20 text-slate-500 font-semibold uppercase tracking-wider dark:border-slate-800/80">
              <th className="py-3 px-5 cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200" onClick={() => handleSort('customer_id')}>
                Customer ID {sortField === 'customer_id' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th className="py-3 px-5 cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200" onClick={() => handleSort('channel')}>
                Channel {sortField === 'channel' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th className="py-3 px-5 cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200" onClick={() => handleSort('country')}>
                Country {sortField === 'country' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th className="py-3 px-5 text-right cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200" onClick={() => handleSort('recency_days')}>
                Recency (Days) {sortField === 'recency_days' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th className="py-3 px-5 text-right cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200" onClick={() => handleSort('frequency_count')}>
                Frequency {sortField === 'frequency_count' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th className="py-3 px-5 text-right cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200" onClick={() => handleSort('monetary_total')}>
                Historical LTV {sortField === 'monetary_total' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th className="py-3 px-5 cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200" onClick={() => handleSort('segment')}>
                Segment {sortField === 'segment' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-350">
            {paginatedData.length > 0 ? (
              paginatedData.map((item) => (
                <tr key={item.customer_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  <td className="py-3 px-5 font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                    {item.customer_id}
                  </td>
                  <td className="py-3 px-5">{item.channel}</td>
                  <td className="py-3 px-5">{item.country}</td>
                  <td className="py-3 px-5 text-right tabular-nums">{item.recency_days} d</td>
                  <td className="py-3 px-5 text-right tabular-nums">{item.frequency_count} order(s)</td>
                  <td className="py-3 px-5 text-right font-semibold text-slate-900 dark:text-slate-200 tabular-nums">
                    ${item.monetary_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getSegmentStyle(item.segment)}`}>
                      {item.segment}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground">
                  No customers matching the active search or filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border p-4 dark:border-slate-800/80">
          <span className="text-[11px] text-muted-foreground">
            Showing <span className="font-semibold text-slate-700 dark:text-slate-350">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-350">
              {Math.min(currentPage * itemsPerPage, filteredData.length)}
            </span>{' '}
            of <span className="font-semibold text-slate-700 dark:text-slate-350">{filteredData.length}</span> customers
          </span>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1 rounded-md border border-border bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors focus:outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-slate-350 dark:hover:bg-slate-700"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-semibold px-3 text-slate-700 dark:text-slate-350">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1 rounded-md border border-border bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors focus:outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-slate-350 dark:hover:bg-slate-700"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
