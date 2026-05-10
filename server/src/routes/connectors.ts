import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// GET /connectors?stationId=
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { stationId } = req.query;
    let q = 'SELECT * FROM connectors WHERE 1=1';
    const p: any[] = [];
    if (stationId) { q += ' AND station_id = ?'; p.push(stationId); }
    const [rows] = await pool.query(q, p);
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /connectors
router.post('/', requireAuth, requireRole('super_admin', 'tenant_admin'), async (req: Request, res: Response) => {
  try {
    const { station_id, connector_code, connector_type, max_power_kw } = req.body;
    if (!station_id || !connector_code || !connector_type || max_power_kw == null) {
      res.status(400).json({ error: 'Missing required fields' }); return;
    }
    const connector_id = uuidv4();
    await pool.query(
      'INSERT INTO connectors (connector_id, station_id, connector_code, connector_type, max_power_kw) VALUES (?,?,?,?,?)',
      [connector_id, station_id, connector_code, connector_type, max_power_kw]
    );
    res.status(201).json({ connector_id });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /connectors/:id
router.patch('/:id', requireAuth, requireRole('super_admin', 'tenant_admin'), async (req: Request, res: Response) => {
  try {
    const { status, max_power_kw, connector_type } = req.body;
    await pool.query(
      'UPDATE connectors SET status=COALESCE(?,status), max_power_kw=COALESCE(?,max_power_kw), connector_type=COALESCE(?,connector_type) WHERE connector_id=?',
      [status||null, max_power_kw??null, connector_type||null, req.params.id]
    );
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
