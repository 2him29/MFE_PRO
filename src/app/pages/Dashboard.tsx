import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Activity,
  AlertTriangle,
  Battery,
  DollarSign,
  TrendingUp,
  Zap,
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
import { mockKPIData, mockAlerts } from "../data/mockData";
import { useTenant } from "../contexts/TenantContext";
import { KPICard } from "../components/dashboard/KPICard";
import { KPICardSkeleton, ChartSkeleton } from "../components/dashboard/LoadingState";
import { AnimatedCard } from "../components/dashboard/AnimatedCard";
import { ConnectorTypeChart } from "../components/dashboard/ConnectorTypeChart";
import { RevenueTrendChart } from "../components/dashboard/RevenueTrendChart";
import { StatusChip } from "../components/dashboard/StatusChip";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

type DateFilter = "today" | "7d" | "30d";

const energyTrendData = [
  { time: "00:00", energy: 145 },
  { time: "04:00", energy: 89 },
  { time: "08:00", energy: 267 },
  { time: "12:00", energy: 398 },
  { time: "16:00", energy: 445 },
  { time: "20:00", energy: 312 },
];

export default function Dashboard() {
  const { currentTenant } = useTenant();
  const accentColor = currentTenant?.accentColor ?? "#2563eb";

  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [loading, setLoading] = useState(true);
  const kpiData = mockKPIData[dateFilter];

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Real-time overview of charging operations
          </p>
        </div>

        <Tabs
          value={dateFilter}
          onValueChange={(v) => setDateFilter(v as DateFilter)}
        >
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="7d">7 Days</TabsTrigger>
            <TabsTrigger value="30d">30 Days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <KPICardSkeleton key={i} />)
        ) : (
          <>
            <KPICard
              title="Active Stations"
              value={kpiData.activeStations}
              trend={kpiData.activeStationsTrend}
              icon={<Zap className="h-6 w-6" />}
              accentColor={accentColor}
            />
            <KPICard
              title="Active Sessions"
              value={kpiData.activeSessions}
              trend={kpiData.activeSessionsTrend}
              icon={<Activity className="h-6 w-6" />}
              accentColor={accentColor}
            />
            <KPICard
              title="Energy (kWh)"
              value={kpiData.totalEnergy.toLocaleString()}
              trend={kpiData.totalEnergyTrend}
              icon={<Battery className="h-6 w-6" />}
              accentColor={accentColor}
            />
            <KPICard
              title="Revenue (DZD)"
              value={`${(kpiData.totalRevenue / 1000).toFixed(1)}K`}
              trend={kpiData.totalRevenueTrend}
              icon={<DollarSign className="h-6 w-6" />}
              accentColor={accentColor}
            />
            <KPICard
              title="Faults"
              value={kpiData.faults}
              trend={kpiData.faultsTrend}
              icon={<AlertTriangle className="h-6 w-6" />}
              accentColor="#dc2626"
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
                dot={{
                  fill: accentColor,
                  r: 4,
                }}
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
              {mockAlerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <StatusChip status={alert.severity} type="alert" />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{alert.message}</p>

                    {alert.stationName && (
                      <p className="text-xs text-gray-500 mt-1">
                        Station: {alert.stationName}
                      </p>
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
    </div>
  );
}
