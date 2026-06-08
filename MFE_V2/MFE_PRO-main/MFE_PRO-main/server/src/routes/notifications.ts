import { Router, Request, Response } from 'express';
import { z } from 'zod';
import pool from '../db';
import { requireAuth, requireRole } from '../middleware/auth';
import { sendBroadcast } from '../fcmHelper';

const router = Router();

const BroadcastSchema = z.object({
  title:       z.string().min(1).max(200),
  body:        z.string().min(1).max(1000),
  city_filter: z.string().max(80).optional(),
  tenant_id:   z.string().optional(),
});

// GET /notifications?limit=50&offset=0
router.get('/', requireAuth, requireRole('super_admin', 'tenant_admin'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.role === 'super_admin'
      ? (req.query.tenantId as string) || null
      : req.user!.tenantId;

    const limit  = Math.min(parseInt(req.query.limit  as string) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset as string) || 0,  0);

    const p: any[] = [];
    let q = `SELECT notification_id, tenant_id, type, title, body,
                    station_id, city_filter, created_by, recipients_count, created_at
             FROM notifications WHERE 1=1`;

    if (tenantId) { q += ' AND tenant_id = ?'; p.push(tenantId); }
    q += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    p.push(limit, offset);

    const [rows]: any = await pool.query(q, p);
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /notifications/broadcast
router.post('/broadcast', requireAuth, requireRole('super_admin', 'tenant_admin'), async (req: Request, res: Response) => {
  try {
    const parsed = BroadcastSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message }); return;
    }

    const { title, body, city_filter, tenant_id } = parsed.data;
    const targetTenantId = req.user!.role === 'super_admin'
      ? (tenant_id ?? req.user!.tenantId)
      : req.user!.tenantId;

    if (!targetTenantId) {
      res.status(400).json({ error: 'tenant_id is required' }); return;
    }

    const count = await sendBroadcast({
      title,
      body,
      tenantId:   targetTenantId,
      cityFilter: city_filter,
      createdBy:  req.user!.userId,
    });

    res.json({ success: true, recipients: count });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /notifications — clears history for the caller's tenant (or all tenants for super_admin)
router.delete('/', requireAuth, requireRole('super_admin', 'tenant_admin'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.role === 'super_admin'
      ? (req.query.tenantId as string) || null
      : req.user!.tenantId;

    if (tenantId) {
      await pool.query('DELETE FROM notifications WHERE tenant_id = ?', [tenantId]);
    } else {
      await pool.query('DELETE FROM notifications');
    }

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
