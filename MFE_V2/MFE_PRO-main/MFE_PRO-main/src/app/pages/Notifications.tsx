import { useState, useEffect, useRef } from 'react';
import { Bell, Send, Users, MapPin, Megaphone, Zap, Wrench, TrendingUp, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { notificationsApi, type ApiNotification } from '../lib/api';
import { useTenant } from '../contexts/TenantContext';

const TYPE_META: Record<ApiNotification['type'], { label: string; color: string; icon: React.ReactNode }> = {
  station_available:    { label: 'Available',    color: 'bg-green-100 text-green-700',   icon: <Zap className="h-3.5 w-3.5" /> },
  station_maintenance:  { label: 'Maintenance',  color: 'bg-orange-100 text-orange-700', icon: <Wrench className="h-3.5 w-3.5" /> },
  tariff_change:        { label: 'Tariff',       color: 'bg-yellow-100 text-yellow-700', icon: <TrendingUp className="h-3.5 w-3.5" /> },
  new_station:          { label: 'New Station',  color: 'bg-blue-100 text-blue-700',     icon: <Plus className="h-3.5 w-3.5" /> },
  broadcast:            { label: 'Broadcast',    color: 'bg-purple-100 text-purple-700', icon: <Megaphone className="h-3.5 w-3.5" /> },
};

function TypeBadge({ type }: { type: ApiNotification['type'] }) {
  const m = TYPE_META[type];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${m.color}`}>
      {m.icon}{m.label}
    </span>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Notifications() {
  const { currentTenant, currentUser } = useTenant();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const [clearing, setClearing] = useState(false);
  const [title,    setTitle]    = useState('');
  const [body,     setBody]     = useState('');
  const [city,     setCity]     = useState('');
  const [tenantTarget, setTenantTarget] = useState<string>('');

  const abortRef = useRef<AbortController | null>(null);

  async function loadNotifications() {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      const tenantId = isSuperAdmin ? tenantTarget || undefined : currentTenant?.id;
      const data = await notificationsApi.list(tenantId, abortRef.current.signal);
      setNotifications(data);
    } catch (e: any) {
      if (e?.name !== 'AbortError') toast.error('Failed to load notification history');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadNotifications(); }, [currentTenant?.id, tenantTarget]);

  async function handleBroadcast(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) { toast.error('Title and message are required'); return; }
    setSending(true);
    try {
      const tenantId = isSuperAdmin ? tenantTarget || currentTenant?.id : currentTenant?.id;
      const result = await notificationsApi.broadcast({
        title: title.trim(),
        body:  body.trim(),
        ...(city.trim()     ? { city_filter: city.trim() }  : {}),
        ...(tenantId        ? { tenant_id:   tenantId }      : {}),
      });
      toast.success(`Sent to ${result.recipients} app user${result.recipients !== 1 ? 's' : ''}`);
      setTitle(''); setBody(''); setCity('');
      loadNotifications();
    } catch {
      toast.error('Broadcast failed');
    } finally {
      setSending(false);
    }
  }

  async function handleClear() {
    if (!window.confirm('Clear all notification history? This cannot be undone.')) return;
    setClearing(true);
    try {
      const tenantId = isSuperAdmin ? tenantTarget || undefined : currentTenant?.id;
      await notificationsApi.clearHistory(tenantId);
      setNotifications([]);
      toast.success('Notification history cleared');
    } catch {
      toast.error('Failed to clear history');
    } finally {
      setClearing(false);
    }
  }

  const accentColor = currentTenant?.accentColor ?? '#2563eb';

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ backgroundColor: `${accentColor}20` }}>
            <Bell className="h-6 w-6" style={{ color: accentColor }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Push Notifications</h1>
            <p className="text-sm text-muted-foreground">Send messages to app users &amp; view history</p>
          </div>
        </div>
        <button
          onClick={loadNotifications}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border hover:bg-accent transition-colors"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Compose panel ── */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm">Compose Broadcast</span>
            </div>
            <form onSubmit={handleBroadcast} className="p-5 space-y-4">

              {isSuperAdmin && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Tenant</label>
                  <select
                    value={tenantTarget}
                    onChange={e => setTenantTarget(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">All tenants</option>
                    <option value="sonelgaz">Sonelgaz</option>
                    <option value="saeig">SAEIG</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  <MapPin className="inline h-3 w-3 mr-1" />City filter <span className="text-muted-foreground/60">(optional)</span>
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="e.g. Alger, Oran…"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Short, impactful title"
                  maxLength={200}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Message *</label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Write your message…"
                  maxLength={1000}
                  rows={4}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                <p className="text-xs text-muted-foreground/50 mt-1 text-right">{body.length}/1000</p>
              </div>

              <div className="rounded-lg bg-muted/40 px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5 shrink-0" />
                Sends to all app users{city.trim() ? ` in ${city.trim()}` : ''} with a registered device.
              </div>

              <button
                type="submit"
                disabled={sending || !title.trim() || !body.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-colors"
                style={{ backgroundColor: accentColor }}
              >
                {sending
                  ? <><RefreshCw className="h-4 w-4 animate-spin" /> Sending…</>
                  : <><Send className="h-4 w-4" /> Send Broadcast</>
                }
              </button>
            </form>
          </div>
        </div>

        {/* ── History panel ── */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-border bg-card shadow-sm h-full">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-sm">Notification History</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{notifications.length} sent</span>
                <button
                  onClick={handleClear}
                  disabled={clearing || notifications.length === 0}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {clearing
                    ? <RefreshCw className="h-3 w-3 animate-spin" />
                    : <Trash2 className="h-3 w-3" />
                  }
                  Clear History
                </button>
              </div>
            </div>

            <div className="divide-y divide-border">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                  <Bell className="h-10 w-10 opacity-20" />
                  <p className="text-sm">No notifications sent yet</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.notification_id} className="px-5 py-4 hover:bg-accent/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <TypeBadge type={n.type} />
                          {n.city_filter && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />{n.city_filter}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</p>
                        <div className="flex items-center gap-1 mt-1 justify-end text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{n.recipients_count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
