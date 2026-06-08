import { Router, Request, Response } from 'express';
import pool from '../db';
import { requireAppAuth } from '../middleware/auth';
import { broadcastStationUpdate } from '../index';
import { notifyAppUsers } from '../fcmHelper';

const router = Router();

// ── GET /api/app/stations ─────────────────────────────────────────────────────
// Public — no auth required so the map loads before the user logs in.
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.query<any[]>('SELECT * FROM vw_app_station_map');
    res.json(rows);
  } catch (err: any) {
    console.error('GET /api/app/stations error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/app/stations/:id ─────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM vw_app_station_map WHERE id = ?',
      [req.params.id],
    );
    const station = (rows as any[])[0];
    if (!station) {
      res.status(404).json({ error: 'Station not found' });
      return;
    }
    res.json(station);
  } catch (err: any) {
    console.error('GET /api/app/stations/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /api/app/stations/:id/status ───────────────────────────────────────
// Called by the Android app when a user starts/ends a session.
router.patch('/:id/status', requireAppAuth, async (req: Request, res: Response): Promise<void> => {
  const { status } = req.body;
  const validStatuses = ['available', 'charging', 'offline', 'fault', 'maintenance'];

  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    return;
  }

  try {
    await pool.query(
      'UPDATE stations SET status = ? WHERE station_id = ?',
      [status, req.params.id]
    );

    const [stationRows] = await pool.query<any[]>(
      'SELECT name, tenant_id FROM stations WHERE station_id = ? LIMIT 1',
      [req.params.id]
    );
    const stationName = (stationRows as any[])[0]?.name || 'Station';
    const tenantId    = (stationRows as any[])[0]?.tenant_id as string | undefined;

    broadcastStationUpdate(req.params.id, status, stationName, tenantId);
    await notifyAppUsers(req.params.id, stationName, status);

    res.json({ success: true, status, stationId: req.params.id });
  } catch (err: any) {
    console.error('Status update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
