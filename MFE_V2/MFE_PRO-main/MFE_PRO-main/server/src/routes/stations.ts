import { broadcastStationUpdate } from '../index';
import {
  notifyAppUsers,
  notifyStationMaintenance,
  notifyTariffChange,
  notifyNewStation,
  notifyRemoteStop,
} from '../fcmHelper';
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import pool from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

const StationCreateSchema = z.object({
  name:                       z.string().min(1).max(120),
  city:                       z.string().min(1).max(80),
  address:                    z.string().min(1).max(200),
  latitude:                   z.number().min(-90).max(90),
  longitude:                  z.number().min(-180).max(180),
  current_tariff_dzd_per_kwh: z.number().min(0).optional(),
  tenant_id:                  z.string().optional(),
  connector_type:             z.string().min(1).max(50).optional(),
  power_kw:                   z.number().min(0).optional(),
});

const StationUpdateSchema = z.object({
  name:                       z.string().min(1).max(120).optional(),
  city:                       z.string().min(1).max(80).optional(),
  address:                    z.string().min(1).max(200).optional(),
  status:                     z.enum(['available', 'charging', 'offline', 'fault', 'maintenance']).optional(),
  latitude:                   z.number().min(-90).max(90).optional(),
  longitude:                  z.number().min(-180).max(180).optional(),
  current_tariff_dzd_per_kwh: z.number().min(0).optional(),
});

// GET /stations?tenantId=&status=&archived=true&page=1&limit=50
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.role === 'super_admin'
      ? (req.query.tenantId as string) || null
      : req.user!.tenantId;

    const limit    = Math.min(parseInt(req.query.limit  as string) || 50, 200);
    const page     = Math.max(parseInt(req.query.page   as string) || 1,  1);
    const offset   = (page - 1) * limit;
    const archived = req.query.archived === 'true';

    const p: any[] = [];

    if (archived) {
      // Return soft-deleted stations for the archive view (super_admin only)
      if (req.user!.role !== 'super_admin') {
        res.status(403).json({ error: 'Forbidden' }); return;
      }
      let q = `SELECT s.station_id, s.tenant_id, s.name, s.city, s.address,
                      s.latitude, s.longitude, s.status, s.current_tariff_dzd_per_kwh,
                      s.deleted_at,
                      COALESCE(GROUP_CONCAT(DISTINCT c.connector_type ORDER BY c.connector_type SEPARATOR ', '), 'N/A') AS connector_types,
                      COALESCE(MAX(c.max_power_kw), 0) AS max_power_kw,
                      COUNT(DISTINCT c.connector_id) AS total_connectors,
                      0 AS available_connectors, 0 AS active_sessions, 0 AS unread_alerts
               FROM stations s
               LEFT JOIN connectors c ON c.station_id = s.station_id
               WHERE s.deleted_at IS NOT NULL`;
      if (tenantId) { q += ' AND s.tenant_id = ?'; p.push(tenantId); }
      q += ' GROUP BY s.station_id ORDER BY s.deleted_at DESC LIMIT ? OFFSET ?';
      p.push(limit, offset);
      const [rows]: any = await pool.query(q, p);
      res.json(rows.map(mapStation));
      return;
    }

    let q = 'SELECT * FROM vw_station_overview WHERE 1=1';
    if (tenantId) { q += ' AND tenant_id = ?'; p.push(tenantId); }
    if (req.query.status) { q += ' AND status = ?'; p.push(req.query.status); }
    q += ' ORDER BY name LIMIT ? OFFSET ?';
    p.push(limit, offset);

    const [rows]: any = await pool.query(q, p);
    res.json(rows.map(mapStation));
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /stations/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query(
      'SELECT * FROM vw_station_overview WHERE station_id = ? LIMIT 1', [req.params.id]
    );
    if (!rows[0]) { res.status(404).json({ error: 'Not found' }); return; }

    if (req.user!.role !== 'super_admin' && rows[0].tenant_id !== req.user!.tenantId) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }

    const station = mapStation(rows[0]);

    // Fetch connectors for detail view
    const [connRows]: any = await pool.query(
      'SELECT connector_type AS type, max_power_kw AS powerKw, COUNT(*) AS count FROM connectors WHERE station_id = ? GROUP BY connector_type, max_power_kw',
      [req.params.id]
    );
    station.connectors = connRows.map((c: any) => ({ type: c.type, powerKw: Number(c.powerKw), count: Number(c.count) }));

    res.json(station);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /stations
