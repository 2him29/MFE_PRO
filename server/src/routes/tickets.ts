import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import pool from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

const TicketCreateSchema = z.object({
  station_id:           z.string().min(1),
  title:                z.string().min(1).max(200),
  description:          z.string().max(2000).optional(),
  category:             z.string().min(1).max(60),
  priority:             z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assigned_to_user_id:  z.string().optional(),
  sla_deadline:         z.string().optional(),
});

const TicketUpdateSchema = z.object({
  status:               z.enum(['open', 'in_progress', 'resolved', 'closed', 'escalated']).optional(),
  priority:             z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assigned_to_user_id:  z.string().optional(),
  title:                z.string().min(1).max(200).optional(),
  description:          z.string().max(2000).optional(),
});

// GET /tickets?tenantId=&status=&assignedToId=&priority=&page=1&limit=50
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.role === 'super_admin'
      ? (req.query.tenantId as string) || null
      : req.user!.tenantId;
    const assignedToId = req.user!.role === 'technician'
      ? req.user!.userId
      : (req.query.assignedToId as string) || null;

    const limit  = Math.min(parseInt(req.query.limit  as string) || 50, 200);
    const page   = Math.max(parseInt(req.query.page   as string) || 1,  1);
    const offset = (page - 1) * limit;

    let q = 'SELECT * FROM vw_ticket_list WHERE 1=1';
    const p: any[] = [];
    if (tenantId)     { q += ' AND tenant_id = ?';           p.push(tenantId); }
    if (assignedToId) { q += ' AND assigned_to_user_id = ?'; p.push(assignedToId); }
    if (req.query.status)   { q += ' AND status = ?';   p.push(req.query.status); }
    if (req.query.priority) { q += ' AND priority = ?'; p.push(req.query.priority); }
    q += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    p.push(limit, offset);

    const [rows]: any = await pool.query(q, p);
    res.json(rows.map(mapTicket));
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /tickets
router.post('/', requireAuth, requireRole('super_admin', 'tenant_admin'), async (req: Request, res: Response) => {
  try {
    const parsed = TicketCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message }); return;
    }
    const { station_id, title, description, category, priority, assigned_to_user_id, sla_deadline } = parsed.data;
    const ticket_id = uuidv4();
    await pool.query(
      `INSERT INTO tickets (ticket_id, tenant_id, station_id, created_by_user_id, assigned_to_user_id,
        title, description, category, priority, sla_deadline)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [ticket_id, req.user!.tenantId, station_id, req.user!.userId,
       assigned_to_user_id||null, title, description||null, category, priority||'medium', sla_deadline||null]
    );
    await pool.query(
      'INSERT INTO ticket_activities (activity_id, ticket_id, actor_user_id, action, details) VALUES (?,?,?,?,?)',
      [uuidv4(), ticket_id, req.user!.userId, 'created', `Ticket created with priority ${priority||'medium'}`]
    );
    res.status(201).json({ id: ticket_id });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /tickets/:id
router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const [existing]: any = await pool.query(
      'SELECT tenant_id FROM tickets WHERE ticket_id = ? LIMIT 1', [req.params.id]
    );
    if (!existing[0]) { res.status(404).json({ error: 'Not found' }); return; }
    if (req.user!.role !== 'super_admin' && existing[0].tenant_id !== req.user!.tenantId) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }

    const parsed = TicketUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message }); return;
    }
    const { status, priority, assigned_to_user_id, title, description } = parsed.data;
    await pool.query(
      `UPDATE tickets SET
        status              = COALESCE(?, status),
        priority            = COALESCE(?, priority),
        assigned_to_user_id = COALESCE(?, assigned_to_user_id),
        title               = COALESCE(?, title),
        description         = COALESCE(?, description)
       WHERE ticket_id = ?`,
      [status||null, priority||null, assigned_to_user_id||null, title||null, description||null, req.params.id]
    );
    if (status) {
      await pool.query(
        'INSERT INTO ticket_activities (activity_id, ticket_id, actor_user_id, action, details) VALUES (?,?,?,?,?)',
        [uuidv4(), req.params.id, req.user!.userId, 'status_changed', `Status changed to ${status}`]
      );
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /tickets/:id/activity
router.get('/:id/activity', requireAuth, async (req: Request, res: Response) => {
  try {
    const [ticket]: any = await pool.query(
      'SELECT tenant_id FROM tickets WHERE ticket_id = ? LIMIT 1', [req.params.id]
    );
    if (!ticket[0]) { res.status(404).json({ error: 'Not found' }); return; }
    if (req.user!.role !== 'super_admin' && ticket[0].tenant_id !== req.user!.tenantId) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }

    const [rows]: any = await pool.query(
      `SELECT ta.activity_id AS id, ta.action, u.full_name AS user,
              ta.created_at AS timestamp, ta.details
       FROM ticket_activities ta
       LEFT JOIN users u ON u.user_id = ta.actor_user_id
       WHERE ta.ticket_id = ?
       ORDER BY ta.created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /tickets/:id/activity
router.post('/:id/activity', requireAuth, async (req: Request, res: Response) => {
  try {
    const [ticket]: any = await pool.query(
      'SELECT tenant_id FROM tickets WHERE ticket_id = ? LIMIT 1', [req.params.id]
    );
    if (!ticket[0]) { res.status(404).json({ error: 'Not found' }); return; }
    if (req.user!.role !== 'super_admin' && ticket[0].tenant_id !== req.user!.tenantId) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }

    const { action, details } = req.body;
    if (!action) { res.status(400).json({ error: 'action required' }); return; }
    const activity_id = uuidv4();
    await pool.query(
      'INSERT INTO ticket_activities (activity_id, ticket_id, actor_user_id, action, details) VALUES (?,?,?,?,?)',
      [activity_id, req.params.id, req.user!.userId, action, details||null]
    );
    res.status(201).json({ id: activity_id });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

function mapTicket(r: any) {
  return {
    id:           r.ticket_id,
    title:        r.title,
    description:  r.description,
    stationName:  r.station_name,
    category:     r.category,
    priority:     r.priority,
    status:       r.status,
    assignedTo:   r.assigned_to_name || null,
    assignedToId: r.assigned_to_user_id || null,
    createdBy:    r.created_by_name || null,
    createdById:  r.created_by_user_id || null,
    createdAt:    r.created_at,
    updatedAt:    r.updated_at,
    tenantId:     r.tenant_id,
    slaDeadline:  r.sla_deadline,
  };
}

export default router;
