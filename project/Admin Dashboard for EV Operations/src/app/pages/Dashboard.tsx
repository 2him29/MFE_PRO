import { useState, useEffect, useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Activity,
  AlertTriangle,
  Battery,
  DollarSign,
  TrendingUp,
  Zap,
  WifiOff,
  Wrench,
  ShieldCheck,
  User,
} from "lucide-react";
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { mockKPIData, mockAlerts, mockStations, mockSessions, mockBillingRecords } from "../data/mockData";
import { loadTickets } from "../data/ticketStore";
import { stationsApi, sessionsApi, ticketsApi, billingApi, alertsApi, dashboardApi } from "../services/api";
import { toast } from 'sonner';
import type { Session, BillingRecord, Alert as ApiAlert, KPIData } from "../types";
import { useTenant } from "../contexts/TenantContext";
import { KPICard } from "../components/dashboard/KPICard";
import { KPICardSkeleton, ChartSkeleton } from "../components/dashboard/LoadingState";
import { AnimatedCard } from "../components/dashboard/AnimatedCard";
import { ConnectorTypeChart } from "../components/dashboard/ConnectorTypeChart";
import { RevenueTrendChart } from "../components/dashboard/RevenueTrendChart";
import { StatusChip } from "../components/dashboard/StatusChip";
import { SideDrawer } from "../components/dashboard/SideDrawer";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Station, Ticket } from "../types";

type DateFilter = "today" | "7d" | "30d";
type DrilldownKey =
  | "activeStations"
  | "offlineStations"
  | "maintenanceStations"
  | "activeSessions"
  | "energy"
  | "revenue"
  | "uptime"
  | null;

const energyTrendData = [
  { time: "00:00", energy: 145 },
  { time: "04:00", energy: 89 },
  { time: "08:00", energy: 267 },
  { time: "12:00", energy: 398 },
  { time: "16:00", energy: 445 },
  { time: "20:00", energy: 312 },
];

const categoryLabels: Record<string, string> = {
  power_failure: "Power Failure",
  screen_issue: "Screen Issue",
  charger_fault: "Charger Fault",
  system_failure: "System Failure",
  network_issue: "Network Issue",
  maintenance: "Maintenance",
};

const drilldownTitles: Record<NonNullable<DrilldownKey>, string> = {
  activeStations: "Active Stations",
  offlineStations: "Offline Stations",
  maintenanceStations: "Stations Under Maintenance",
  activeSessions: "Active Sessions",
  energy: "Energy Delivered",
  revenue: "Revenue Breakdown",
  uptime: "Network Uptime",
};

function getStationUptime(station: Station): number {
  const id = parseInt(station.id.replace("STN-", ""));
  if (station.status === "available" || station.status === "charging") {
    return parseFloat((99 + (id % 10) / 10).toFixed(1));
  }
  if (station.status === "fault") return 80 + (id % 9);
  if (station.status === "offline") return 75 + (id % 8);
  return 94 + (id % 4);
}

