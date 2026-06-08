/**
 * Centralised API client.
 * All components import from here — never fetch() directly in pages.
 *
 * Switch the app from localStorage → real backend by setting
 *   VITE_API_BASE_URL=http://localhost:3001/api
 * in a .env file at the project root.
 */

import type {
  User, Station, Session, Ticket, TicketActivity,
  BillingRecord, Alert, KPIData,
} from '../types';

const BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

// ── Token storage ──────────────────────────────────────────────
const TOKEN_KEY = 'evcharge.jwt';

export function saveToken(token: string)  { localStorage.setItem(TOKEN_KEY, token); }
export function clearToken()              { localStorage.removeItem(TOKEN_KEY); }
export function getToken(): string | null { return localStorage.getItem(TOKEN_KEY); }

// ── Base fetch ─────────────────────────────────────────────────
async function req<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  if (!BASE) throw new Error('VITE_API_BASE_URL is not set');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

const get    = <T>(path: string)              => req<T>('GET',    path);
const post   = <T>(path: string, body: unknown) => req<T>('POST',   path, body);
const patch  = <T>(path: string, body: unknown) => req<T>('PATCH',  path, body);
const del    = <T>(path: string)              => req<T>('DELETE', path);

function asDate(value: unknown): Date {
  if (value instanceof Date) return value;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function normalizeTicket(ticket: Ticket): Ticket {
  return {
    ...ticket,
    createdAt: asDate(ticket.createdAt),
    updatedAt: asDate(ticket.updatedAt),
    slaDeadline: asDate(ticket.slaDeadline),
  };
}

function normalizeTicketActivity(activity: TicketActivity): TicketActivity {
  return {
    ...activity,
    timestamp: asDate(activity.timestamp),
  };
}

// ── Auth ───────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string, tenantId: string) =>
    post<{ token: string; user: User }>('/auth/login', { email, password, tenantId }),
  me: () => get<User>('/auth/me'),
};

// ── Dashboard ──────────────────────────────────────────────────
export const dashboardApi = {
  kpis: (tenantId?: string) =>
    get<KPIData>(`/dashboard/kpis${tenantId ? `?tenantId=${tenantId}` : ''}`),
};

// ── Stations ───────────────────────────────────────────────────
export const stationsApi = {
  list: (tenantId?: string, status?: string) => {
    const p = new URLSearchParams();
    if (tenantId) p.set('tenantId', tenantId);
    if (status)   p.set('status', status);
    const qs = p.toString();
    return get<Station[]>(`/stations${qs ? `?${qs}` : ''}`);
  },
  get:    (id: string)          => get<Station>(`/stations/${id}`),
  create: (data: Partial<Station> & { tenant_id?: string }) =>
    post<{ id: string }>('/stations', data),
  update: (id: string, data: Partial<Station>) =>
    patch<{ success: boolean }>(`/stations/${id}`, data),
  delete: (id: string) => del<{ success: boolean }>(`/stations/${id}`),
};

// ── Sessions ───────────────────────────────────────────────────
export const sessionsApi = {
  list: (params?: { tenantId?: string; stationId?: string; status?: string; limit?: number; offset?: number }) => {
    const p = new URLSearchParams();
    if (params?.tenantId)  p.set('tenantId',  params.tenantId);
    if (params?.stationId) p.set('stationId', params.stationId);
    if (params?.status)    p.set('status',    params.status);
    if (params?.limit)     p.set('limit',     String(params.limit));
    if (params?.offset)    p.set('offset',    String(params.offset));
    const qs = p.toString();
    return get<Session[]>(`/sessions${qs ? `?${qs}` : ''}`);
  },
};

// ── Tickets ────────────────────────────────────────────────────
export const ticketsApi = {
  list: (params?: { tenantId?: string; status?: string; priority?: string; assignedToId?: string }) => {
    const p = new URLSearchParams();
    if (params?.tenantId)     p.set('tenantId',     params.tenantId);
    if (params?.status)       p.set('status',       params.status);
    if (params?.priority)     p.set('priority',     params.priority);
    if (params?.assignedToId) p.set('assignedToId', params.assignedToId);
    const qs = p.toString();
    return get<Ticket[]>(`/tickets${qs ? `?${qs}` : ''}`).then((tickets) =>
      tickets.map(normalizeTicket)
    );
  },
  create: (data: {
    station_id: string; title: string; description?: string;
    category: string; priority?: string; assigned_to_user_id?: string; sla_deadline?: string;
  }) => post<{ id: string }>('/tickets', data),
  update: (id: string, data: Partial<Ticket> & { assigned_to_user_id?: string }) =>
    patch<{ success: boolean }>(`/tickets/${id}`, data),
  getActivity: (id: string) =>
    get<TicketActivity[]>(`/tickets/${id}/activity`).then((activities) =>
      activities.map(normalizeTicketActivity)
    ),
  addActivity: (id: string, action: string, details?: string) =>
    post<{ id: string }>(`/tickets/${id}/activity`, { action, details }),
};

// ── Billing ────────────────────────────────────────────────────
export const billingApi = {
  list: (params?: { tenantId?: string; status?: string; stationId?: string }) => {
    const p = new URLSearchParams();
    if (params?.tenantId)  p.set('tenantId',  params.tenantId);
    if (params?.status)    p.set('status',    params.status);
    if (params?.stationId) p.set('stationId', params.stationId);
    const qs = p.toString();
    return get<BillingRecord[]>(`/billing${qs ? `?${qs}` : ''}`);
  },
};

// ── Alerts ─────────────────────────────────────────────────────
export const alertsApi = {
  list: (params?: { tenantId?: string; severity?: string; unread?: boolean }) => {
    const p = new URLSearchParams();
    if (params?.tenantId)  p.set('tenantId',  params.tenantId);
    if (params?.severity)  p.set('severity',  params.severity);
    if (params?.unread)    p.set('unread',    'true');
    const qs = p.toString();
    return get<Alert[]>(`/alerts${qs ? `?${qs}` : ''}`);
  },
  markRead:    (id: string)   => patch<{ success: boolean }>(`/alerts/${id}/read`, {}),
  markAllRead: ()             => patch<{ success: boolean }>('/alerts/read-all', {}),
};

// ── Users ──────────────────────────────────────────────────────
export const usersApi = {
  list: (tenantId?: string) =>
    get<User[]>(`/users${tenantId ? `?tenantId=${tenantId}` : ''}`),
  create: (data: { email: string; password: string; full_name: string; role: string; tenant_id?: string; privilege_template?: string }) =>
    post<{ id: string }>('/users', data),
  update: (id: string, data: Partial<User> & { privilege_template?: string }) =>
    patch<{ success: boolean }>(`/users/${id}`, data),
};