router.post('/', requireAuth, requireRole('super_admin', 'tenant_admin'), async (req: Request, res: Response) => {
  try {
    const parsed = StationCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message }); return;
    }
    const { name, city, address, latitude, longitude, current_tariff_dzd_per_kwh, tenant_id, connector_type, power_kw } = parsed.data;
    const targetTenantId = req.user!.role === 'super_admin' ? tenant_id : req.user!.tenantId;
    if (!targetTenantId) {
      res.status(400).json({ error: 'tenant_id is required' }); return;
    }
    const station_id = uuidv4();
    await pool.query(
      'INSERT INTO stations (station_id, tenant_id, name, city, address, latitude, longitude, current_tariff_dzd_per_kwh) VALUES (?,?,?,?,?,?,?,?)',
      [station_id, targetTenantId, name, city, address, latitude, longitude, current_tariff_dzd_per_kwh || 0]
    );
    if (connector_type) {
      const connector_id = uuidv4();
      await pool.query(
        'INSERT INTO connectors (connector_id, station_id, connector_code, connector_type, max_power_kw) VALUES (?,?,?,?,?)',
        [connector_id, station_id, `${station_id.slice(0, 8)}-C1`, connector_type, power_kw ?? 0]
      );
    }
    notifyNewStation(station_id, name, city, targetTenantId, req.user!.userId).catch(() => {});
    res.status(201).json({ id: station_id });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /stations/:id
router.patch('/:id', requireAuth, requireRole('super_admin', 'tenant_admin'), async (req: Request, res: Response) => {
  try {
    const [existing]: any = await pool.query(
      'SELECT tenant_id, current_tariff_dzd_per_kwh FROM stations WHERE station_id = ? AND deleted_at IS NULL LIMIT 1', [req.params.id]
    );
    if (!existing[0]) { res.status(404).json({ error: 'Not found' }); return; }
    if (req.user!.role !== 'super_admin' && existing[0].tenant_id !== req.user!.tenantId) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }

    const parsed = StationUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message }); return;
    }
    const { name, city, address, status, latitude, longitude, current_tariff_dzd_per_kwh } = parsed.data;
    await pool.query(
      `UPDATE stations SET
        name                       = COALESCE(?, name),
        city                       = COALESCE(?, city),
        address                    = COALESCE(?, address),
        status                     = COALESCE(?, status),
        latitude                   = COALESCE(?, latitude),
        longitude                  = COALESCE(?, longitude),
        current_tariff_dzd_per_kwh = COALESCE(?, current_tariff_dzd_per_kwh)
       WHERE station_id = ?`,
      [name||null, city||null, address||null, status||null, latitude??null, longitude??null, current_tariff_dzd_per_kwh??null, req.params.id]
    );
    const [nameRows]: any = await pool.query(
      'SELECT name FROM stations WHERE station_id = ? LIMIT 1',
      [req.params.id]
    );
    const stationName = nameRows[0]?.name || 'Station';
    const tenantId    = existing[0].tenant_id;
    const actorId     = req.user!.userId;

    if (status) {
      broadcastStationUpdate(req.params.id, status, stationName, tenantId);

      // If the station is being taken offline/maintenance, notify any user who is currently charging
      if (status === 'offline' || status === 'maintenance') {
        const [activeRows]: any = await pool.query(
          `SELECT cs.session_id, cs.app_user_id
             FROM charging_sessions cs
            WHERE cs.station_id = ? AND cs.status = 'active' AND cs.app_user_id IS NOT NULL`,
          [req.params.id],
        );
        for (const row of activeRows as any[]) {
          notifyRemoteStop(row.session_id, stationName, row.app_user_id, tenantId).catch(() => {});
        }
      }

      if (status === 'maintenance') {
        await notifyStationMaintenance(req.params.id, stationName, tenantId, actorId);
      } else {
        await notifyAppUsers(req.params.id, stationName, status);
      }
    }

    if (current_tariff_dzd_per_kwh != null) {
      const oldTariff = Number(existing[0]?.current_tariff_dzd_per_kwh ?? 0);
      if (oldTariff !== current_tariff_dzd_per_kwh) {
        await notifyTariffChange(req.params.id, stationName, tenantId, oldTariff, current_tariff_dzd_per_kwh, actorId);
      }
    }

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /stations/:id  (super_admin only) — soft delete
router.delete('/:id', requireAuth, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    await pool.query('UPDATE stations SET deleted_at = NOW() WHERE station_id = ?', [req.params.id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// Map DB row → frontend Station shape
function mapStation(row: any) {
  return {
    id:              row.station_id,
    name:            row.name,
    city:            row.city,
    address:         row.address,
    connectorType:   row.connector_types?.split(', ')[0] || 'Type 2',
    power:           Number(row.max_power_kw) || 0,
    status:          row.status,
    tenantId:        row.tenant_id,
    latitude:        Number(row.latitude),
    longitude:       Number(row.longitude),
    activeConnectors: Number(row.available_connectors) || 0,
    totalConnectors:  Number(row.total_connectors) || 0,
    currentTariff:   Number(row.current_tariff_dzd_per_kwh) || 0,
    connectors:      [],  // populated on GET /:id
    activeSessions:  Number(row.active_sessions) || 0,
    unreadAlerts:    Number(row.unread_alerts) || 0,
  };
}

export default router;
