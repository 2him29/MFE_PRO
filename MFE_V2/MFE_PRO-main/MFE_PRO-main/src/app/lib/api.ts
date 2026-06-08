// Single source of truth for backend HTTP calls from the React dashboard.
// Add new endpoints here so retries, base URL and auth header live in one place.

import { API_BASE } from './env';
export { API_BASE };

const TOKEN_KEY = 'evcharge.token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else       localStorage.removeItem(TOKEN_KEY);
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;         // attach Authorization header (default true)
  signal?: AbortSignal;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, signal } = opts;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
    signal,
  });

  let payload: unknown = null;
  try { payload = await res.json(); } catch { /* empty body */ }

  if (!res.ok) {
    const msg =
      (typeof payload === 'object' && payload !== null && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : null) ?? `Server error (${res.status})`;
    throw new ApiError(res.status, msg);
  }

  return payload as T;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardKPIs {
  activeStations:       number;
  chargingStations:     number;
  offlineStations:      number;
  underMaintenance:     number;
  totalStations:        number;
  activeSessions:       number;
  periodSessions:       number;
  totalEnergy:          number;
  totalRevenue:         number;
  faults:               number;
  networkUptime:        number;
  totalEnergyTrend:     number;
  totalRevenueTrend:    number;
  activeStationsTrend:  number;
  activeSessionsTrend:  number;
  faultsTrend:          number;
  offlineStationsTrend: number;
  underMaintenanceTrend:number;
  networkUptimeTrend:   number;
}

export interface TrendPoint    { date: string;  revenue: number; energy: number; }
export interface HourlyPoint   { time: string;  energy: number;  sessions: number; }
export interface TopStation    { name: string;  revenue: number; energy: number; sessions: number; }

export const dashboardApi = {
  kpis: (tenantId?: string, range: 'today' | '7d' | '30d' = '30d') => {
    const q = new URLSearchParams({ range });
    if (tenantId) q.set('tenantId', tenantId);
    return api<DashboardKPIs>(`/api/dashboard/kpis?${q}`);
  },
  trends: (tenantId?: string, days = 30) => {
    const q = new URLSearchParams({ days: String(days) });
    if (tenantId) q.set('tenantId', tenantId);
    return api<TrendPoint[]>(`/api/dashboard/trends?${q}`);
  },
  hourly: (tenantId?: string) => {
    const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
    return api<HourlyPoint[]>(`/api/dashboard/hourly${q}`);
  },
  topStations: (tenantId?: string, limit = 5) => {
    const q = new URLSearchParams({ limit: String(limit) });
    if (tenantId) q.set('tenantId', tenantId);
    return api<TopStation[]>(`/api/dashboard/top-stations?${q}`);
  },
};

// ── Typed helpers ────────────────────────────────────────────────────────────

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: 'super_admin' | 'tenant_admin' | 'technician';
    tenantId: string;
    status?: 'active' | 'suspended';
  };
}

export const authApi = {
  login: (email: string, password: string, tenantId?: string) =>
    api<LoginResponse>('/api/auth/login', {
      method: 'POST',
      auth:   false,
      body:   { email, password, ...(tenantId ? { tenantId } : {}) },
    }),
};

export interface ApiStation {
  id: string;
  name: string;
  city: string;
  address: string;
  connectorType: string;
  power: number;
  status: 'available' | 'charging' | 'offline' | 'fault' | 'maintenance';
  tenantId: string;
  latitude: number;
  longitude: number;
  activeConnectors: number;
  totalConnectors: number;
  currentTariff: number;
  activeSessions?: number;
  unreadAlerts?: number;
}

export const stationsApi = {
  list: (tenantId?: string, signal?: AbortSignal) => {
    const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
    return api<ApiStation[]>(`/api/stations${q}`, { signal });
  },
  listArchived: (signal?: AbortSignal) =>
    api<ApiStation[]>('/api/stations?archived=true', { signal }),
  create: (body: {
    name: string;
    city: string;
    address: string;
    latitude: number;
    longitude: number;
    connector_type?: string;
    power_kw?: number;
    current_tariff_dzd_per_kwh?: number;
    tenant_id?: string;
  }) =>
    api<{ id: string }>('/api/stations', { method: 'POST', body }),
  updateStatus: (id: string, status: 'available' | 'charging' | 'offline' | 'fault' | 'maintenance') =>
    api<{ success: true }>(`/api/stations/${id}`, {
      method: 'PATCH',
      body:   { status },
    }),
  setTariff: (id: string, tariff: number) =>
    api<{ success: true }>(`/api/stations/${id}`, {
      method: 'PATCH',
      body:   { current_tariff_dzd_per_kwh: tariff },
    }),
  archive: (id: string) =>
    api<{ success: true }>(`/api/stations/${id}`, { method: 'DELETE' }),
  restore: (id: string) =>
    api<{ success: true }>(`/api/stations/${id}`, {
      method: 'PATCH',
      body:   { status: 'available' },
    }),
};

// ── Users ──────────────────────────────────────────────────────────────────

export interface ApiUser {
  id: string;
  tenantId: 'sonelgaz' | 'saeig';
  email: string;
  name: string;
  role: 'super_admin' | 'tenant_admin' | 'technician';
  status: 'active' | 'suspended';
  privilegeTemplate?: string | null;
  customPrivileges?: string[] | null;
  createdAt?: string;
}