export default function Dashboard() {
  const { currentTenant } = useTenant();
  const accentColor = currentTenant?.accentColor ?? "#2563eb";

  const [dateFilter, setDateFilter] = useState<DateFilter>(
    () => (localStorage.getItem('dashboard.dateFilter') as DateFilter) ?? 'today'
  );
  const [loading, setLoading] = useState(true);
  const [usingCachedData, setUsingCachedData] = useState(false);
  const [drilldown, setDrilldown] = useState<DrilldownKey>(null);

  const [apiStations, setApiStations] = useState<Station[] | null>(null);
  const [apiSessions, setApiSessions] = useState<Session[] | null>(null);
  const [apiBilling, setApiBilling] = useState<BillingRecord[] | null>(null);
  const [apiTickets, setApiTickets] = useState<Ticket[] | null>(null);
  const [apiAlerts, setApiAlerts] = useState<ApiAlert[] | null>(null);
  const [apiKpis, setApiKpis] = useState<KPIData | null>(null);

  const kpiData = apiKpis ?? mockKPIData[dateFilter];

  useEffect(() => {
    if (!import.meta.env.VITE_API_BASE_URL) {
      const t = setTimeout(() => setLoading(false), 1500);
      return () => clearTimeout(t);
    }
    setLoading(true);
    const tid = currentTenant?.id;
    Promise.all([
      stationsApi.list(tid),
      sessionsApi.list({ tenantId: tid }),
      billingApi.list({ tenantId: tid }),
      ticketsApi.list({ tenantId: tid }),
      alertsApi.list({ tenantId: tid }),
      dashboardApi.kpis(tid),
    ]).then(([s, se, bi, ti, al, kp]) => {
      setApiStations(s as Station[]);
      setApiSessions(se as Session[]);
      setApiBilling(bi as BillingRecord[]);
      setApiTickets(ti as Ticket[]);
      setApiAlerts(al as ApiAlert[]);
      setApiKpis(kp as KPIData);
    }).catch(() => {
      setUsingCachedData(true);
      toast.error('Failed to load dashboard data. Showing cached data.');
    }).finally(() => setLoading(false));
  }, [currentTenant?.id]);

  const tickets = useMemo(() => apiTickets ?? loadTickets(), [apiTickets]);

  const stations = useMemo(
    () => (apiStations ?? mockStations).filter((s) => !currentTenant || s.tenantId === currentTenant.id),
    [apiStations, currentTenant]
  );

  const tenantTickets = useMemo(
    () => tickets.filter((t) => !currentTenant || t.tenantId === currentTenant.id),
    [tickets, currentTenant]
  );

  const tenantSessions = useMemo(
    () => (apiSessions ?? mockSessions).filter((s) => !currentTenant || s.tenantId === currentTenant.id),
    [apiSessions, currentTenant]
  );

  const tenantBilling = useMemo(
    () => (apiBilling ?? mockBillingRecords).filter((b) => !currentTenant || b.tenantId === currentTenant.id),
    [apiBilling, currentTenant]
  );

  const offlineStations = useMemo(
    () => stations.filter((s) => s.status === "fault" || s.status === "offline"),
    [stations]
  );

  const maintenanceStations = useMemo(
    () => stations.filter((s) => s.status === "maintenance"),
    [stations]
  );

  const activeStations = useMemo(
    () => stations.filter((s) => s.status === "available" || s.status === "charging"),
    [stations]
  );

  const activeSessions = useMemo(
    () => tenantSessions.filter((s) => s.status === "active"),
    [tenantSessions]
  );

  const getTicketForStation = (stationName: string, categories?: Ticket["category"][]): Ticket | undefined =>
    tenantTickets.find(
      (t) =>
        t.stationName === stationName &&
        (t.status === "open" || t.status === "in_progress" || t.status === "escalated") &&
        (!categories || categories.includes(t.category))
    );

  const energyByStation = useMemo(() => {
    const map: Record<string, number> = {};
    tenantBilling.forEach((b) => {
      map[b.stationName] = (map[b.stationName] || 0) + b.energyKwh;
    });
    return Object.entries(map)
      .map(([name, kwh]) => ({ name, kwh: Math.round(kwh * 10) / 10 }))
      .sort((a, b) => b.kwh - a.kwh);
  }, [tenantBilling]);

  const totalEnergy = energyByStation.reduce((sum, s) => sum + s.kwh, 0);

  const revenueByStation = useMemo(() => {
    const map: Record<string, number> = {};
    tenantBilling.forEach((b) => {
      if (b.amount > 0) map[b.stationName] = (map[b.stationName] || 0) + b.amount;
    });
    return Object.entries(map)
      .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
      .sort((a, b) => b.amount - a.amount);
  }, [tenantBilling]);

  const totalRevenue = revenueByStation.reduce((sum, s) => sum + s.amount, 0);

  const uptimeByStation = useMemo(
    () =>
      [...stations]
        .map((s) => ({ station: s, uptime: getStationUptime(s) }))
        .sort((a, b) => a.uptime - b.uptime),
    [stations]
  );

  const renderDrilldownContent = () => {
    switch (drilldown) {
      case "activeStations":
        return (
          <div className="space-y-3">
            {activeStations.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">No active stations</p>
            )}
            {activeStations.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">{s.name}</p>
                  <p className="text-xs text-gray-500">
                    {s.city} · {s.connectors.map(c => c.type).join(', ')} · up to {Math.max(...s.connectors.map(c => c.powerKw))} kW
                  </p>
                </div>
                <div className="text-right">
                  <StatusChip status={s.status} type="station" />
                  <p className="text-xs text-gray-500 mt-1">{s.activeConnectors}/{s.totalConnectors} connectors</p>
                </div>
              </div>
            ))}
          </div>
        );

      case "offlineStations":
        return (
          <div className="space-y-3">
            {offlineStations.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">No offline stations</p>
            )}
            {offlineStations.map((s) => {
              const ticket = getTicketForStation(s.name);
              return (
                <div key={s.id} className="p-3 border border-red-100 rounded-lg bg-red-50/40 dark:bg-red-950/20 dark:border-red-900/30 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{s.name}</p>
                      <p className="text-xs text-gray-500">{s.city} · {s.address}</p>
                    </div>
                    <StatusChip status={s.status} type="station" />
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div>
                      <span className="text-gray-400">Fault reason</span>
                      <p className="font-medium">{ticket ? categoryLabels[ticket.category] : "Unknown"}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Since</span>
                      <p className="font-medium">{ticket ? formatDistanceToNow(ticket.createdAt, { addSuffix: true }) : "—"}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Responsible</span>
                      <p className="font-medium flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {ticket?.assignedTo ?? "Unassigned"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">Ticket</span>
                      <p className="font-medium">
                        {ticket ? (
                          <span className="flex items-center gap-1">
                            {ticket.id}
                            <Badge variant="outline" className="text-[10px] px-1 py-0">{ticket.status}</Badge>
                          </span>
                        ) : "No ticket"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );

      case "maintenanceStations":
        return (
          <div className="space-y-3">
            {maintenanceStations.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">No stations under maintenance</p>
            )}
            {maintenanceStations.map((s) => {
              const ticket = getTicketForStation(s.name, ["maintenance"]);
              return (
                <div key={s.id} className="p-3 border border-amber-100 rounded-lg bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900/30 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{s.name}</p>
                      <p className="text-xs text-gray-500">{s.city} · {s.address}</p>
                    </div>
                    <StatusChip status={s.status} type="station" />
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div>
                      <span className="text-gray-400">Type</span>
                      <p className="font-medium">{ticket ? categoryLabels[ticket.category] : "Scheduled"}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Started</span>
                      <p className="font-medium">{ticket ? formatDistanceToNow(ticket.createdAt, { addSuffix: true }) : "—"}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Assigned to</span>
                      <p className="font-medium flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {ticket?.assignedTo ?? "Unassigned"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">Est. deadline</span>
                      <p className="font-medium">{ticket ? format(ticket.slaDeadline, "MMM dd, HH:mm") : "—"}</p>
                    </div>
                  </div>
                  {ticket && (
                    <p className="text-xs text-gray-500 italic border-t pt-1.5 mt-1">{ticket.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        );

      case "activeSessions":
        return (
          <div className="space-y-3">
            {activeSessions.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">No active sessions</p>
            )}
            {activeSessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">{s.stationName}</p>
                  <p className="text-xs text-gray-500">{s.connector} · {s.userIdentifier}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{s.energyKwh} kWh</p>
                  <p className="text-xs text-gray-500">{s.duration} min · started {formatDistanceToNow(s.startTime, { addSuffix: true })}</p>
                </div>
              </div>
            ))}
          </div>
        );

      case "energy":
        return (
          <div className="space-y-3">
            <p className="text-xs text-gray-400 pb-1">CO₂ savings calculated at 0.7 kg per kWh delivered</p>
            {energyByStation.map((row, i) => {
              const pct = totalEnergy > 0 ? ((row.kwh / totalEnergy) * 100).toFixed(1) : "0";
              const co2 = (row.kwh * 0.7).toFixed(0);
              return (
                <div key={row.name} className="p-3 border rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{row.name}</p>
                    <span className="text-xs text-gray-400">#{i + 1}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>{row.kwh.toLocaleString()} kWh</span>
                    <span className="text-green-600">≈ {Number(co2).toLocaleString()} kg CO₂ saved</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: accentColor }}
                    />
                  </div>
                  <p className="text-xs text-gray-400">{pct}% of total</p>
                </div>
              );
            })}
          </div>
        );

      case "revenue":
        return (
          <div className="space-y-3">
            {revenueByStation.map((row, i) => {
              const pct = totalRevenue > 0 ? ((row.amount / totalRevenue) * 100).toFixed(1) : "0";
              return (
                <div key={row.name} className="p-3 border rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{row.name}</p>
                    <span className="text-xs text-gray-400">#{i + 1}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold">{row.amount.toLocaleString()} DZD</span>
                    <span className="text-gray-500">{pct}% of total</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: accentColor }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="pt-2 border-t flex justify-between text-sm font-semibold">
              <span>Total</span>
              <span>{totalRevenue.toLocaleString()} DZD</span>
            </div>
          </div>
        );

      case "uptime":
        return (
          <div className="space-y-3">
            <p className="text-xs text-gray-400 pb-1">Sorted by worst uptime first</p>
            {uptimeByStation.map(({ station: s, uptime }) => {
              const isLow = uptime < 90;
              const isMid = uptime >= 90 && uptime < 97;
              const color = isLow ? "#dc2626" : isMid ? "#f97316" : "#16a34a";
              return (
                <div key={s.id} className="p-3 border rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{s.name}</p>
                      <p className="text-xs text-gray-500">{s.city}</p>
                    </div>
                    <span className="text-sm font-bold" style={{ color }}>{uptime}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: `${uptime}%`, backgroundColor: color }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <StatusChip status={s.status} type="station" />
                    <span>{uptime >= 97 ? "Healthy" : uptime >= 90 ? "Degraded" : "Critical"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {usingCachedData && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <span className="font-medium">Offline mode</span> — server unreachable, showing locally cached data.
        </div>
      )}
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-gray-500 mt-1">Real-time overview of charging operations</p>
        </div>
        <Tabs value={dateFilter} onValueChange={(v) => { const f = v as DateFilter; setDateFilter(f); localStorage.setItem('dashboard.dateFilter', f); }}>
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="7d">7 Days</TabsTrigger>
            <TabsTrigger value="30d">30 Days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* KPI Cards — 7 cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4">
        {loading ? (
          Array.from({ length: 7 }).map((_, i) => <KPICardSkeleton key={i} />)
        ) : (
          <>
            <KPICard
              title="Active Stations"
              value={kpiData.activeStations}
              trend={kpiData.activeStationsTrend}
              icon={<Zap className="h-5 w-5" />}
              accentColor={accentColor}
              onClick={() => setDrilldown("activeStations")}
            />
            <KPICard
              title="Offline Stations"
              value={kpiData.offlineStations}
              trend={kpiData.offlineStationsTrend}
              icon={<WifiOff className="h-5 w-5" />}
              accentColor="#dc2626"
              onClick={() => setDrilldown("offlineStations")}
            />
            <KPICard
              title="Maintenance"
              value={kpiData.maintenanceStations}
              trend={kpiData.maintenanceStationsTrend}
              icon={<Wrench className="h-5 w-5" />}
              accentColor="#f59e0b"
              onClick={() => setDrilldown("maintenanceStations")}
            />
            <KPICard
              title="Active Sessions"
              value={kpiData.activeSessions}
              trend={kpiData.activeSessionsTrend}
              icon={<Activity className="h-5 w-5" />}
              accentColor={accentColor}
              onClick={() => setDrilldown("activeSessions")}
            />
            <KPICard
              title="Energy (kWh)"
              value={kpiData.totalEnergy.toLocaleString()}
              trend={kpiData.totalEnergyTrend}
              icon={<Battery className="h-5 w-5" />}
              accentColor={accentColor}
              onClick={() => setDrilldown("energy")}
            />
            <KPICard
              title="Revenue (DZD)"
              value={`${(kpiData.totalRevenue / 1000).toFixed(1)}K`}
              trend={kpiData.totalRevenueTrend}
              icon={<DollarSign className="h-5 w-5" />}
              accentColor={accentColor}
              onClick={() => setDrilldown("revenue")}
            />
            <KPICard
              title="Uptime Rate"
              value={`${kpiData.uptimeRate}%`}
              trend={kpiData.uptimeRateTrend}
              icon={<ShieldCheck className="h-5 w-5" />}
              accentColor="#16a34a"
              onClick={() => setDrilldown("uptime")}
            />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AnimatedCard className="lg:col-span-2" delay={0.1}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Revenue & Energy Trends (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <ChartSkeleton height={300} />
            ) : (
              <div style={{ height: "300px" }}>
                <RevenueTrendChart />
              </div>
            )}
          </CardContent>
        </AnimatedCard>

        <AnimatedCard delay={0.2}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Connector Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <ChartSkeleton height={300} />
            ) : (
              <div style={{ height: "300px" }}>
                <ConnectorTypeChart />
              </div>
            )}
          </CardContent>
        </AnimatedCard>
      </div>

      {/* Energy Chart */}
      <AnimatedCard delay={0.3}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Energy Consumption (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <ChartSkeleton height={250} />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={energyTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    boxShadow: "0 10px 20px rgba(0,0,0,0.2)",
                  }}
                  labelStyle={{ color: "var(--popover-foreground)" }}
                  itemStyle={{ color: "var(--popover-foreground)" }}
                />
                <Line
                  type="monotone"
                  dataKey="energy"
                  stroke={accentColor}
                  strokeWidth={3}
                  dot={{ fill: accentColor, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </AnimatedCard>

      {/* Alerts */}
      <AnimatedCard delay={0.4}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Recent Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(apiAlerts ?? mockAlerts).slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <StatusChip status={alert.severity} type="alert" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{alert.message}</p>
                    {alert.stationName && (
                      <p className="text-xs text-gray-500 mt-1">Station: {alert.stationName}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {format(alert.timestamp, "HH:mm")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </AnimatedCard>

      {/* Drilldown Drawer */}
      <SideDrawer
        open={drilldown !== null}
        onOpenChange={(open) => { if (!open) setDrilldown(null); }}
        title={drilldown ? drilldownTitles[drilldown] : ""}
        description="Click on any item for more details"
      >
        {renderDrilldownContent()}
      </SideDrawer>
    </div>
  );
}
