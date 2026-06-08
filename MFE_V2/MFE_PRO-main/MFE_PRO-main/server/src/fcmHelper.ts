import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import pool from './db';

type NotifType =
  | 'station_available'
  | 'station_maintenance'
  | 'tariff_change'
  | 'new_station'
  | 'broadcast'
  | 'session_remote_stop'
  | 'session_anomaly';

async function saveAndSend(opts: {
  type:        NotifType;
  tenantId:    string;
  title:       string;
  body:        string;
  data:        Record<string, string>;
  tokens:      string[];
  stationId?:  string;
  cityFilter?: string;
  createdBy?:  string;
}): Promise<void> {
  const { type, tenantId, title, body, data, tokens, stationId, cityFilter, createdBy } = opts;

  let successCount = 0;
  if (tokens.length > 0) {
    try {
      const result = await admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: { ...data, type },
        android: { priority: 'high', notification: { sound: 'default' } },
      });
      successCount = result.successCount;
      console.log(`FCM [${type}]: ${result.successCount} ok, ${result.failureCount} failed`);
    } catch (err) {
      console.error('FCM send error:', err);
    }
  }

  try {
    await pool.query(
      `INSERT INTO notifications
         (notification_id, tenant_id, type, title, body, station_id, city_filter, created_by, recipients_count)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [uuidv4(), tenantId, type, title, body, stationId ?? null, cityFilter ?? null, createdBy ?? null, successCount],
    );
  } catch (err) {
    console.error('FCM history save error:', err);
  }
}

async function getTokensForStation(stationId: string, dayWindow = 30): Promise<string[]> {
  const [rows] = await pool.query<any[]>(
    `SELECT DISTINCT au.fcm_token
     FROM app_users au
     JOIN charging_sessions cs ON cs.app_user_id = au.app_user_id
     WHERE cs.station_id = ?
       AND au.fcm_token IS NOT NULL
       AND cs.start_time > DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [stationId, dayWindow],
  );
  return (rows as any[]).map((r: any) => r.fcm_token).filter(Boolean);
}

async function getAllTokens(tenantId?: string, city?: string): Promise<string[]> {
  let q = `SELECT DISTINCT au.fcm_token
           FROM app_users au
           WHERE au.fcm_token IS NOT NULL`;
  const p: any[] = [];

  if (tenantId) {
    q += ` AND au.app_user_id IN (
             SELECT DISTINCT cs.app_user_id FROM charging_sessions cs
             JOIN stations s ON s.station_id = cs.station_id
             WHERE s.tenant_id = ?
           )`;
    p.push(tenantId);
  }

  if (city) {
    q += ` AND au.app_user_id IN (
             SELECT DISTINCT cs.app_user_id FROM charging_sessions cs
             JOIN stations s ON s.station_id = cs.station_id
             WHERE s.city = ?
           )`;
    p.push(city);
  }

  const [rows] = await pool.query<any[]>(q, p);
  return (rows as any[]).map((r: any) => r.fcm_token).filter(Boolean);
}

// ── Public helpers ────────────────────────────────────────────────────────────

/** Station status changed → notify recent users (available / offline / etc.) */
export async function notifyAppUsers(
  stationId: string,
  stationName: string,
  status: string,
): Promise<void> {
  try {
    const tokens = await getTokensForStation(stationId, 30);
    if (tokens.length === 0) return;

    const isAvailable = status === 'available';
    const title = isAvailable
      ? `✅ ${stationName} is now Available`
      : `🔴 ${stationName} is now ${status.charAt(0).toUpperCase() + status.slice(1)}`;
    const body = isAvailable
      ? 'The station is ready — navigate there now.'
      : 'This station is currently unavailable.';

    const tenantRow: any = await pool.query(
      'SELECT tenant_id FROM stations WHERE station_id = ? LIMIT 1', [stationId],
    );
    const tenantId = (tenantRow[0] as any)?.[0]?.tenant_id ?? 'unknown';

    await saveAndSend({
      type: 'station_available',
      tenantId,
      title,
      body,
      data: { stationId, status, stationName },
      tokens,
      stationId,
    });
  } catch (err) {
    console.error('notifyAppUsers error:', err);
  }
}