export const usersApi = {
  list: (tenantId?: string, signal?: AbortSignal) => {
    const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
    return api<ApiUser[]>(`/api/users${q}`, { signal });
  },
  create: (body: {
    email: string;
    password: string;
    full_name: string;
    role: 'tenant_admin' | 'technician' | 'super_admin';
    tenant_id?: string;
    privilege_template?: string | null;
    custom_privileges?: string[] | null;
  }) =>
    api<{ id: string }>('/api/users', { method: 'POST', body }),
  update: (id: string, body: {
    full_name?: string;
    role?: 'super_admin' | 'tenant_admin' | 'technician';
    status?: 'active' | 'suspended';
    tenant_id?: string;
    privilege_template?: string | null;
    custom_privileges?: string[] | null;
  }) =>
    api<{ success: true }>(`/api/users/${id}`, { method: 'PATCH', body }),
};

// ── Sessions ───────────────────────────────────────────────────────────────

export interface ApiSession {
  id: string;
  stationName: string;
  connector: string;
  userIdentifier: string;
  appUserName:   string | null;
  appUserEmail:  string | null;
  paymentMethod: string | null;
  startTime: string;
  duration: number;
  energyKwh: number;
  cost: number;
  status: 'active' | 'completed' | 'stopped' | 'error';
  tenantId: string;
}

export const sessionsApi = {
  list: (params?: { status?: string; tenantId?: string; signal?: AbortSignal }) => {
    const q = new URLSearchParams();
    if (params?.status)   q.set('status', params.status);
    if (params?.tenantId) q.set('tenantId', params.tenantId);
    const qs = q.toString();
    return api<ApiSession[]>(`/api/sessions${qs ? `?${qs}` : ''}`, { signal: params?.signal });
  },
  action: (id: string, action: 'remote_stop' | 'flag_anomaly') =>
    api<{ success: true }>(`/api/sessions/${id}`, { method: 'PATCH', body: { action } }),
};

// ── Notifications ─────────────────────────────────────────────────────────

export interface ApiNotification {
  notification_id:  string;
  tenant_id:        string;
  type:             'station_available' | 'station_maintenance' | 'tariff_change' | 'new_station' | 'broadcast' | 'session_remote_stop' | 'session_anomaly';
  title:            string;
  body:             string;
  station_id:       string | null;
  city_filter:      string | null;
  created_by:       string | null;
  recipients_count: number;
  created_at:       string;
}

export const notificationsApi = {
  list: (tenantId?: string, signal?: AbortSignal) => {
    const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
    return api<ApiNotification[]>(`/api/notifications${q}`, { signal });
  },
  broadcast: (body: {
    title:        string;
    body:         string;
    city_filter?: string;
    tenant_id?:   string;
  }) =>
    api<{ success: true; recipients: number }>('/api/notifications/broadcast', {
      method: 'POST',
      body,
    }),
  clearHistory: (tenantId?: string) => {
    const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
    return api<{ success: true }>(`/api/notifications${q}`, { method: 'DELETE' });
  },
};

// ── Alerts ──────────────────────────────────────────────────────────────────

export interface ApiAlert {
  id:          string;
  message:     string;
  severity:    string;
  timestamp:   string;
  createdAt:   string;
  stationName: string | undefined;
  isRead:      boolean;
}

export const alertsApi = {
  list: (tenantId?: string, signal?: AbortSignal) => {
    const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
    return api<ApiAlert[]>(`/api/alerts${q}`, { signal });
  },
};

// ── Tickets ─────────────────────────────────────────────────────────────────

export interface ApiTicket {
  id: string;
  tenantId: string;
  stationName: string | null;
  title: string;
  description: string | null;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'escalated' | 'closed';
  assignedTo: string | null;
  assignedToId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  slaDeadline: string | null;
}

export interface ApiActivity {
  id: string;
  action: string;
  details: string | null;
  actorName: string | null;
  createdAt: string;
}

export const ticketsApi = {
  list: (params?: { status?: string; priority?: string; signal?: AbortSignal }) => {
    const q = new URLSearchParams();
    if (params?.status)   q.set('status', params.status);
    if (params?.priority) q.set('priority', params.priority);
    const qs = q.toString();
    return api<ApiTicket[]>(`/api/tickets${qs ? `?${qs}` : ''}`, { signal: params?.signal });
  },
  create: (body: {
    station_id:           string;
    title:                string;
    description?:         string;
    category:             string;
    priority?:            'low' | 'medium' | 'high' | 'critical';
    assigned_to_user_id?: string;
    sla_deadline?:        string;
    tenant_id?:           string;
  }) =>
    api<{ id: string }>('/api/tickets', { method: 'POST', body }),
  updateStatus: (id: string, status: 'open' | 'in_progress' | 'resolved' | 'escalated' | 'closed') =>
    api<{ success: true }>(`/api/tickets/${id}`, {
      method: 'PATCH',
      body:   { status },
    }),
  addActivity: (id: string, details: string) =>
    api<{ id: string }>(`/api/tickets/${id}/activity`, {
      method: 'POST',
      body:   { action: 'note', details },
    }),
  getActivity: (id: string) =>
    api<ApiActivity[]>(`/api/tickets/${id}/activity`),
};
