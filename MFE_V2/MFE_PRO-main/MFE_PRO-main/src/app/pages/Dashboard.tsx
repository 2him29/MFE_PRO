import { useState, useEffect, useCallback } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  Activity, AlertTriangle, Battery, DollarSign, TrendingUp, Zap,
  WifiOff, Wrench, Signal, RotateCw, Clock, ArrowRight,
} from "lucide-react";
import {
  Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip,
  XAxis, YAxis, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useTenant } from "../contexts/TenantContext";
import { KPICard } from "../components/dashboard/KPICard";
import { KPICardSkeleton, ChartSkeleton } from "../components/dashboard/LoadingState";
import { AnimatedCard } from "../components/dashboard/AnimatedCard";
import { RevenueTrendChart } from "../components/dashboard/RevenueTrendChart";
import { StatusChip } from "../components/dashboard/StatusChip";
import { Button } from "../components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  dashboardApi, DashboardKPIs, TrendPoint, HourlyPoint, TopStation,
  alertsApi, ApiAlert, ticketsApi,
} from "../lib/api";

type DateFilter    = "today" | "7d" | "30d";

const STATUS_COLORS: Record<string, string> = {
  available:   '#16a34a',
  charging:    '#2563eb',
  offline:     '#6b7280',
  fault:       '#dc2626',
  maintenance: '#d97706',
};

const rankColors = ['#fbbf24', '#9ca3af', '#b45309'];

