import { Router, Request, Response } from 'express';
import pool from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /dashboard/kpis?tenantId=
router.get('/kpis', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.role === 'super_admin'
      ? (req.query.tenantId as string) || null
      : req.user!.tenantId;

    const stationFilter = tenantId ? 'tenant_id = ? AND ' : '';
    const sessionFilter = tenantId ? 'tenant_id = ? AND ' : '';
    const params = tenantId
      ? [tenantId, tenantId, tenantId, tenantId, tenantId, tenantId]
      : [];

    const [rows]: any = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM stations WHERE ${stationFilter}status = 'available') AS stations_available,
        (SELECT COUNT(*) FROM stations WHERE ${stationFilter}status IN ('offline','fault','maintenance')) AS stations_offline,
        (SELECT COUNT(*) FROM stations WHERE ${tenantId ? 'tenant_id = ?' : '1=1'}) AS total_stations,
        (SELECT COUNT(*) FROM charging_sessions WHERE ${sessionFilter}status = 'active') AS active_sessions,
        (SELECT COALESCE(SUM(energy_kwh), 0) FROM charging_sessions WHERE ${sessionFilter}status = 'completed') AS total_energy_kwh,
        (SELECT COALESCE(SUM(cost_dzd), 0) FROM charging_sessions WHERE ${sessionFilter}status = 'completed') AS total_revenue_dzd`,
      params
    );
    const row = rows[0] || {};

    // Map to frontend KPIData shape
    res.json({
      activeStations:          Number(row.stations_available)  || 0,
      activeSessions:          Number(row.active_sessions)     || 0,
      totalEnergy:             Number(row.total_energy_kwh)    || 0,
      totalRevenue:            Number(row.total_revenue_dzd)   || 0,
      faults:                  Number(row.stations_offline)    || 0,
      offlineStations:         Number(row.stations_offline)    || 0,
      maintenanceStations:     0,
      uptimeRate:              row.total_stations
        ? Math.round((Number(row.stations_available) / Number(row.total_stations)) * 100)
        : 0,
      // Trends would require historical data — default to 0 until implemented
      activeStationsTrend:     0,
      activeSessionsTrend:     0,
      totalEnergyTrend:        0,
      totalRevenueTrend:       0,
      faultsTrend:             0,
      offlineStationsTrend:    0,
      maintenanceStationsTrend:0,
      uptimeRateTrend:         0,
    });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
