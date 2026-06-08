import './fcm';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import logger from './logger';

import authRoutes      from './routes/auth';
import tenantRoutes    from './routes/tenants';
import userRoutes      from './routes/users';
import stationRoutes   from './routes/stations';
import connectorRoutes from './routes/connectors';
import sessionRoutes   from './routes/sessions';
import ticketRoutes    from './routes/tickets';
import billingRoutes   from './routes/billing';
import alertRoutes     from './routes/alerts';
import dashboardRoutes from './routes/dashboard';
import appAuthRoutes         from './routes/appAuth';
import appStationsRoutes     from './routes/appStations';
import appSessionsRoutes     from './routes/appSessions';
import appTicketsRoutes      from './routes/appTickets';
import appRouteRoutes        from './routes/appRoute';
import notificationRoutes    from './routes/notifications';
import pool            from './db';

const app    = express();
const server = createServer(app);   // ← wrap express in http server for WS
const PORT   = process.env.PORT || 3001;

// ── WebSocket Server ──────────────────────────────────────────────────────────
export const wss = new WebSocketServer({ server, path: '/ws' });

// Keep track of all connected clients
const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  clients.add(ws);
  logger.info(`WS client connected. Total: ${clients.size}`);

  ws.on('close', () => {
    clients.delete(ws);
    logger.info(`WS client disconnected. Total: ${clients.size}`);
  });
});

function broadcast(payload: object) {
  const message = JSON.stringify(payload);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

/**
 * Broadcast a station status change to ALL connected WebSocket clients.
 * Call this from appStations or stations routes when status changes.
 */
export function broadcastStationUpdate(stationId: string, status: string, stationName: string, tenantId?: string) {
  broadcast({
    type:        'station_status_update',
    stationId,
    status,
    stationName,
    tenantId:    tenantId ?? null,
    timestamp:   new Date().toISOString(),
  });
  logger.info(`Broadcasted status update: ${stationName} → ${status}`);
}

/**
 * Broadcast that an app user has started a charging session at a station.
 * Dashboard listens for this to show a live "client visited" notification.
 */
export function broadcastAppSessionStarted(payload: {
  sessionId: string;
  stationId: string;
  stationName: string;
  tenantId: string;
  userEmail: string;
  userFullName: string;
  paymentMethod: string;
  estimatedCostDzd: number;
}) {
  broadcast({
    type: 'new_app_session',
    ...payload,
    timestamp: new Date().toISOString(),
  });
  logger.info(`Broadcasted app session start: ${payload.userFullName} → ${payload.stationName}`);
}

/**
 * Broadcast that an app user has reported a problem.
 * Technicians on the dashboard see this as a "new ticket" toast.
 */
export function broadcastAppTicket(payload: {
  ticketId: string;
  tenantId: string;
  stationId: string;
  stationName: string;
  title: string;
  category: string;
  priority: string;
  reporterName: string;
  description: string | null;
}) {
  broadcast({
    type: 'new_app_ticket',
    ...payload,
    timestamp: new Date().toISOString(),
  });
  logger.info(`Broadcasted app ticket: ${payload.title}`);
}

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (
  process.env.CORS_ORIGIN ||
  'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174'
).split(',').map((origin) => origin.trim());

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
}));
app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', ws_clients: clients.size });
  } catch {
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

// ── Web platform routes ───────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/tenants',    tenantRoutes);
app.use('/api/users',      userRoutes);
app.use('/api/stations',   stationRoutes);
app.use('/api/connectors', connectorRoutes);
app.use('/api/sessions',   sessionRoutes);
app.use('/api/tickets',    ticketRoutes);
app.use('/api/billing',    billingRoutes);
app.use('/api/alerts',     alertRoutes);
app.use('/api/dashboard',      dashboardRoutes);
app.use('/api/notifications',  notificationRoutes);

// ── Android app routes ────────────────────────────────────────────────────────
app.use('/api/app/auth',     appAuthRoutes);
app.use('/api/app/stations', appStationsRoutes);
app.use('/api/app/sessions', appSessionsRoutes);
app.use('/api/app/tickets',  appTicketsRoutes);
app.use('/api/app/route',    appRouteRoutes);

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(err.message, { stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start (use server.listen, not app.listen) ─────────────────────────────────
server.listen(PORT, () => logger.info(`EV Charge DZ API → http://localhost:${PORT} | WS → ws://localhost:${PORT}/ws`));
