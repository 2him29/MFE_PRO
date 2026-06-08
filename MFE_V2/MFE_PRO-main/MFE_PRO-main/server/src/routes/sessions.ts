import { Router, Request, Response } from 'express';
import pool from '../db';
import { requireAuth, requireRole } from '../middleware/auth';
import { broadcastStationUpdate } from '../index';
import { notifyRemoteStop, notifySessionFlagged } from '../fcmHelper';

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
      appUserName:    r.user_name    || null,
      appUserEmail:   r.user_email   || null,
      paymentMethod:  r.payment_method || null,
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

// PATCH /sessions/:id  — admin remote stop or flag anomaly
router.patch('/:id', requireAuth, requireRole('super_admin', 'tenant_admin'), async (req: Request, res: Response) => {
  const { action } = req.body as { action?: string };
  if (action !== 'remote_stop' && action !== 'flag_anomaly') {
    res.status(400).json({ error: 'action must be "remote_stop" or "flag_anomaly"' }); return;
  }

  try {
    const [sessionRows]: any = await pool.query(
      `SELECT cs.session_id, cs.connector_id, cs.station_id, cs.app_user_id,
              cs.tenant_id, cs.start_time, cs.status,
              s.name AS station_name, s.current_tariff_dzd_per_kwh,
              c.max_power_kw
         FROM charging_sessions cs
         JOIN stations   s ON s.station_id   = cs.station_id
         JOIN connectors c ON c.connector_id = cs.connector_id
        WHERE cs.session_id = ? LIMIT 1`,
      [req.params.id],
    );
    const session = sessionRows[0];
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }

    if (req.user!.role !== 'super_admin' && session.tenant_id !== req.user!.tenantId) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }

    if (action === 'remote_stop') {
      if (session.status !== 'active') {
        res.status(409).json({ error: 'Session is not active' }); return;
      }

      const startTime   = new Date(session.start_time);
      const durationMin = Math.max(1, Math.round((Date.now() - startTime.getTime()) / 60_000));
      const energyKwh   = +((durationMin / 60) * (Number(session.max_power_kw) || 7.4)).toFixed(2);
      const costDzd     = +(energyKwh * (Number(session.current_tariff_dzd_per_kwh) || 0)).toFixed(2);

      await pool.query(
        `UPDATE charging_sessions
            SET status = 'stopped', end_time = NOW(),
                duration_min = ?, energy_kwh = ?, cost_dzd = ?
          WHERE session_id = ?`,
        [durationMin, energyKwh, costDzd, req.params.id],
      );

      await pool.query(
        "UPDATE connectors SET status = 'available' WHERE connector_id = ?",
        [session.connector_id],
      );

      const [chargingRows]: any = await pool.query(
        "SELECT COUNT(*) AS cnt FROM connectors WHERE station_id = ? AND status = 'charging'",
        [session.station_id],
      );
      if (chargingRows[0].cnt === 0) {
        await pool.query(
          "UPDATE stations SET status = 'available' WHERE station_id = ?",
          [session.station_id],
        );
        broadcastStationUpdate(session.station_id, 'available', session.station_name, session.tenant_id);
      }

      if (session.app_user_id) {
        notifyRemoteStop(req.params.id, session.station_name, session.app_user_id, session.tenant_id).catch(() => {});
      }

      res.json({ success: true, duration_min: durationMin, energy_kwh: energyKwh, cost_dzd: costDzd });
      return;
    }

    // flag_anomaly — mark the session and notify the user
    await pool.query(
      "UPDATE charging_sessions SET status = 'error' WHERE session_id = ? AND status = 'active'",
      [req.params.id],
    );

    if (session.app_user_id) {
      notifySessionFlagged(req.params.id, session.station_name, session.app_user_id, session.tenant_id).catch(() => {});
    }

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
