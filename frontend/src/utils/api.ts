// src/utils/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('authToken');
  const role = localStorage.getItem('userRole') || 'viewer';
  const headers: Record<string, string> = { 'X-User-Role': role };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

interface FilterParams {
  channel?: string;
  country?: string;
  startDate?: string;
  endDate?: string;
}

function buildQueryParams(filters: FilterParams): string {
  const params = new URLSearchParams();
  if (filters.channel) params.append('channel', filters.channel);
  if (filters.country) params.append('country', filters.country);
  if (filters.startDate) params.append('start_date', filters.startDate);
  if (filters.endDate) params.append('end_date', filters.endDate);
  const str = params.toString();
  return str ? `?${str}` : '';
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Login failed' }));
    throw new Error(err.detail || 'Login failed');
  }
  return res.json();
}

export async function getFilterOptions() {
  const res = await fetch(`${API_BASE_URL}/api/filter-options`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch filter options');
  return res.json() as Promise<{
    channels: string[];
    countries: string[];
    date_range: { min: string; max: string } | null;
  }>;
}

export async function getKPIs(filters: FilterParams) {
  const query = buildQueryParams(filters);
  const res = await fetch(`${API_BASE_URL}/api/kpis${query}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch KPIs');
  return res.json();
}

export async function getCohortRetention(granularity: 'monthly' | 'weekly', filters: FilterParams) {
  const params = new URLSearchParams();
  if (filters.channel) params.append('channel', filters.channel);
  if (filters.country) params.append('country', filters.country);
  params.append('granularity', granularity);
  const res = await fetch(`${API_BASE_URL}/api/cohort-retention?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch cohort retention');
  return res.json();
}

export async function getRFM(filters: FilterParams) {
  const params = new URLSearchParams();
  if (filters.channel) params.append('channel', filters.channel);
  if (filters.country) params.append('country', filters.country);
  const res = await fetch(`${API_BASE_URL}/api/rfm?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch RFM data');
  return res.json();
}

export async function getChannelPerformance(filters: FilterParams) {
  const params = new URLSearchParams();
  if (filters.channel) params.append('channel', filters.channel);
  const res = await fetch(`${API_BASE_URL}/api/channel-performance?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch channel performance');
  return res.json();
}

export async function triggerRefresh(role: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  const res = await fetch(`${API_BASE_URL}/api/refresh`, {
    method: 'POST',
    headers: {
      'X-User-Role': role,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to refresh data' }));
    throw new Error(err.detail || 'Failed to refresh data');
  }
  return res.json();
}
