import { Router, Request, Response } from 'express';
import pool from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /dashboard/kpis?tenantId=&range=today|7d|30d
router.get('/kpis', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.role === 'super_admin'
      ? (req.query.tenantId as string) || null
      : req.user!.tenantId;

    const range = (req.query.range as string) || '30d';
    const intervalMap: Record<string, string> = {
      today: 'INTERVAL 1 DAY',
      '7d':  'INTERVAL 7 DAY',
      '30d': 'INTERVAL 30 DAY',
    };
    const prevIntervalMap: Record<string, string> = {
      today: 'INTERVAL 2 DAY',
      '7d':  'INTERVAL 14 DAY',
      '30d': 'INTERVAL 60 DAY',
    };
    const interval     = intervalMap[range]     ?? 'INTERVAL 30 DAY';
    const prevInterval = prevIntervalMap[range] ?? 'INTERVAL 60 DAY';

    const tf = tenantId ? 'tenant_id = ? AND ' : '';
    const p: any[] = tenantId
      ? [tenantId, tenantId, tenantId, tenantId, tenantId, tenantId, tenantId, tenantId, tenantId, tenantId, tenantId, tenantId]
      : [];

    const [rows]: any = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM stations WHERE ${tf}deleted_at IS NULL AND status = 'available')   AS st_available,
        (SELECT COUNT(*) FROM stations WHERE ${tf}deleted_at IS NULL AND status = 'charging')    AS st_charging,
        (SELECT COUNT(*) FROM stations WHERE ${tf}deleted_at IS NULL AND status = 'offline')     AS st_offline,
        (SELECT COUNT(*) FROM stations WHERE ${tf}deleted_at IS NULL AND status = 'fault')       AS st_fault,
        (SELECT COUNT(*) FROM stations WHERE ${tf}deleted_at IS NULL AND status = 'maintenance') AS st_maintenance,
        (SELECT COUNT(*) FROM stations WHERE ${tf}deleted_at IS NULL)                            AS st_total,
        (SELECT COUNT(*) FROM charging_sessions WHERE ${tf}status = 'active')                                                   AS active_sessions,
        (SELECT COALESCE(SUM(energy_kwh),0) FROM charging_sessions WHERE ${tf}status='completed' AND start_time >= DATE_SUB(NOW(),${interval})) AS total_energy,
        (SELECT COALESCE(SUM(cost_dzd),  0) FROM charging_sessions WHERE ${tf}status='completed' AND start_time >= DATE_SUB(NOW(),${interval})) AS total_revenue,
        (SELECT COALESCE(SUM(energy_kwh),0) FROM charging_sessions WHERE ${tf}status='completed' AND start_time >= DATE_SUB(NOW(), INTERVAL 60 DAY) AND start_time < DATE_SUB(NOW(),${interval})) AS prev_energy,
        (SELECT COALESCE(SUM(cost_dzd),  0) FROM charging_sessions WHERE ${tf}status='completed' AND start_time >= DATE_SUB(NOW(), INTERVAL 60 DAY) AND start_time < DATE_SUB(NOW(),${interval})) AS prev_revenue,
        (SELECT COUNT(*) FROM charging_sessions WHERE ${tf}status='completed' AND start_time >= DATE_SUB(NOW(),${interval})) AS period_sessions`,
      p,
    );
    const r = rows[0] || {};

    // Separate query for session-derived trends (sessions, utilised stations, faults)
    const trendFilter = tenantId ? 'AND tenant_id = ?' : '';
    const [trows]: any = await pool.query(
      `SELECT
         SUM(CASE WHEN start_time >= DATE_SUB(NOW(), ${interval})                                                             THEN 1 ELSE 0 END) AS cur_sessions,
         SUM(CASE WHEN start_time >= DATE_SUB(NOW(), ${prevInterval}) AND start_time < DATE_SUB(NOW(), ${interval})           THEN 1 ELSE 0 END) AS prev_sessions,
         COUNT(DISTINCT CASE WHEN start_time >= DATE_SUB(NOW(), ${interval})                                                  THEN station_id END) AS cur_stations,
         COUNT(DISTINCT CASE WHEN start_time >= DATE_SUB(NOW(), ${prevInterval}) AND start_time < DATE_SUB(NOW(), ${interval}) THEN station_id END) AS prev_stations,
         SUM(CASE WHEN status = 'error' AND start_time >= DATE_SUB(NOW(), ${interval})                                        THEN 1 ELSE 0 END) AS cur_faults,
         SUM(CASE WHEN status = 'error' AND start_time >= DATE_SUB(NOW(), ${prevInterval}) AND start_time < DATE_SUB(NOW(), ${interval}) THEN 1 ELSE 0 END) AS prev_faults
       FROM charging_sessions
       WHERE 1=1 ${trendFilter}
         AND start_time >= DATE_SUB(NOW(), ${prevInterval})`,
      tenantId ? [tenantId] : [],
    );
    const t = trows[0] || {};

    const totalStations  = Number(r.st_total)    || 0;
    const stAvailable    = Number(r.st_available) || 0;
    const stOffline      = Number(r.st_offline)   || 0;
    const stFault        = Number(r.st_fault)     || 0;
    const stMaintenance  = Number(r.st_maintenance)|| 0;
    const curEnergy      = Number(r.total_energy)  || 0;
    const curRevenue     = Number(r.total_revenue) || 0;
    const prevEnergy     = Number(r.prev_energy)   || 0;
    const prevRevenue    = Number(r.prev_revenue)  || 0;

    const trend = (cur: number, prev: number) =>
      prev === 0 ? 0 : Math.round(((cur - prev) / prev) * 100);

    res.json({
      activeStations:      stAvailable,
      chargingStations:    Number(r.st_charging) || 0,
      offlineStations:     stOffline + stFault,
      underMaintenance:    stMaintenance,
      totalStations,
      activeSessions:      Number(r.active_sessions) || 0,
      periodSessions:      Number(r.period_sessions) || 0,
      totalEnergy:         curEnergy,
      totalRevenue:        curRevenue,
      faults:              stFault,
      networkUptime:       totalStations ? +((stAvailable / totalStations) * 100).toFixed(1) : 0,
      // Trends vs previous period
      totalEnergyTrend:     trend(curEnergy,  prevEnergy),
      totalRevenueTrend:    trend(curRevenue, prevRevenue),
      // sessions this period vs same-length window before it
      activeSessionsTrend:  trend(Number(t.cur_sessions)  || 0, Number(t.prev_sessions)  || 0),
      // distinct stations utilised (no status-history table → proxy)
      activeStationsTrend:  trend(Number(t.cur_stations)  || 0, Number(t.prev_stations)  || 0),
      // error sessions as fault proxy
      faultsTrend:          trend(Number(t.cur_faults)    || 0, Number(t.prev_faults)    || 0),
      // below need a status-history log to compute — kept 0
      offlineStationsTrend:  0,
      underMaintenanceTrend: 0,
      networkUptimeTrend:    0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /dashboard/trends?tenantId=&days=30
// Daily revenue + energy for the last N days
router.get('/trends', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.role === 'super_admin'
      ? (req.query.tenantId as string) || null
      : req.user!.tenantId;

    const days = Math.min(parseInt(req.query.days as string) || 30, 90);
    const tf   = tenantId ? 'AND tenant_id = ?' : '';
    const p: any[] = tenantId ? [days, tenantId] : [days];

    const [rows]: any = await pool.query(
      `SELECT
         DATE(start_time)               AS day,
         COALESCE(SUM(cost_dzd),   0)   AS revenue,
         COALESCE(SUM(energy_kwh), 0)   AS energy
       FROM charging_sessions
       WHERE status = 'completed'
         AND start_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
         ${tf}
       GROUP BY DATE(start_time)
       ORDER BY day ASC`,
      p,
    );

    res.json(
      (rows as any[]).map((r: any) => ({
        date:    r.day,
        revenue: Number(r.revenue),
        energy:  Number(r.energy),
      })),
    );
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /dashboard/hourly?tenantId=
// Hourly energy + session count for today
router.get('/hourly', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.role === 'super_admin'
      ? (req.query.tenantId as string) || null
      : req.user!.tenantId;

    const tf = tenantId ? 'AND tenant_id = ?' : '';
    const p: any[] = tenantId ? [tenantId] : [];

    const [rows]: any = await pool.query(
      `SELECT
         HOUR(start_time)               AS hour,
         COALESCE(SUM(energy_kwh), 0)   AS energy,
         COUNT(*)                        AS sessions
       FROM charging_sessions
       WHERE DATE(start_time) = CURDATE()
         ${tf}
       GROUP BY HOUR(start_time)
       ORDER BY hour ASC`,
      p,
    );

    // Fill all 24 hours, even if no sessions
    const map: Record<number, { energy: number; sessions: number }> = {};
    (rows as any[]).forEach((r: any) => {
      map[Number(r.hour)] = { energy: Number(r.energy), sessions: Number(r.sessions) };
    });
    const result = Array.from({ length: 24 }, (_, h) => ({
      time:     `${String(h).padStart(2, '0')}:00`,
      energy:   map[h]?.energy   ?? 0,
      sessions: map[h]?.sessions ?? 0,
    }));

    res.json(result);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /dashboard/top-stations?tenantId=&limit=5
router.get('/top-stations', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.role === 'super_admin'
      ? (req.query.tenantId as string) || null
      : req.user!.tenantId;

    const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);
    const tf    = tenantId ? 'WHERE s.tenant_id = ?' : '';
    const p: any[] = tenantId ? [tenantId, limit] : [limit];

    const [rows]: any = await pool.query(
      `SELECT
         s.name                               AS name,
         COALESCE(SUM(cs.cost_dzd),   0)      AS revenue,
         COALESCE(SUM(cs.energy_kwh), 0)      AS energy,
         COUNT(cs.session_id)                 AS sessions
       FROM stations s
       LEFT JOIN charging_sessions cs
         ON cs.station_id = s.station_id AND cs.status = 'completed'
       ${tf}
       GROUP BY s.station_id, s.name
       ORDER BY revenue DESC
       LIMIT ?`,
      p,
    );

    res.json(
      (rows as any[]).map((r: any) => ({
        name:     r.name,
        revenue:  Number(r.revenue),
        energy:   Number(r.energy),
        sessions: Number(r.sessions),
      })),
    );
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
