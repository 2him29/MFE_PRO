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
});

const StationUpdateSchema = z.object({
  name:                       z.string().min(1).max(120).optional(),
  city:                       z.string().min(1).max(80).optional(),
  address:                    z.string().min(1).max(200).optional(),
  status:                     z.enum(['available', 'occupied', 'offline', 'maintenance']).optional(),
  latitude:                   z.number().min(-90).max(90).optional(),
  longitude:                  z.number().min(-180).max(180).optional(),
  current_tariff_dzd_per_kwh: z.number().min(0).optional(),
});

// GET /stations?tenantId=&status=&page=1&limit=50
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.role === 'super_admin'
      ? (req.query.tenantId as string) || null
      : req.user!.tenantId;

    const limit  = Math.min(parseInt(req.query.limit  as string) || 50, 200);
    const page   = Math.max(parseInt(req.query.page   as string) || 1,  1);
    const offset = (page - 1) * limit;

    let q = 'SELECT * FROM vw_station_overview WHERE 1=1';
    const p: any[] = [];
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
    const { name, city, address, latitude, longitude, current_tariff_dzd_per_kwh, tenant_id } = parsed.data;
    const targetTenantId = req.user!.role === 'super_admin' ? tenant_id : req.user!.tenantId;
    if (!targetTenantId) {
      res.status(400).json({ error: 'tenant_id is required' }); return;
    }
    const station_id = uuidv4();
    await pool.query(
      'INSERT INTO stations (station_id, tenant_id, name, city, address, latitude, longitude, current_tariff_dzd_per_kwh) VALUES (?,?,?,?,?,?,?,?)',
      [station_id, targetTenantId, name, city, address, latitude, longitude, current_tariff_dzd_per_kwh || 0]
    );
    res.status(201).json({ id: station_id });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /stations/:id
router.patch('/:id', requireAuth, requireRole('super_admin', 'tenant_admin'), async (req: Request, res: Response) => {
  try {
    const [existing]: any = await pool.query(
      'SELECT tenant_id FROM stations WHERE station_id = ? LIMIT 1', [req.params.id]
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
