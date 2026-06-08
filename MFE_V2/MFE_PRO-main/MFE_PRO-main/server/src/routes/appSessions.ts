import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import { requireAppAuth } from '../middleware/auth';
import { broadcastAppSessionStarted, broadcastStationUpdate } from '../index';
import { notifyAppUsers } from '../fcmHelper';

const router = Router();

// ── GET /api/app/sessions ─────────────────────────────────────────────────────
// Session history for the logged-in app user.
router.get('/', requireAppAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const appUserId = req.appUser!.appUserId;
    const limit  = Math.min(Number(req.query.limit)  || 50, 200);
    const offset = Number(req.query.offset) || 0;

    const [rows] = await pool.query<any[]>(
      'SELECT * FROM vw_app_session_history WHERE app_user_id = ? ORDER BY start_time DESC LIMIT ? OFFSET ?',
      [appUserId, limit, offset],
    );
    res.json(rows);
  } catch (err: any) {
    console.error('GET /api/app/sessions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/app/sessions ────────────────────────────────────────────────────
// Called by the Android app when the user taps "Start Charging".
router.post('/', requireAppAuth, async (req: Request, res: Response): Promise<void> => {
  const appUserId = req.appUser!.appUserId;
  const { station_id, payment_method } = req.body as {
    station_id?: string;
    payment_method?: string;
  };

  const allowedPayments = ['rfid_card', 'cib', 'epayment'];
  if (!station_id || !payment_method || !allowedPayments.includes(payment_method)) {
    res.status(400).json({
      error: 'station_id and payment_method (rfid_card|cib|epayment) are required',
    });
    return;
  }

  try {
    // 1. Look up station + an available connector + tenant + tariff
    const [stationRows] = await pool.query<any[]>(
      `SELECT s.station_id, s.name, s.tenant_id, s.current_tariff_dzd_per_kwh,
              (SELECT connector_id FROM connectors
                WHERE station_id = s.station_id AND status = 'available'
                LIMIT 1) AS connector_id
         FROM stations s
        WHERE s.station_id = ?
        LIMIT 1`,
      [station_id],
    );
    const station = (stationRows as any[])[0];
    if (!station) { res.status(404).json({ error: 'Station not found' }); return; }
    if (!station.connector_id) {
      res.status(409).json({ error: 'No available connector at this station' });
      return;
    }

    // 2. Look up the app user
    const [userRows] = await pool.query<any[]>(
      'SELECT app_user_id, email, full_name, rfid_card_number FROM app_users WHERE app_user_id = ? LIMIT 1',
      [appUserId],
    );
    const user = (userRows as any[])[0];
    if (!user) { res.status(401).json({ error: 'User not found' }); return; }

    // 3. Estimate cost — rough value: tariff × 30 kWh. Overwritten on session stop.
    const tariff = Number(station.current_tariff_dzd_per_kwh) || 0;
    const estimatedCost = +(tariff * 30).toFixed(2);

    const sessionId = uuidv4();

    // 4. Create the session
    await pool.query(
      `INSERT INTO charging_sessions
         (session_id, tenant_id, station_id, connector_id, app_user_id,
          user_identifier, payment_method, start_time, duration_min,
          energy_kwh, cost_dzd, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), 0, 0, ?, 'active')`,
      [
        sessionId,
        station.tenant_id,
        station.station_id,
        station.connector_id,
        appUserId,
        user.rfid_card_number || user.email,
        payment_method,
        estimatedCost,
      ],
    );

    // 5. Mark the connector + station as charging
    await pool.query(
      "UPDATE connectors SET status = 'charging' WHERE connector_id = ?",
      [station.connector_id],
    );
    await pool.query(
      "UPDATE stations SET status = 'charging' WHERE station_id = ?",
      [station.station_id],
    );

    // 6. Live updates to the dashboard
    broadcastStationUpdate(station.station_id, 'charging', station.name, station.tenant_id);
    broadcastAppSessionStarted({
      sessionId,
      stationId:        station.station_id,
      stationName:      station.name,
      tenantId:         station.tenant_id,
      userEmail:        user.email,
      userFullName:     user.full_name,
      paymentMethod:    payment_method,
      estimatedCostDzd: estimatedCost,
    });

    res.status(201).json({
      session_id:         sessionId,
      station_id:         station.station_id,
      connector_id:       station.connector_id,
      payment_method,
      estimated_cost_dzd: estimatedCost,
      status:             'active',
    });
  } catch (err: any) {
    console.error('POST /api/app/sessions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /api/app/sessions/:id ───────────────────────────────────────────────
// Called by the Android app when the user taps "Stop Charging".
router.patch('/:id', requireAppAuth, async (req: Request, res: Response): Promise<void> => {
  const appUserId = req.appUser!.appUserId;
  const { action } = req.body as { action?: string };

  if (action !== 'stop') {
    res.status(400).json({ error: 'action must be "stop"' });
    return;
  }

  try {
    // 1. Find the active session owned by this user
    const [sessionRows] = await pool.query<any[]>(
      `SELECT cs.session_id, cs.connector_id, cs.station_id, cs.app_user_id,
              cs.start_time, s.current_tariff_dzd_per_kwh,
              s.name AS station_name, s.tenant_id, c.max_power_kw
         FROM charging_sessions cs
         JOIN stations s ON s.station_id = cs.station_id
         JOIN connectors c ON c.connector_id = cs.connector_id
        WHERE cs.session_id = ? AND cs.status = 'active'
        LIMIT 1`,
      [req.params.id],
    );
    const session = (sessionRows as any[])[0];
    if (!session) {
      res.status(404).json({ error: 'Active session not found' });
      return;
    }
    if (session.app_user_id !== appUserId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // 2. Compute actuals
    const startTime   = new Date(session.start_time);
    const durationMin = Math.max(1, Math.round((Date.now() - startTime.getTime()) / 60_000));
    const energyKwh   = +((durationMin / 60) * (Number(session.max_power_kw) || 7.4)).toFixed(2);
    const costDzd     = +(energyKwh * (Number(session.current_tariff_dzd_per_kwh) || 0)).toFixed(2);

    // 3. Complete the session
    await pool.query(
      `UPDATE charging_sessions
          SET status = 'completed', end_time = NOW(),
              duration_min = ?, energy_kwh = ?, cost_dzd = ?
        WHERE session_id = ?`,
      [durationMin, energyKwh, costDzd, req.params.id],
    );

    // 4. Free the connector
    await pool.query(
      "UPDATE connectors SET status = 'available' WHERE connector_id = ?",
      [session.connector_id],
    );

    // 5. Free the station only if no other connectors are still charging
    const [chargingRows] = await pool.query<any[]>(
      "SELECT COUNT(*) AS cnt FROM connectors WHERE station_id = ? AND status = 'charging'",
      [session.station_id],
    );
    if ((chargingRows as any[])[0].cnt === 0) {
      await pool.query(
        "UPDATE stations SET status = 'available' WHERE station_id = ?",
        [session.station_id],
      );
      broadcastStationUpdate(session.station_id, 'available', session.station_name, session.tenant_id);
      await notifyAppUsers(session.station_id, session.station_name, 'available');
    }

    res.json({
      session_id:   req.params.id,
      duration_min: durationMin,
      energy_kwh:   energyKwh,
      cost_dzd:     costDzd,
      status:       'completed',
    });
  } catch (err: any) {
    console.error('PATCH /api/app/sessions/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
