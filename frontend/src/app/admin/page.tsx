// src/app/admin/page.tsx
'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import {
  Upload, Database, CheckCircle2, AlertCircle, RefreshCw, Table2,
  FileText, Trash2, ChevronRight, Info,
} from 'lucide-react';

type Step = 'upload' | 'map' | 'preview' | 'done';

const REQUIRED_FIELDS = ['customer_id', 'order_id', 'order_date', 'total_amount'];

function StepIndicator({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: 'upload', label: 'Upload CSV' },
    { id: 'map', label: 'Map Schema' },
    { id: 'preview', label: 'Preview' },
    { id: 'done', label: 'Ingested' },
  ];
  const currentIdx = steps.findIndex((s) => s.id === step);
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => (
        <React.Fragment key={s.id}>
          <div className="flex flex-col items-center gap-1">
            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i < currentIdx ? 'bg-emerald-500 text-white' :
              i === currentIdx ? 'bg-primary text-white shadow-md shadow-primary/30' :
              'bg-[var(--secondary)] text-[var(--muted-foreground)]'
            }`}>
              {i < currentIdx ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-[10px] font-semibold whitespace-nowrap ${
              i === currentIdx ? 'text-primary' : 'text-[var(--muted-foreground)]'
            }`}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 w-12 mb-4 mx-1 transition-all ${i < currentIdx ? 'bg-emerald-400' : 'bg-[var(--border)]'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const [step, setStep] = useState<Step>('upload');
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [mappedData, setMappedData] = useState<any[]>([]);
  const [isIngesting, setIsIngesting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [fileName, setFileName] = useState('');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setSelectedFile(file);
    setFileName(file.name);
    // Parse ONLY the first chunk to get headers (fast & memory efficient)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      preview: 5, // Just get headers and a few rows for preview
      complete: (res) => {
        if (res.meta.fields) {
          setHeaders(res.meta.fields);
          // Set raw data just for preview
          setCsvData(res.data as any[]);
          // Auto-map exact matches
          const autoMap: Record<string, string> = {};
          REQUIRED_FIELDS.forEach((f) => {
            if (res.meta.fields!.includes(f)) autoMap[f] = f;
          });
          setMapping(autoMap);
          setStep('map');
        }
      },
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
  });

  const handleMappingComplete = () => {
    const isComplete = REQUIRED_FIELDS.every((f) => mapping[f]);
    if (!isComplete) { alert('Please map all required fields.'); return; }
    // We don't map the whole data here anymore, just the preview
    const previewMapped = csvData.map((row) => ({
      customer_id: row[mapping['customer_id']],
      order_id: row[mapping['order_id']],
      order_date: row[mapping['order_date']],
      total_amount: row[mapping['total_amount']],
    }));
    setMappedData(previewMapped);
    setStep('preview');
  };

  const handleIngest = async () => {
    if (!selectedFile) return;
    setIsIngesting(true);
    setResult(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('mapping', JSON.stringify(mapping));

      const res = await fetch('http://127.0.0.1:8000/api/ingest', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Ingestion failed');
      }
      const data = await res.json();
      setResult({ type: 'success', message: data.message || 'File ingested successfully.' });
      setStep('done');
    } catch (err: any) {
      setResult({ type: 'error', message: err.message || 'Ingestion failed.' });
    } finally {
      setIsIngesting(false);
    }
  };

  const handleRefreshPipeline = async () => {
    setIsRefreshing(true);
    setResult(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const res = await fetch('http://127.0.0.1:8000/api/refresh', {
        method: 'POST',
        headers: {
          'X-User-Role': 'admin',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Refresh failed');
      }
      setResult({ type: 'success', message: 'ETL pipeline ran successfully. Dashboard data refreshed.' });
    } catch (err: any) {
      setResult({ type: 'error', message: err.message });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setCsvData([]);
    setHeaders([]);
    setMapping({});
    setMappedData([]);
    setResult(null);
    setFileName('');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border)] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Dataset Manager</h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Upload transaction CSV files, map schema columns, and ingest data into the analytics pipeline.
          </p>
        </div>
        <button
          onClick={handleRefreshPipeline}
          disabled={isRefreshing}
          className="mt-4 sm:mt-0 flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-primary/25 hover:opacity-90 transition-all disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Running Pipeline…' : 'Refresh ETL Pipeline'}
        </button>
      </div>

      {/* Result Banner */}
      {result && (
        <div className={`flex items-start gap-3 rounded-xl px-4 py-3 border text-sm font-medium ${
          result.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400'
            : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400'
        }`}>
          {result.type === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" /> : <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />}
          {result.message}
        </div>
      )}

      {/* Step Indicator */}
      <div className="flex justify-center py-2">
        <StepIndicator step={step} />
      </div>

      {/* Step: Upload */}
      {step === 'upload' && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <h2 className="text-base font-bold text-[var(--foreground)] mb-2">Step 1 — Upload CSV File</h2>
          <p className="text-xs text-[var(--muted-foreground)] mb-6">
            Upload any CSV with transaction data. We'll help you map the columns to the required schema.
          </p>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
              isDragActive
                ? 'border-primary bg-primary/5 scale-[1.01]'
                : 'border-[var(--border)] hover:border-primary/50 hover:bg-[var(--secondary)]'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-10 w-10 mx-auto mb-3 text-[var(--muted-foreground)]" />
            {isDragActive ? (
              <p className="text-primary font-semibold">Drop the file here…</p>
            ) : (
              <>
                <p className="font-semibold text-[var(--foreground)]">Drag & drop a CSV file here</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">or click to browse files</p>
              </>
            )}
            <p className="text-[10px] text-[var(--muted-foreground)] mt-4">Supports: .csv — Max 1GB</p>
          </div>
          {/* Required columns hint */}
          <div className="mt-6 rounded-lg bg-[var(--secondary)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs font-bold text-[var(--foreground)]">Required fields</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {REQUIRED_FIELDS.map((f) => (
                <code key={f} className="rounded-md bg-[var(--card)] border border-[var(--border)] px-2 py-1 text-[11px] font-mono text-primary">{f}</code>
              ))}
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-2">Your CSV columns don't need to match exactly — you'll map them in the next step.</p>
          </div>
        </div>
      )}

      {/* Step: Map */}
      {step === 'map' && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-[var(--foreground)]">Step 2 — Map Schema Columns</h2>
            <button onClick={handleReset} className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex items-center gap-1">
              <Trash2 className="h-3.5 w-3.5" /> Start over
            </button>
          </div>
          <div className="flex items-center gap-2 mb-6">
            <FileText className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-semibold text-[var(--foreground)]">{fileName}</span>
            <span className="text-[10px] text-[var(--muted-foreground)]">
              ({selectedFile ? (selectedFile.size / 1024 / 1024).toFixed(2) : 0} MB · {headers.length} columns detected)
            </span>
          </div>
          <div className="space-y-4">
            {REQUIRED_FIELDS.map((field) => (
              <div key={field} className="flex items-center gap-4">
                <div className="w-40 shrink-0">
                  <code className="text-[11px] font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">{field}</code>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" />
                <div className="relative flex-1">
                  <select
                    value={mapping[field] || ''}
                    onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] py-2.5 px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">— select column —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
                {mapping[field] && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-8">
            <button
              onClick={handleMappingComplete}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-primary/25 hover:opacity-90 transition-all"
            >
              Continue to Preview <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden">
          <div className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                <Table2 className="h-4 w-4 text-primary" />
                Step 3 — Preview Mapped Data
              </h2>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                Showing preview rows
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep('map')} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--secondary)] transition-all">
                Back
              </button>
              <button
                onClick={handleIngest}
                disabled={isIngesting}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-all disabled:opacity-60"
              >
                {isIngesting ? <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Database className="h-3.5 w-3.5" />}
                {isIngesting ? 'Ingesting…' : 'Ingest Entire File'}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)] font-semibold uppercase tracking-wider text-[10px]">
                  {REQUIRED_FIELDS.map((f) => <th key={f} className="py-3 px-5">{f}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-[var(--foreground)]">
                {mappedData.slice(0, 10).map((row, i) => (
                  <tr key={i} className="hover:bg-[var(--secondary)] transition-colors">
                    {REQUIRED_FIELDS.map((f) => (
                      <td key={f} className="py-3 px-5 font-mono text-[11px] max-w-[180px] truncate">{row[f] ?? '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === 'done' && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/20 p-10 text-center shadow-sm">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[var(--foreground)]">Data Ingested Successfully</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-2 mb-6">
            The dataset has been written. Run the ETL pipeline to regenerate all analytics tables.
          </p>
          <div className="flex justify-center gap-3">
            <button onClick={handleRefreshPipeline} disabled={isRefreshing}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all disabled:opacity-60">
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Running…' : 'Run ETL Pipeline'}
            </button>
            <button onClick={handleReset} className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--secondary)] transition-all">
              Upload Another File
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