const tooltipStyle = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { currentTenant, currentUser } = useTenant();
  const accentColor = currentTenant?.accentColor ?? "#2563eb";
  const navigate    = useNavigate();

  const tenantScope = currentUser?.role === 'super_admin' ? undefined : currentUser?.tenantId;

  const [dateFilter, setDateFilter] = useState<DateFilter>(
    () => (localStorage.getItem('evcharge.dashboard.dateFilter') as DateFilter) ?? '30d'
  );
  const [loading, setLoading]             = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [autoRefresh, setAutoRefresh]     = useState(false);

  // Real data state
  const [kpis, setKpis]               = useState<DashboardKPIs | null>(null);
  const [trends, setTrends]           = useState<TrendPoint[]>([]);
  const [hourly, setHourly]           = useState<HourlyPoint[]>([]);
  const [topStations, setTopStations] = useState<TopStation[]>([]);
  const [alerts, setAlerts]           = useState<ApiAlert[]>([]);
  const [urgentCount, setUrgentCount] = useState(0);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [kpiData, trendData, hourlyData, topData, alertData] = await Promise.all([
        dashboardApi.kpis(tenantScope, dateFilter),
        dashboardApi.trends(tenantScope, 30),
        dashboardApi.hourly(tenantScope),
        dashboardApi.topStations(tenantScope, 5),
        alertsApi.list(tenantScope),
      ]);
      setKpis(kpiData);
      setTrends(trendData);
      setHourly(hourlyData);
      setTopStations(topData);
      setAlerts(alertData.slice(0, 5));

      // urgent tickets count
      try {
        const tickets = await ticketsApi.list();
        const urgent = tickets.filter((t) =>
          t.status === 'escalated' ||
          t.priority === 'critical' ||
          (t.slaDeadline && new Date(t.slaDeadline).getTime() < Date.now() && t.status !== 'resolved')
        );
        setUrgentCount(urgent.length);
      } catch { /* tickets failing shouldn't break the dashboard */ }

    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  }, [tenantScope, dateFilter]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => { void fetchAll(); }, 60_000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchAll]);

  const handleDateFilter = (v: string) => {
    const f = v as DateFilter;
    setDateFilter(f);
    localStorage.setItem('evcharge.dashboard.dateFilter', f);
  };

  // Station status donut — built from KPI counts
  const statusDonutData = kpis ? [
    { name: 'Available',   value: kpis.activeStations,   color: STATUS_COLORS.available },
    { name: 'Charging',    value: kpis.chargingStations,  color: STATUS_COLORS.charging },
    { name: 'Offline',     value: kpis.offlineStations - kpis.faults, color: STATUS_COLORS.offline },
    { name: 'Fault',       value: kpis.faults,            color: STATUS_COLORS.fault },
    { name: 'Maintenance', value: kpis.underMaintenance,  color: STATUS_COLORS.maintenance },
  ].filter((d) => d.value > 0) : [];

  return (
    <div className="space-y-6">

      {/* ── Greeting Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">
            {getGreeting()}, {currentUser?.name?.split(' ')[0] ?? 'Admin'}
          </h1>
          <p className="text-gray-500 mt-1 flex items-center gap-2 flex-wrap text-sm">
            <span>{currentTenant?.name ?? 'EV Charge DZ'}</span>
            <span className="text-gray-300">·</span>
            <span>{kpis?.totalStations ?? '—'} stations</span>
            <span className="text-gray-300">·</span>
            <Clock className="h-3.5 w-3.5" />
            <span className="text-xs">
              Updated {formatDistanceToNow(lastRefreshed, { addSuffix: true })}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh((v) => !v)}
            className="gap-1.5"
          >
            <RotateCw className={`h-3.5 w-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto ON' : 'Auto-refresh'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void fetchAll()} className="gap-1.5">
            <RotateCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Tabs value={dateFilter} onValueChange={handleDateFilter}>
            <TabsList>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="7d">7 Days</TabsTrigger>
              <TabsTrigger value="30d">30 Days</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* ── Urgent Tickets Banner ──────────────────────────────────────────── */}
      {!loading && urgentCount > 0 && (
        <div
          className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 px-4 py-3 cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors"
          onClick={() => navigate('/tickets')}
          role="button"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              {urgentCount} ticket{urgentCount > 1 ? 's' : ''} require immediate attention
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-red-500 flex-shrink-0" />
        </div>
      )}

      {/* ── Fleet Health Bar ───────────────────────────────────────────────── */}
      {!loading && kpis && kpis.totalStations > 0 && (
        <AnimatedCard delay={0.05}>
          <CardContent className="py-4 px-6">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <p className="text-sm font-medium">Fleet Health — {kpis.totalStations} stations total</p>
              <div className="flex items-center gap-4 flex-wrap">
                {statusDonutData.map(({ name, value, color }) => (
                  <span key={name} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    {name} ({value})
                  </span>
                ))}
              </div>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden gap-px">
              {statusDonutData.map(({ name, value, color }) => (
                <div
                  key={name}
                  className="transition-all"
                  style={{ width: `${(value / kpis.totalStations) * 100}%`, backgroundColor: color }}
                  title={`${name}: ${value}`}
                />
              ))}
            </div>
          </CardContent>
        </AnimatedCard>
      )}

      {/* ── KPI Row 1: Station Health ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />) : (
          <>
            <KPICard title="Active Stations"   value={kpis?.activeStations ?? 0}    trend={kpis?.activeStationsTrend ?? 0}    icon={<Zap      className="h-6 w-6" />} accentColor={accentColor} />
            <KPICard title="Offline Stations"  value={kpis?.offlineStations ?? 0}   trend={kpis?.offlineStationsTrend ?? 0}   icon={<WifiOff  className="h-6 w-6" />} accentColor="#dc2626"     invertTrend />
            <KPICard title="Under Maintenance" value={kpis?.underMaintenance ?? 0}  trend={kpis?.underMaintenanceTrend ?? 0}  icon={<Wrench   className="h-6 w-6" />} accentColor="#d97706"     invertTrend />
            <KPICard title="Network Uptime"    value={`${(kpis?.networkUptime ?? 0).toFixed(1)}%`} trend={kpis?.networkUptimeTrend ?? 0} icon={<Signal className="h-6 w-6" />} accentColor="#0d9488" />
          </>
        )}
      </div>

      {/* ── KPI Row 2: Operations ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i + 4} />) : (
          <>
            <KPICard title="Active Sessions"        value={kpis?.activeSessions ?? 0}                               trend={kpis?.activeSessionsTrend ?? 0}  icon={<Activity     className="h-6 w-6" />} accentColor={accentColor} />
            <KPICard title="Energy Delivered (kWh)" value={(kpis?.totalEnergy ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} trend={kpis?.totalEnergyTrend ?? 0}  icon={<Battery      className="h-6 w-6" />} accentColor="#2563eb" />
            <KPICard title="Revenue (DZD)"          value={`${((kpis?.totalRevenue ?? 0) / 1000).toFixed(1)}K`}     trend={kpis?.totalRevenueTrend ?? 0}     icon={<DollarSign   className="h-6 w-6" />} accentColor="#16a34a" />
            <KPICard title="Active Faults"          value={kpis?.faults ?? 0}                                       trend={kpis?.faultsTrend ?? 0}           icon={<AlertTriangle className="h-6 w-6" />} accentColor="#dc2626" invertTrend />
          </>
        )}
      </div>

      {/* ── Charts Row: Revenue Trend + Station Status Donut ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AnimatedCard className="lg:col-span-2" delay={0.1}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Revenue & Energy Trends (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? <ChartSkeleton height={300} /> : (
              <div style={{ height: '300px' }}>
                <RevenueTrendChart accentColor={accentColor} data={trends} />
              </div>
            )}
          </CardContent>
        </AnimatedCard>

        <AnimatedCard delay={0.2}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Station Status</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? <ChartSkeleton height={300} /> : (
              <div style={{ height: '300px' }}>
                {statusDonutData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No stations yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusDonutData} cx="50%" cy="45%" innerRadius={58} outerRadius={92} paddingAngle={3} dataKey="value">
                        {statusDonutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [`${v} stations`, name]} />
                      <Legend verticalAlign="bottom" height={36} formatter={(v) => <span style={{ color: 'var(--foreground)', fontSize: 11 }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}
          </CardContent>
        </AnimatedCard>
      </div>

      {/* ── 24h Energy + Sessions ─────────────────────────────────────────── */}
      <AnimatedCard delay={0.3}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Energy & Sessions (24h — Today)</CardTitle>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-4 h-0.5 rounded" style={{ backgroundColor: accentColor }} />
                Energy (kWh)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-4 h-0.5 rounded bg-amber-400" />
                Sessions
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <ChartSkeleton height={250} /> : (
            hourly.every((h) => h.energy === 0 && h.sessions === 0) ? (
              <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
                No charging activity today yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={hourly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="time" stroke="var(--muted-foreground)" fontSize={12} interval={3} />
                  <YAxis yAxisId="energy"   stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis yAxisId="sessions" orientation="right" stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--popover-foreground)' }} itemStyle={{ color: 'var(--popover-foreground)' }} />
                  <Line yAxisId="energy"   type="monotone" dataKey="energy"   name="Energy (kWh)" stroke={accentColor} strokeWidth={3} dot={{ fill: accentColor, r: 4 }} />
                  <Line yAxisId="sessions" type="monotone" dataKey="sessions" name="Sessions"     stroke="#f59e0b"     strokeWidth={2} strokeDasharray="5 3" dot={{ fill: '#f59e0b', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )
          )}
        </CardContent>
      </AnimatedCard>

      {/* ── Bottom Row: Top Stations + Recent Alerts ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <AnimatedCard className="lg:col-span-2" delay={0.35}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Top Stations by Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? <ChartSkeleton height={200} /> : topStations.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No completed sessions yet.</p>
            ) : (
              <div className="space-y-1">
                <div className="grid grid-cols-4 text-xs text-gray-400 font-medium px-3 pb-2 border-b">
                  <span>Station</span>
                  <span className="text-right">Revenue (DZD)</span>
                  <span className="text-right">Energy (kWh)</span>
                  <span className="text-right">Sessions</span>
                </div>
                {topStations.map((s, i) => (
                  <div key={s.name} className="grid grid-cols-4 items-center px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-white"
                        style={{ backgroundColor: rankColors[i] ?? '#e5e7eb', color: i < 3 ? 'white' : '#374151' }}
                      >{i + 1}</span>
                      <span className="text-sm font-medium truncate">{s.name}</span>
                    </div>
                    <span className="text-sm text-right font-semibold text-green-600">{Math.round(s.revenue).toLocaleString()}</span>
                    <span className="text-sm text-right text-blue-600">{Math.round(s.energy).toLocaleString()}</span>
                    <span className="text-sm text-right text-gray-500">{s.sessions}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </AnimatedCard>

        <AnimatedCard delay={0.4}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Recent Alerts
              </CardTitle>
              <span className="text-xs text-gray-400">{alerts.length} shown</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No recent alerts.</p>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-2.5 p-2.5 border rounded-lg hover:bg-muted/50 transition-colors">
                    <StatusChip status={alert.severity} type="alert" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium leading-tight">{alert.message}</p>
                      {alert.stationName && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{alert.stationName}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {format(new Date(alert.timestamp), 'HH:mm')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </AnimatedCard>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────────── */}
      <AnimatedCard delay={0.45}>
        <CardContent className="py-4 px-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Quick Actions</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => navigate('/tickets')}  className="gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Tickets</Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/sessions')} className="gap-1.5"><Activity      className="h-3.5 w-3.5" /> Sessions</Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/stations')} className="gap-1.5"><Zap           className="h-3.5 w-3.5" /> Stations</Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/billing')}  className="gap-1.5"><DollarSign    className="h-3.5 w-3.5" /> Billing</Button>
            </div>
          </div>
        </CardContent>
      </AnimatedCard>

    </div>
  );
}
