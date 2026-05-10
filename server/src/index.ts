import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
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
import appAuthRoutes      from './routes/appAuth';
import appStationsRoutes  from './routes/appStations';
import appSessionsRoutes  from './routes/appSessions';
import pool            from './db';

const app  = express();
const PORT = process.env.PORT || 3001;
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

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

// Web platform routes
app.use('/api/auth',       authRoutes);
app.use('/api/tenants',    tenantRoutes);
app.use('/api/users',      userRoutes);
app.use('/api/stations',   stationRoutes);
app.use('/api/connectors', connectorRoutes);
app.use('/api/sessions',   sessionRoutes);
app.use('/api/tickets',    ticketRoutes);
app.use('/api/billing',    billingRoutes);
app.use('/api/alerts',     alertRoutes);
app.use('/api/dashboard',  dashboardRoutes);

// Kotlin app routes
app.use('/api/app/auth',     appAuthRoutes);
app.use('/api/app/stations', appStationsRoutes);
app.use('/api/app/sessions', appSessionsRoutes);

// Global error handler — catches anything thrown with next(err) or unhandled route errors
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(err.message, { stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => logger.info(`EV Charge DZ API → http://localhost:${PORT}`));
