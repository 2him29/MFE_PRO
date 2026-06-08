import { Router, Request, Response } from 'express';
import pool from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /billing?tenantId=&status=&stationId=
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.role === 'super_admin'
      ? (req.query.tenantId as string) || null
      : req.user!.tenantId;

    let q = 'SELECT * FROM vw_billing_list WHERE 1=1';
    const p: any[] = [];
    if (tenantId)            { q += ' AND tenant_id = ?';  p.push(tenantId); }
    if (req.query.stationId) { q += ' AND station_id = ?'; p.push(req.query.stationId); }
    if (req.query.status)    { q += ' AND status = ?';     p.push(req.query.status); }
    q += ' ORDER BY billed_at DESC';

    const [rows]: any = await pool.query(q, p);
    res.json(rows.map((r: any) => ({
      id:             r.billing_id,
      invoiceNumber:  r.invoice_number,
      stationName:    r.station_name,
      sessions:       r.sessions_count,
      energyKwh:      Number(r.energy_kwh),
      amount:         Number(r.amount_dzd),
      status:         r.status,
      paymentMethod:  r.payment_method,
      processingTime: r.processing_time_sec ? Number(r.processing_time_sec) : undefined,
      failed:         Boolean(r.failed),
      date:           r.billed_at,
      tenantId:       r.tenant_id,
    })));
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
