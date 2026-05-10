import { Router, Request, Response } from 'express';
import pool from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /alerts?severity=&unread=true
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.role === 'super_admin'
      ? (req.query.tenantId as string) || null
      : req.user!.tenantId;

    let q = 'SELECT * FROM vw_alert_list WHERE 1=1';
    const p: any[] = [];
    if (tenantId)              { q += ' AND tenant_id = ?'; p.push(tenantId); }
    if (req.query.severity)    { q += ' AND severity = ?';  p.push(req.query.severity); }
    if (req.query.unread === 'true') { q += ' AND is_read = FALSE'; }
    q += ' ORDER BY created_at DESC LIMIT 100';

    const [rows]: any = await pool.query(q, p);
    res.json(rows.map((r: any) => ({
      id:          r.alert_id,
      message:     r.message,
      severity:    r.severity,
      timestamp:   r.created_at,
      stationName: r.station_name || undefined,
      isRead:      Boolean(r.is_read),
    })));
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /alerts/:id/read
router.patch('/:id/read', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query('UPDATE alerts SET is_read = TRUE WHERE alert_id = ?', [req.params.id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /alerts/read-all
router.patch('/read-all', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query('UPDATE alerts SET is_read = TRUE WHERE tenant_id = ?', [req.user!.tenantId]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
