import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import { requireAppAuth } from '../middleware/auth';
import { broadcastAppTicket } from '../index';

const router = Router();

const ALLOWED_CATEGORIES = [
  'power_failure',
  'screen_issue',
  'charger_fault',
  'system_failure',
  'network_issue',
  'maintenance',
] as const;

const CATEGORY_LABELS: Record<(typeof ALLOWED_CATEGORIES)[number], string> = {
  power_failure:  'Power / slow charging',
  screen_issue:   'Screen issue',
  charger_fault:  'Charger fault',
  system_failure: 'System failure',
  network_issue:  'Network / payment issue',
  maintenance:    'Damaged equipment',
};

const CATEGORY_PRIORITY: Record<(typeof ALLOWED_CATEGORIES)[number], 'low' | 'medium' | 'high' | 'critical'> = {
  power_failure:  'high',
  screen_issue:   'medium',
  charger_fault:  'high',
  system_failure: 'critical',
  network_issue:  'medium',
  maintenance:    'low',
};

// ── POST /api/app/tickets ─────────────────────────────────────────────────────
// Called by the Android app when a user reports a problem at a station.
// Creates a row in `tickets`, broadcasts a `new_app_ticket` WS event and
// any technician on the dashboard sees it live in "My Tasks".
router.post('/', requireAppAuth, async (req: Request, res: Response): Promise<void> => {
  const appUserId = req.appUser!.appUserId;
  const { station_id, category, description } = req.body as {
    station_id?: string;
    category?: string;
    description?: string | null;
  };

  if (!station_id || !category || !ALLOWED_CATEGORIES.includes(category as any)) {
    res.status(400).json({
      error: `station_id and category are required. category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`,
    });
    return;
  }

  try {
    // 1. Look up the station so we know its tenant + name
    const [stationRows] = await pool.query<any[]>(
      'SELECT station_id, tenant_id, name FROM stations WHERE station_id = ? LIMIT 1',
      [station_id],
    );
    const station = (stationRows as any[])[0];
    if (!station) {
      res.status(404).json({ error: 'Station not found' });
      return;
    }

    // 2. Look up the reporter — used for the WS payload + ticket activity log
    const [userRows] = await pool.query<any[]>(
      'SELECT email, full_name FROM app_users WHERE app_user_id = ? LIMIT 1',
      [appUserId],
    );
    const user = (userRows as any[])[0];

    // 3. Insert the ticket
    const ticketId = uuidv4();
    const cat      = category as (typeof ALLOWED_CATEGORIES)[number];
    const title    = `${CATEGORY_LABELS[cat]} at ${station.name}`;
    const priority = CATEGORY_PRIORITY[cat];
    const slaHours = priority === 'critical' ? 4 : priority === 'high' ? 12 : 24;

    await pool.query(
      `INSERT INTO tickets
         (ticket_id, tenant_id, station_id, created_by_user_id, assigned_to_user_id,
          title, description, category, priority, status, sla_deadline)
       VALUES (?, ?, ?, NULL, NULL, ?, ?, ?, ?, 'open',
               DATE_ADD(NOW(), INTERVAL ? HOUR))`,
      [ticketId, station.tenant_id, station.station_id, title, description ?? null, cat, priority, slaHours],
    );

    // 4. Activity entry so the audit trail explains who created it
    await pool.query(
      `INSERT INTO ticket_activities (activity_id, ticket_id, actor_user_id, action, details)
       VALUES (?, ?, NULL, 'reported_by_app_user', ?)`,
      [
        uuidv4(),
        ticketId,
        `Reported by ${user?.full_name ?? 'app user'} (${user?.email ?? 'unknown'})`,
      ],
    );

    // 5. Live broadcast — technicians of this tenant will see a toast
    broadcastAppTicket({
      ticketId,
      tenantId:     station.tenant_id,
      stationId:    station.station_id,
      stationName:  station.name,
      title,
      category:     cat,
      priority,
      reporterName: user?.full_name ?? 'App user',
      description:  description ?? null,
    });

    res.status(201).json({
      ticket_id:  ticketId,
      station_id: station.station_id,
      category:   cat,
      status:     'open',
    });
  } catch (err: any) {
    console.error('POST /api/app/tickets error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
