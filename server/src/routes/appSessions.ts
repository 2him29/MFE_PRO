import { Router, Request, Response } from 'express';
import pool from '../db';
import { requireAppAuth } from '../middleware/auth';

const router = Router();

// GET /api/app/sessions
// Returns the session history for the logged-in app user.
router.get('/', requireAppAuth, async (req: Request, res: Response): Promise<void> => {
  const appUserId = req.appUser!.appUserId;

  const limit  = Math.min(Number(req.query.limit)  || 50, 200);
  const offset = Number(req.query.offset) || 0;

  const [rows] = await pool.query<any[]>(
    'SELECT * FROM vw_app_session_history WHERE app_user_id = ? ORDER BY start_time DESC LIMIT ? OFFSET ?',
    [appUserId, limit, offset],
  );
  res.json(rows);
});

export default router;
