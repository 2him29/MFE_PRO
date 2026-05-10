import { Router, Request, Response } from 'express';
import pool from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /sessions?tenantId=&stationId=&status=&limit=&offset=
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.role === 'super_admin'
      ? (req.query.tenantId as string) || null
      : req.user!.tenantId;

    let q = 'SELECT * FROM vw_session_list WHERE 1=1';
    const p: any[] = [];
    if (tenantId)            { q += ' AND tenant_id = ?';  p.push(tenantId); }
    if (req.query.stationId) { q += ' AND station_id = ?'; p.push(req.query.stationId); }
    if (req.query.status)    { q += ' AND status = ?';     p.push(req.query.status); }
    q += ' ORDER BY start_time DESC';

    const limit  = Math.min(Number(req.query.limit)  || 50, 200);
    const offset = Number(req.query.offset) || 0;
    q += ' LIMIT ? OFFSET ?';
    p.push(limit, offset);

    const [rows]: any = await pool.query(q, p);
    res.json(rows.map((r: any) => ({
      id:             r.session_id,
      stationName:    r.station_name,
      connector:      `${r.connector_type} ${r.max_power_kw}kW`,
      userIdentifier: r.user_identifier,
      startTime:      r.start_time,
      duration:       r.duration_min,
      energyKwh:      Number(r.energy_kwh),
      cost:           Number(r.cost_dzd),
      status:         r.status,
      tenantId:       r.tenant_id,
    })));
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