/** Admin puts a station into maintenance mode */
export async function notifyStationMaintenance(
  stationId: string,
  stationName: string,
  tenantId: string,
  createdBy?: string,
): Promise<void> {
  try {
    const tokens = await getTokensForStation(stationId, 30);
    await saveAndSend({
      type:      'station_maintenance',
      tenantId,
      title:     `🔧 ${stationName} — Scheduled Maintenance`,
      body:      'This station has been taken offline for maintenance. We will notify you when it is back.',
      data:      { stationId, stationName, status: 'maintenance' },
      tokens,
      stationId,
      createdBy,
    });
  } catch (err) {
    console.error('notifyStationMaintenance error:', err);
  }
}

/** Admin changes the charging tariff */
export async function notifyTariffChange(
  stationId: string,
  stationName: string,
  tenantId: string,
  oldTariff: number,
  newTariff: number,
  createdBy?: string,
): Promise<void> {
  try {
    const tokens = await getTokensForStation(stationId, 60);
    const direction = newTariff > oldTariff ? '📈 increased' : '📉 decreased';
    await saveAndSend({
      type:      'tariff_change',
      tenantId,
      title:     `💰 Tariff update — ${stationName}`,
      body:      `Charging rate ${direction} from ${oldTariff} to ${newTariff} DZD/kWh.`,
      data:      { stationId, stationName, oldTariff: String(oldTariff), newTariff: String(newTariff) },
      tokens,
      stationId,
      createdBy,
    });
  } catch (err) {
    console.error('notifyTariffChange error:', err);
  }
}

/** New station added — notify all users in that city */
export async function notifyNewStation(
  stationId: string,
  stationName: string,
  city: string,
  tenantId: string,
  createdBy?: string,
): Promise<void> {
  try {
    const tokens = await getAllTokens(tenantId, city);
    await saveAndSend({
      type:      'new_station',
      tenantId,
      title:     `⚡ New charging station in ${city}!`,
      body:      `${stationName} is now open and ready for charging.`,
      data:      { stationId, stationName, city },
      tokens,
      stationId,
      cityFilter: city,
      createdBy,
    });
  } catch (err) {
    console.error('notifyNewStation error:', err);
  }
}

/** Admin remotely stops an active session */
export async function notifyRemoteStop(
  sessionId: string,
  stationName: string,
  appUserId: string,
  tenantId: string,
): Promise<void> {
  try {
    const [rows] = await pool.query<any[]>(
      'SELECT fcm_token FROM app_users WHERE app_user_id = ? AND fcm_token IS NOT NULL LIMIT 1',
      [appUserId],
    );
    const token: string | undefined = (rows as any[])[0]?.fcm_token;
    await saveAndSend({
      type:     'session_remote_stop',
      tenantId,
      title:    `⚠️ Your charging session was stopped`,
      body:     `An operator ended your session at ${stationName}. Please check the app for details.`,
      data:     { sessionId, stationName, action: 'remote_stop' },
      tokens:   token ? [token] : [],
    });
  } catch (err) {
    console.error('notifyRemoteStop error:', err);
  }
}

/** Admin flags a session as an anomaly */
export async function notifySessionFlagged(
  sessionId: string,
  stationName: string,
  appUserId: string,
  tenantId: string,
): Promise<void> {
  try {
    const [rows] = await pool.query<any[]>(
      'SELECT fcm_token FROM app_users WHERE app_user_id = ? AND fcm_token IS NOT NULL LIMIT 1',
      [appUserId],
    );
    const token: string | undefined = (rows as any[])[0]?.fcm_token;
    await saveAndSend({
      type:     'session_anomaly',
      tenantId,
      title:    `🔍 Anomaly detected on your session`,
      body:     `Our team flagged an issue with your recent session at ${stationName}. We will follow up with you shortly.`,
      data:     { sessionId, stationName, action: 'flag_anomaly' },
      tokens:   token ? [token] : [],
    });
  } catch (err) {
    console.error('notifySessionFlagged error:', err);
  }
}

/** Manual broadcast composed by the admin */
export async function sendBroadcast(opts: {
  title:      string;
  body:       string;
  tenantId:   string;
  cityFilter?: string;
  createdBy?: string;
}): Promise<number> {
  try {
    // No tenant filter — broadcast reaches all app users (optionally filtered by city).
    // Tenant association via charging_sessions would exclude users who never charged.
    const tokens = await getAllTokens(undefined, opts.cityFilter);
    await saveAndSend({
      type:      'broadcast',
      tenantId:  opts.tenantId,
      title:     opts.title,
      body:      opts.body,
      data:      { cityFilter: opts.cityFilter ?? '' },
      tokens,
      cityFilter: opts.cityFilter,
      createdBy: opts.createdBy,
    });
    return tokens.length;
  } catch (err) {
    console.error('sendBroadcast error:', err);
    return 0;
  }
}
