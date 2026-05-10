import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

// GET /api/app/stations
// Public — no auth required so the map loads before the user logs in.
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const [rows] = await pool.query<any[]>('SELECT * FROM vw_app_station_map');
  res.json(rows);
});

// GET /api/app/stations/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const [rows] = await pool.query<any[]>(
    'SELECT * FROM vw_app_station_map WHERE id = ?',
    [req.params.id],
  );
  const station = (rows as any[])[0];
  if (!station) {
    res.status(404).json({ error: 'Station not found' });
    return;
  }
  res.json(station);
});

export default router;
